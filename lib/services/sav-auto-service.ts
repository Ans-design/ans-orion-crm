import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/services/notification-service';
import { postOrionAssistantMessage } from '@/lib/orion/orion-assistant';
import { recordReclamationEmployeeImpact } from '@/lib/services/employee-impact-service';

/** Crée une réclamation SAV si aucune ouverte similaire n'existe. */
export async function ensureAutoReclamation(params: {
  clientId: string;
  commandeId?: string;
  subject: string;
  description?: string;
  priorite?: string;
  source: string;
  employeeId?: string | null;
}) {
  const existing = await prisma.clientReclamation.findFirst({
    where: {
      clientId: params.clientId,
      statut: { in: ['Ouverte', 'En cours'] },
      subject: params.subject,
    },
  });
  if (existing) return { created: false as const, reclamation: existing };

  const reclamation = await prisma.clientReclamation.create({
    data: {
      clientId: params.clientId,
      commandeId: params.commandeId ?? null,
      employeeId: params.employeeId ?? null,
      subject: params.subject,
      description: params.description ?? `Source automatique : ${params.source}`,
      priorite: params.priorite ?? 'Haute',
      statut: 'Ouverte',
    },
    include: { commande: { select: { numero: true } } },
  });

  await recordReclamationEmployeeImpact({
    reclamationId: reclamation.id,
    subject: reclamation.subject,
    description: reclamation.description,
    priorite: reclamation.priorite,
    employeeId: reclamation.employeeId,
    commandeId: reclamation.commandeId,
    commandeNumero: reclamation.commande?.numero ?? null,
  }).catch(() => {});

  await createNotification({
    title: 'SAV ouvert automatiquement',
    message: `${params.subject} — client à contacter`,
    link: params.commandeId ? `/commandes/${params.commandeId}` : '/reclamations',
    type: 'warning',
    category: 'commandes',
  });

  await postOrionAssistantMessage({
    type: 'generic',
    title: 'SAV auto',
    body: params.subject,
    link: '/reclamations',
    commandeId: params.commandeId,
  });

  return { created: true as const, reclamation };
}

export async function onLivraisonRetour(livraisonId: string) {
  const liv = await prisma.livraison.findUnique({
    where: { id: livraisonId },
    include: { client: true, commande: { select: { id: true, numero: true } } },
  });
  if (!liv?.clientId) return null;

  return ensureAutoReclamation({
    clientId: liv.clientId,
    commandeId: liv.commandeId,
    subject: `Retour livraison ${liv.numero}`,
    description: `Livraison ${liv.numero} — commande ${liv.commande?.numero ?? '—'}. Suivi commercial requis.`,
    priorite: 'Haute',
    source: 'livraison_retour',
  });
}

export async function onGpaoIncidentOuvert(commandeId: string, incidentLabel: string) {
  const cmd = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { clientId: true, numero: true },
  });
  if (!cmd?.clientId) return null;

  return ensureAutoReclamation({
    clientId: cmd.clientId,
    commandeId,
    subject: `Incident production — ${cmd.numero}`,
    description: incidentLabel,
    priorite: 'Urgente',
    source: 'gpao_incident',
  });
}

/** Tâche production bloquée — alerte SAV si liée à une commande client. */
export async function onMetierTaskBloquee(
  commandeId: string,
  taskTitle: string,
  problemNote?: string | null,
) {
  const cmd = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { clientId: true, numero: true },
  });
  if (!cmd?.clientId) return null;

  return ensureAutoReclamation({
    clientId: cmd.clientId,
    commandeId,
    subject: `Blocage production — ${cmd.numero}`,
    description: `${taskTitle}${problemNote ? ` — ${problemNote}` : ''}`,
    priorite: 'Haute',
    source: 'metier_task_bloquee',
  });
}

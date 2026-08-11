import { prisma } from '@/lib/prisma';
import { transitionCommandeStatut } from '@/lib/services/commande-workflow-service';
import { createProductionIncident, updateDossierEtape } from '@/lib/services/gpao-dossier-service';
import { createNotification } from '@/lib/services/notification-service';
import { ensureAutoReclamation } from '@/lib/services/sav-auto-service';

type QualiteOpts = { userId?: string; userName?: string; motif?: string };

async function findDossierEtapeQualite(commandeId: string) {
  const dossier = await prisma.productionDossier.findFirst({
    where: { commandeId },
    include: {
      etapes: { orderBy: { ordre: 'asc' } },
    },
  });
  if (!dossier) return null;
  const etape = dossier.etapes.find((e) => e.nom === 'Contrôle qualité');
  return etape ? { dossier, etape } : null;
}

/** Lot conforme → GPAO CQ terminé + commande Prête. */
export async function processQualiteConforme(commandeId: string, opts?: QualiteOpts) {
  const cmd = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { id: true, numero: true, statut: true },
  });
  if (!cmd) return { error: 'Commande introuvable' };

  const found = await findDossierEtapeQualite(commandeId);
  if (found && found.etape.statut !== 'Terminé') {
    await updateDossierEtape(found.dossier.id, found.etape.id, { statut: 'Terminé' });
  }
  /** Toujours avancer la commande (idempotent) — ne pas s’appuyer uniquement sur le sync GPAO. */
  await transitionCommandeStatut(commandeId, 'Prête', opts);

  await createNotification({
    title: 'Contrôle qualité validé',
    message: `Lot ${cmd.numero} conforme — prêt livraison`,
    link: `/commandes/${commandeId}`,
    type: 'success',
  });

  return { ok: true, statut: 'Prête' };
}

/** Lot non conforme → incident GPAO + commande suspendue. */
export async function processQualiteNonConforme(commandeId: string, opts?: QualiteOpts) {
  const cmd = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { id: true, numero: true, article: true, clientId: true },
  });
  if (!cmd) return { error: 'Commande introuvable' };

  const motif = opts?.motif?.trim() || 'Non-conformité détectée au contrôle qualité';
  const found = await findDossierEtapeQualite(commandeId);

  if (found) {
    await updateDossierEtape(found.dossier.id, found.etape.id, {
      statut: 'Bloqué',
      bloque: true,
      commentaire: motif,
    });
    await createProductionIncident({
      dossierId: found.dossier.id,
      title: `NC qualité — ${cmd.numero}`,
      severity: 'Majeure',
      description: motif,
      reportedBy: opts?.userName ?? opts?.userId ?? null,
    });
  }

  await transitionCommandeStatut(commandeId, 'Suspendu', opts);

  if (cmd.clientId) {
    await ensureAutoReclamation({
      clientId: cmd.clientId,
      commandeId,
      subject: `NC qualité — ${cmd.numero}`,
      description: motif,
      priorite: 'Urgente',
      source: 'qualite_nc',
    }).catch(() => {});
  }

  await createNotification({
    title: 'Non-conformité qualité',
    message: `${cmd.numero} — ${motif}`,
    link: `/commandes/${commandeId}`,
    type: 'warning',
  });

  return { ok: true, statut: 'Suspendu' };
}

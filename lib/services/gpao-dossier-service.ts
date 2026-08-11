import { prisma } from '@/lib/prisma';
import { completedCommandeStatuts } from '@/lib/server/data/prisma-statut-bridge';
import { GPAO_16_ETAPES, DOSSIER_STATUTS, deriveGpaoAuditStatut } from '@/lib/constants/gpao-dossier';
import { createDossierConversation } from '@/lib/messaging/messaging-service';
import { logAudit } from '@/lib/audit';

export { GPAO_16_ETAPES, DOSSIER_STATUTS, ETAPE_STATUTS } from '@/lib/constants/gpao-dossier';

const ETAPE_DUREES = [15, 20, 30, 90, 30, 60, 45, 120, 30, 60, 30, 20, 15, 30, 20, 10];

export async function listProductionDossiers(filters?: {
  statut?: string;
  commandeId?: string;
  page?: number;
  pageSize?: number;
  etapeNom?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.statut && filters.statut !== 'tous') where.statutGlobal = filters.statut;
  if (filters?.commandeId) where.commandeId = filters.commandeId;
  if (filters?.etapeNom) {
    where.etapes = { some: { nom: filters.etapeNom, statut: { in: ['En cours', 'À faire', 'Terminé'] } } };
  }

  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 25));
  const skip = (page - 1) * pageSize;

  const [total, items] = await Promise.all([
    prisma.productionDossier.count({ where }),
    prisma.productionDossier.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        commande: {
          select: {
            id: true,
            numero: true,
            article: true,
            priorite: true,
            statut: true,
            avancement: true,
            client: { select: { name: true } },
          },
        },
        talkConversation: { select: { id: true, name: true } },
        etapes: { orderBy: { ordre: 'asc' } },
        incidents: { where: { statut: { not: 'Résolu' } }, take: 3 },
        _count: { select: { incidents: true } },
      },
    }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProductionDossier(id: string) {
  return prisma.productionDossier.findUnique({
    where: { id },
    include: {
      commande: {
        include: {
          client: { select: { name: true, code: true } },
          lignes: { orderBy: { sortOrder: 'asc' } },
        },
      },
      production: true,
      etapes: { orderBy: { ordre: 'asc' } },
      incidents: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function syncDossierForCommande(
  commandeId: string,
  opts?: { priorite?: string; delai?: Date | null },
) {
  const existing = await prisma.productionDossier.findFirst({ where: { commandeId } });
  if (existing) return { dossier: existing, created: false };

  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { id: true, numero: true, priorite: true, dateLiv: true },
  });
  if (!commande) return { dossier: null, created: false };

  const tempsEstimeMin = ETAPE_DUREES.reduce((a, b) => a + b, 0);

  try {
    const dossier = await prisma.productionDossier.create({
      data: {
        commandeId,
        statutGlobal: 'Nouveau',
        priorite: opts?.priorite ?? commande.priorite ?? 'Normal',
        delai: opts?.delai ?? commande.dateLiv ?? null,
        tempsEstimeMin,
        etapes: {
          create: GPAO_16_ETAPES.map((nom, i) => ({
            ordre: i + 1,
            nom,
            dureeMin: ETAPE_DUREES[i],
            statut: i === 0 ? 'En cours' : 'À faire',
            dateDebut: i === 0 ? new Date() : undefined,
          })),
        },
      },
      include: { etapes: { orderBy: { ordre: 'asc' } } },
    });

    try {
      await createDossierConversation(dossier.id);
    } catch {
      /* groupe Talk optionnel */
    }

    return { dossier, created: true };
  } catch {
    // Course concurrente — UNIQUE commandeId : retourner le gagnant
    const raced = await prisma.productionDossier.findFirst({ where: { commandeId } });
    if (raced) return { dossier: raced, created: false };
    throw new Error(`GPAO dossier sync failed for ${commandeId}`);
  }
}

export async function linkDossierToProduction(commandeId: string, productionId: string) {
  const dossier = await prisma.productionDossier.findFirst({ where: { commandeId } });
  if (!dossier) return null;
  return prisma.productionDossier.update({
    where: { id: dossier.id },
    data: { productionId, statutGlobal: 'En production' },
  });
}

function computeAvancement(etapes: { statut: string }[]) {
  const done = etapes.filter((e) => e.statut === 'Terminé' || e.statut === 'Sauté').length;
  return Math.round((done / etapes.length) * 100);
}

export async function updateDossierEtape(
  dossierId: string,
  etapeId: string,
  data: Partial<{ statut: string; responsable: string; commentaire: string; bloque: boolean }>,
  opts?: { userId?: string; userName?: string },
) {
  const now = new Date();
  const etape = await prisma.productionDossierEtape.findUnique({ where: { id: etapeId } });
  if (!etape || etape.dossierId !== dossierId) throw new Error('Étape introuvable');

  const patch: Record<string, unknown> = { ...data };
  if (data.statut === 'En cours' && !etape.dateDebut) patch.dateDebut = now;
  if (data.statut === 'Terminé' || data.statut === 'Sauté') {
    patch.dateFin = now;
    if (etape.dateDebut) {
      patch.dureeMin = Math.round((now.getTime() - etape.dateDebut.getTime()) / 60000);
    }
  }

  await prisma.productionDossierEtape.update({ where: { id: etapeId }, data: patch });

  const etapes = await prisma.productionDossierEtape.findMany({
    where: { dossierId },
    orderBy: { ordre: 'asc' },
  });

  const avancement = computeAvancement(etapes);
  const tempsReelMin = etapes.reduce((s, e) => s + (e.dureeMin ?? 0), 0);
  const hasBlock = etapes.some((e) => e.bloque || e.statut === 'Bloqué');
  const allDone = avancement >= 100;

  let statutGlobal = 'En production';
  if (hasBlock) statutGlobal = 'Bloqué';
  else if (allDone) statutGlobal = 'Livré';
  else if (avancement === 0) statutGlobal = 'Nouveau';
  else if (avancement < 30) statutGlobal = 'En préparation';
  else if (avancement < 60) statutGlobal = 'En production';
  else statutGlobal = 'Prêt';

  await prisma.productionDossier.update({
    where: { id: dossierId },
    data: { avancement, tempsReelMin, statutGlobal },
  });

  const auditStatut = deriveGpaoAuditStatut(etapes);
  if (data.statut && data.statut !== etape.statut) {
    await logAudit({
      userId: opts?.userId,
      userName: opts?.userName,
      action: 'STATUS_CHANGE',
      entity: 'ProductionDossierEtape',
      entityId: etapeId,
      entityLabel: etape.nom,
      details: {
        dossierId,
        from: etape.statut,
        to: data.statut,
        auditStatut,
        commentaire: data.commentaire,
      },
    }).catch(() => {});
  }

  if (data.statut === 'Terminé' || data.statut === 'Sauté') {
    const dossier = await prisma.productionDossier.findUnique({
      where: { id: dossierId },
      select: { commandeId: true },
    });
    if (dossier?.commandeId) {
      const { syncCommandeOnGpaoEtapeComplete } = await import('@/lib/services/commande-module-sync');
      await syncCommandeOnGpaoEtapeComplete(dossier.commandeId, etape.nom).catch((err) => {
        console.error('[workflow] sync GPAO → commande:', err);
      });
    }
  }

  return getProductionDossier(dossierId);
}

export async function createProductionIncident(data: {
  dossierId: string;
  title: string;
  severity?: string;
  description?: string | null;
  reportedBy?: string | null;
}) {
  const dossier = await prisma.productionDossier.findUnique({
    where: { id: data.dossierId },
    select: { commandeId: true },
  });

  await prisma.productionDossier.update({
    where: { id: data.dossierId },
    data: { statutGlobal: 'Bloqué' },
  });

  const incident = await prisma.productionIncident.create({
    data: {
      dossierId: data.dossierId,
      title: data.title.trim(),
      severity: data.severity ?? 'Moyenne',
      description: data.description?.trim() || null,
      reportedBy: data.reportedBy ?? null,
    },
  });

  if (dossier?.commandeId) {
    const { onGpaoIncidentOuvert } = await import('@/lib/services/sav-auto-service');
    await onGpaoIncidentOuvert(dossier.commandeId, data.title).catch(() => {});
  }

  return incident;
}

export async function resolveIncident(id: string) {
  return prisma.productionIncident.update({
    where: { id },
    data: { statut: 'Résolu', resolvedAt: new Date() },
  });
}

export async function getGpaoStats() {
  const [total, enCours, bloques, incidentsOuverts, enRetard] = await Promise.all([
    prisma.productionDossier.count(),
    prisma.productionDossier.count({
      where: { statutGlobal: { in: ['En production', 'En préparation', 'Planifié'] } },
    }),
    prisma.productionDossier.count({ where: { statutGlobal: 'Bloqué' } }),
    prisma.productionIncident.count({ where: { statut: { not: 'Résolu' } } }),
    prisma.productionDossier.count({
      where: {
        delai: { lt: new Date() },
        statutGlobal: { notIn: ['Livré', 'Annulé'] },
      },
    }),
  ]);

  return { total, enCours, bloques, incidentsOuverts, enRetard };
}

export async function backfillDossiers(limit = 40) {
  const commandes = await prisma.commande.findMany({
    where: { statut: { notIn: [...completedCommandeStatuts()] } },
    select: { id: true, priorite: true, dateLiv: true },
    take: limit,
  });

  let created = 0;
  for (const c of commandes) {
    const r = await syncDossierForCommande(c.id, { priorite: c.priorite, delai: c.dateLiv });
    if (r.created) created++;
  }
  return { commandes: commandes.length, dossiersCreated: created };
}

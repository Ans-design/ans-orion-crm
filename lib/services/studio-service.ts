import { prisma } from '@/lib/prisma';
import { completedCommandeStatuts } from '@/lib/server/data/prisma-statut-bridge';
import {
  BRIEF_STATUTS,
  PREPRESS_CHECKLIST,
  VERSION_LABELS,
} from '@/lib/constants/studio';

export { BRIEF_STATUTS, PREPRESS_CHECKLIST, VERSION_LABELS } from '@/lib/constants/studio';

export async function listStudioBriefs(filters?: { statut?: string; commandeId?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.statut && filters.statut !== 'tous') where.statut = filters.statut;
  if (filters?.commandeId) where.commandeId = filters.commandeId;

  return prisma.studioBrief.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      commande: { select: { id: true, numero: true, article: true, priorite: true } },
      client: { select: { id: true, name: true, code: true } },
      versions: { orderBy: { version: 'asc' } },
      checklist: { orderBy: { ordre: 'asc' } },
      _count: { select: { fichiers: true, versions: true } },
    },
  });
}

export async function getStudioBrief(id: string) {
  return prisma.studioBrief.findUnique({
    where: { id },
    include: {
      commande: { include: { client: { select: { name: true, code: true } } } },
      client: { select: { id: true, name: true, code: true, charte: true } },
      versions: { orderBy: { version: 'asc' } },
      checklist: { orderBy: { ordre: 'asc' } },
      fichiers: { orderBy: { createdAt: 'desc' }, select: { id: true, name: true, category: true, versionLabel: true, mimeType: true, sizeBytes: true, uploadedBy: true, createdAt: true } },
    },
  });
}

async function createDefaultChecklist(briefId: string) {
  await prisma.studioPrepressCheck.createMany({
    data: PREPRESS_CHECKLIST.map((label, i) => ({ briefId, ordre: i + 1, label })),
  });
}

export async function syncBriefForCommande(commandeId: string) {
  const existing = await prisma.studioBrief.findFirst({ where: { commandeId } });
  if (existing) return { brief: existing, created: false };

  const commande = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { id: true, numero: true, article: true, clientId: true, note: true, configSnapshot: true },
  });
  if (!commande) return { brief: null, created: false };

  try {
    const brief = await prisma.studioBrief.create({
      data: {
        commandeId,
        clientId: commande.clientId,
        titre: `Brief — ${commande.numero}`,
        briefText: commande.note ?? `Préparation graphique pour : ${commande.article}`,
        exigences: commande.configSnapshot ? JSON.stringify(commande.configSnapshot).slice(0, 2000) : null,
        statut: 'Nouveau',
        versions: { create: { version: 'V1', statut: 'Brouillon' } },
      },
    });

    await createDefaultChecklist(brief.id);

    return { brief, created: true };
  } catch {
    const raced = await prisma.studioBrief.findFirst({ where: { commandeId } });
    if (raced) return { brief: raced, created: false };
    throw new Error(`Studio brief sync failed for ${commandeId}`);
  }
}

export async function updateStudioBrief(
  id: string,
  data: Partial<{
    titre: string;
    briefText: string | null;
    exigences: string | null;
    statut: string;
    assignedToName: string | null;
    fichiersManquants: boolean;
    tempsPasseMin: number;
    notesInternes: string | null;
  }>,
) {
  return prisma.studioBrief.update({ where: { id }, data });
}

export async function updateVersionStatut(
  briefId: string,
  versionId: string,
  data: { statut: string; commentaire?: string | null },
) {
  const now = new Date();
  const patch: Record<string, unknown> = {
    statut: data.statut,
    commentaire: data.commentaire ?? undefined,
  };
  if (data.statut === 'Envoyé') patch.sentAt = now;
  if (data.statut === 'Validé') patch.validatedAt = now;

  await prisma.studioCreativeVersion.update({
    where: { id: versionId },
    data: patch,
  });

  let briefStatut = 'En cours';
  if (data.statut === 'Envoyé') briefStatut = 'BAT envoyé';
  if (data.statut === 'Validé') briefStatut = 'Validé';
  if (data.statut === 'Correction demandée') briefStatut = 'Correction client';

  await prisma.studioBrief.update({
    where: { id: briefId },
    data: { statut: briefStatut },
  });

  return getStudioBrief(briefId);
}

export async function createNextVersion(briefId: string, createdBy?: string) {
  const existing = await prisma.studioCreativeVersion.findMany({
    where: { briefId },
    select: { version: true },
  });
  const used = new Set(existing.map((v) => v.version));
  const next = VERSION_LABELS.find((v) => !used.has(v));
  if (!next) throw new Error('Nombre maximum de versions atteint');

  return prisma.studioCreativeVersion.create({
    data: { briefId, version: next, statut: 'Brouillon', createdBy: createdBy ?? null },
  });
}

export async function togglePrepressCheck(
  briefId: string,
  checkId: string,
  checked: boolean,
  checkedBy?: string,
) {
  await prisma.studioPrepressCheck.update({
    where: { id: checkId },
    data: {
      checked,
      checkedBy: checked ? checkedBy ?? null : null,
      checkedAt: checked ? new Date() : null,
    },
  });

  const checks = await prisma.studioPrepressCheck.findMany({ where: { briefId } });
  const allDone = checks.length > 0 && checks.every((c) => c.checked);
  if (allDone) {
    await prisma.studioBrief.update({
      where: { id: briefId },
      data: { statut: 'Validé' },
    });
    const brief = await prisma.studioBrief.findUnique({
      where: { id: briefId },
      select: { commandeId: true },
    });
    if (brief?.commandeId) {
      const { syncGpaoOnFileUploaded } = await import('@/lib/services/bat-gpao-sync');
      // Marque jalon fichiers/prépresse via étape « Fichiers complets » si dossier existe
      await syncGpaoOnFileUploaded(brief.commandeId).catch(() => {});
      const dossier = await prisma.productionDossier.findFirst({
        where: { commandeId: brief.commandeId },
        include: { etapes: true },
      });
      const prep = dossier?.etapes.find((e) => e.nom === 'Préparation graphique' || e.nom === 'BAT validé');
      if (dossier && prep) {
        const { updateDossierEtape } = await import('@/lib/services/gpao-dossier-service');
        await updateDossierEtape(dossier.id, prep.id, { statut: 'Terminé' }).catch(() => {});
      }
    }
  }

  return getStudioBrief(briefId);
}

export async function listStudioFiles(filters?: { briefId?: string; commandeId?: string; category?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.briefId) where.studioBriefId = filters.briefId;
  if (filters?.commandeId) where.commandeId = filters.commandeId;
  if (filters?.category && filters.category !== 'tous') where.category = filters.category;

  return prisma.fileAsset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      client: { select: { name: true, code: true } },
      studioBrief: { select: { id: true, titre: true, commande: { select: { numero: true } } } },
    },
  });
}

export async function linkFileToBrief(fileId: string, briefId: string, versionLabel?: string) {
  return prisma.fileAsset.update({
    where: { id: fileId },
    data: { studioBriefId: briefId, versionLabel: versionLabel ?? undefined },
  });
}

export async function getStudioStats() {
  const [total, enCours, fichiersManquants, batEnAttente, corrections, pretsImpression] = await Promise.all([
    prisma.studioBrief.count(),
    prisma.studioBrief.count({ where: { statut: { in: ['Nouveau', 'En cours'] } } }),
    prisma.studioBrief.count({ where: { fichiersManquants: true } }),
    prisma.studioBrief.count({ where: { statut: 'BAT envoyé' } }),
    prisma.studioBrief.count({ where: { statut: 'Correction client' } }),
    prisma.fileAsset.count({ where: { category: 'print_ready' } }),
  ]);

  const versionsPending = await prisma.studioCreativeVersion.count({
    where: { statut: { in: ['Envoyé', 'En revue'] } },
  });

  return {
    total,
    enCours,
    fichiersManquants,
    batEnAttente,
    corrections,
    pretsImpression,
    versionsPending,
  };
}

export async function backfillBriefs(limit = 30) {
  const commandes = await prisma.commande.findMany({
    where: { statut: { notIn: [...completedCommandeStatuts()] } },
    select: { id: true },
    take: limit,
  });

  let created = 0;
  for (const c of commandes) {
    const r = await syncBriefForCommande(c.id);
    if (r.created) created++;
  }
  return { commandes: commandes.length, briefsCreated: created };
}

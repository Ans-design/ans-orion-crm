import { prisma } from '@/lib/prisma';
import type { GpaoEtapeNom } from '@/lib/constants/gpao-dossier';
import { updateDossierEtape } from '@/lib/services/gpao-dossier-service';
import { isBatValidated } from '@/lib/constants/file-assets';
import { enqueueOutbox } from '@/lib/server/outbox';

async function findEtape(commandeId: string, nom: GpaoEtapeNom) {
  const dossier = await prisma.productionDossier.findFirst({
    where: { commandeId },
    include: { etapes: { orderBy: { ordre: 'asc' } } },
  });
  if (!dossier) return null;
  const etape = dossier.etapes.find((e) => e.nom === nom);
  if (!etape) return null;
  return { dossierId: dossier.id, etapeId: etape.id };
}

async function auditBatGpao(
  type: string,
  commandeId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await enqueueOutbox({
      type,
      aggregateType: 'Commande',
      aggregateId: commandeId,
      payload,
    });
  } catch {
    /* outbox best-effort — sync métier ci-dessous reste source d’action */
  }
}

/** Avance les étapes GPAO selon le cycle BAT ↔ production (étape 15 + 19). */
export async function syncGpaoOnProofStatus(
  commandeId: string | null | undefined,
  statut: string,
): Promise<void> {
  if (!commandeId) return;

  await auditBatGpao('bat.proof_status', commandeId, { statut });

  if (statut === 'Envoyé' || statut === 'En attente validation client') {
    const envoye = await findEtape(commandeId, 'BAT envoyé');
    if (envoye) await updateDossierEtape(envoye.dossierId, envoye.etapeId, { statut: 'Terminé' });
    await prisma.productionDossier.updateMany({
      where: { commandeId },
      data: { statutGlobal: 'En attente BAT' },
    });
    return;
  }

  if (isBatValidated(statut) || statut === 'Verrouillé') {
    for (const nom of ['BAT envoyé', 'BAT validé'] as GpaoEtapeNom[]) {
      const hit = await findEtape(commandeId, nom);
      if (hit) await updateDossierEtape(hit.dossierId, hit.etapeId, { statut: 'Terminé' });
    }
    const planif = await findEtape(commandeId, 'Planification production');
    if (planif) await updateDossierEtape(planif.dossierId, planif.etapeId, { statut: 'En cours' });
    await prisma.productionDossier.updateMany({
      where: { commandeId },
      data: { statutGlobal: 'BAT validé' },
    });
    return;
  }

  if (statut === 'Refusé' || statut === 'Correction demandée') {
    await prisma.productionDossier.updateMany({
      where: { commandeId },
      data: { statutGlobal: 'En attente BAT' },
    });
  }

  if (statut === 'En attente fichier') {
    await prisma.productionDossier.updateMany({
      where: { commandeId },
      data: { statutGlobal: 'En attente fichiers' },
    });
  }
}

/** Studio « Livrer production » → jalons GPAO (fichiers / prépresse / planification). */
export async function syncGpaoOnStudioLivrerProduction(commandeId: string): Promise<void> {
  if (!commandeId) return;
  await auditBatGpao('bat.studio_livrer_production', commandeId, {});
  for (const nom of ['Fichiers complets', 'Préparation graphique'] as GpaoEtapeNom[]) {
    const hit = await findEtape(commandeId, nom);
    if (hit) await updateDossierEtape(hit.dossierId, hit.etapeId, { statut: 'Terminé' });
  }
  const planif = await findEtape(commandeId, 'Planification production');
  if (planif) await updateDossierEtape(planif.dossierId, planif.etapeId, { statut: 'En cours' });
  await prisma.productionDossier.updateMany({
    where: { commandeId },
    data: { statutGlobal: 'Prêt impression' },
  });
}

/** Marque l'étape « Fichiers complets » quand un fichier pro est déposé sur la commande. */
export async function syncGpaoOnFileUploaded(commandeId: string): Promise<void> {
  const hit = await findEtape(commandeId, 'Fichiers complets');
  if (!hit) return;
  const count = await prisma.fileAsset.count({ where: { commandeId } });
  if (count < 1) return;
  await auditBatGpao('bat.file_uploaded', commandeId, { fileCount: count });
  await updateDossierEtape(hit.dossierId, hit.etapeId, { statut: 'Terminé' });
}

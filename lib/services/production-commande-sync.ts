import { prisma } from '@/lib/prisma';
import { transitionCommandeStatut } from '@/lib/services/commande-workflow-service';
import { updateDossierEtape } from '@/lib/services/gpao-dossier-service';

/**
 * Après clôture production atelier → commande Prête (ou En finition).
 * La consommation stock est centralisée dans `transitionCommandeStatut` (Prête / Livré).
 */
export async function syncCommandeAfterProductionComplete(
  commandeId: string,
  opts?: { userId?: string; userName?: string; force?: boolean },
) {
  const toPret = await transitionCommandeStatut(commandeId, 'Prête', opts);
  if (!toPret.error) return toPret;
  if (toPret.error === 'VALIDATION') {
    const msg =
      toPret.validation && typeof toPret.validation === 'object' && 'message' in toPret.validation
        ? String((toPret.validation as { message?: string }).message ?? '')
        : '';
    // Ne pas masquer un échec stock en basculant vers « En finition »
    if (msg.startsWith('Stock :')) return toPret;
    return transitionCommandeStatut(commandeId, 'En finition', opts);
  }
  return toPret;
}

/** Synchronise l'étape GPAO « Contrôle qualité » quand l'étape atelier est terminée. */
export async function syncGpaoQualityFromProductionEtape(commandeId: string, etapeNom: string) {
  const normalized = etapeNom.toLowerCase();
  if (!normalized.includes('contrôle qualité') && !normalized.includes('controle qualite')) return;

  const dossier = await prisma.productionDossier.findFirst({ where: { commandeId } });
  if (!dossier) return;

  const etape = await prisma.productionDossierEtape.findFirst({
    where: { dossierId: dossier.id, nom: 'Contrôle qualité' },
  });
  if (!etape || etape.statut === 'Terminé') return;

  await updateDossierEtape(dossier.id, etape.id, { statut: 'Terminé' });
}

/** Démarre la production commande via workflow (BAT + acompte + stock). */
export async function syncCommandeProductionStart(
  commandeId: string,
  opts?: { userId?: string; userName?: string; force?: boolean },
) {
  return transitionCommandeStatut(commandeId, 'En production', opts);
}

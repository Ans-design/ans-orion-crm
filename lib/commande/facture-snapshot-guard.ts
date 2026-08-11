import { parseOrderAcceptSnapshot, needsOrderSnapshotBackfill } from '@/lib/commande/order-snapshot';

export type FactureSnapshotGuardResult =
  | { ok: true }
  | { ok: false; code: 'COMMANDE_NOT_FOUND' | 'SNAPSHOT_MISSING' | 'LIGNES_SNAPSHOT_MISSING'; message: string };

type CommandeForFacture = {
  id: string;
  numero: string;
  configSnapshot: unknown;
  lignes?: Array<{ articleLabel: string; configSnapshot?: unknown }>;
};

/**
 * Bloque la création / émission de facture si la traçabilité prix commande est insuffisante.
 */
export function assertCommandeBillable(commande: CommandeForFacture | null): FactureSnapshotGuardResult {
  if (!commande) {
    return { ok: false, code: 'COMMANDE_NOT_FOUND', message: 'Commande introuvable' };
  }

  if (needsOrderSnapshotBackfill(commande.configSnapshot)) {
    return {
      ok: false,
      code: 'SNAPSHOT_MISSING',
      message: `Facture bloquée : snapshot commande ${commande.numero} absent ou incomplet. Recalculer depuis le dossier commande.`,
    };
  }

  const snapshot = parseOrderAcceptSnapshot(commande.configSnapshot);
  if (!snapshot?.itemsSnapshot?.length) {
    return {
      ok: false,
      code: 'SNAPSHOT_MISSING',
      message: `Facture bloquée : aucune ligne figée dans le snapshot de ${commande.numero}.`,
    };
  }

  const lignes = commande.lignes ?? [];
  if (lignes.length > 0) {
    const missingLine = lignes.find(
      (l) => !l.configSnapshot || (typeof l.configSnapshot === 'object' && !Object.keys(l.configSnapshot as object).length),
    );
    if (missingLine) {
      return {
        ok: false,
        code: 'LIGNES_SNAPSHOT_MISSING',
        message: `Facture bloquée : ligne « ${missingLine.articleLabel} » sans configSnapshot.`,
      };
    }
  }

  return { ok: true };
}

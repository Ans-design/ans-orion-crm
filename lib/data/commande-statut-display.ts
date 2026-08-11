/**
 * Libellés métier depuis clé Prisma éventuelle — utilisable côté client
 * (sans import @prisma/client ni bridge server).
 */
const PRISMA_KEY_TO_LABEL: Record<string, string> = {
  A_planifier: 'À planifier',
  En_attente_stock: 'En attente stock',
  En_production: 'En production',
  En_finition: 'En finition',
  Prete: 'Prête',
  Livre: 'Livré',
  /** Canonique métier = Livré (évite de casser rail / next-action). */
  Livree: 'Livré',
  Livrée: 'Livré',
  Terminee: 'Terminée',
  Annulee: 'Annulée',
  En_retard: 'En retard',
  Suspendu: 'Suspendu',
};

export function toCommandeStatutLabel(raw: string | null | undefined): string {
  const value = String(raw ?? '').trim();
  if (!value) return 'À planifier';
  return PRISMA_KEY_TO_LABEL[value] ?? value;
}

export function isCommandeLivreeLabel(raw: string | null | undefined): boolean {
  const label = toCommandeStatutLabel(raw);
  return label === 'Livré' || label === 'Livrée';
}

export function isCommandePreteLabel(raw: string | null | undefined): boolean {
  return toCommandeStatutLabel(raw) === 'Prête';
}

/**
 * Retour client / clôture SAV — uniquement commande finie (Prête ou Livré),
 * jamais pendant production / finition.
 */
export function canFinalizeCommandeRetourClient(raw: string | null | undefined): boolean {
  return isCommandePreteLabel(raw) || isCommandeLivreeLabel(raw);
}

/** Validité devis/proforma — 2 mois (ultra prompt §11). */
export const DEVIS_VALIDITY_DAYS = 60;

export function defaultDevisValidUntil(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + DEVIS_VALIDITY_DAYS);
  return d;
}

export function isDevisExpired(devis: { validUntil?: Date | string | null; statut?: string }): boolean {
  if (devis.statut === 'Expiré') return true;
  if (!devis.validUntil) return false;
  return new Date(devis.validUntil) < new Date();
}

export function devisExpirationLabel(): string {
  return `${DEVIS_VALIDITY_DAYS} jours (2 mois)`;
}

/** Jours restants avant expiration (négatif si déjà expiré). */
export function daysUntilDevisExpiry(validUntil?: Date | string | null): number | null {
  if (!validUntil) return null;
  const ms = new Date(validUntil).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

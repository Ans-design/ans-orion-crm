/**
 * Règles typographiques françaises — espaces insécables, montants, unités.
 */

/** Espace fine insécable (U+202F) — milliers, %, devise, unités */
export const FR_THIN = '\u202f';

/** Espace insécable (U+00A0) — ponctuation double (: ; ? !) */
export const FR_NBSP = '\u00a0';

/** Formate un nombre avec séparateurs de milliers français (espaces fines). */
export function formatNumberFr(n: number): string {
  return n.toLocaleString('fr-FR').replace(/[\s\u00a0]/g, FR_THIN);
}

/** Montant numérique seul (sans devise). */
export function formatPrice(price: number | null | undefined): string {
  if (price == null || !Number.isFinite(price)) return '0';
  return formatNumberFr(price);
}

/** Montant avec devise Ar (espace fine insécable avant Ar). */
export function formatPriceAr(price: number | null | undefined, nullLabel = '—'): string {
  if (price == null || !Number.isFinite(price)) return nullLabel;
  return `${formatNumberFr(Math.round(price))}${FR_THIN}Ar`;
}

/** Pourcentage avec espace fine insécable avant %. */
export function formatPercentFr(n: number, decimals = 0): string {
  const formatted = decimals > 0
    ? n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        .replace(/[\s\u00a0]/g, FR_THIN)
    : formatNumberFr(Math.round(n));
  return `${formatted}${FR_THIN}%`;
}

/** Nombre + unité (espace fine insécable). */
export function formatUnitFr(n: number, unit: string): string {
  return `${formatNumberFr(n)}${FR_THIN}${unit}`;
}

/** Ajoute l'espace insécable avant la ponctuation double française. */
export function punctuateFr(text: string): string {
  return text.replace(/\s*([:;?!])/g, `${FR_NBSP}$1`);
}

/** Points de suspension typographiques. */
export const ELLIPSIS = '…';

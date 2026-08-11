/**
 * Formatters métier ANS ORION — source unique.
 * Réutiliser partout (dashboard, POS affichage admin, factures…).
 */
export { formatPrice, formatPriceAr } from '@/lib/data/catalogue';

/** Montant en Ariary avec séparateurs FR */
export function formatMGA(amount: number | null | undefined, nullLabel = '—'): string {
  if (amount == null || Number.isNaN(amount)) return nullLabel;
  return `${Math.round(amount).toLocaleString('fr-FR')} Ar`;
}

/** Date courte FR */
export function formatDateFR(value: Date | string | null | undefined, nullLabel = '—'): string {
  if (!value) return nullLabel;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return nullLabel;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Date + heure */
export function formatDateTimeFR(value: Date | string | null | undefined, nullLabel = '—'): string {
  if (!value) return nullLabel;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return nullLabel;
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Pourcentage */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)} %`;
}

/** Numéro métier (CMD-2024-001) — tronque si trop long */
export function formatEntityNumero(numero: string | null | undefined): string {
  return numero?.trim() || '—';
}

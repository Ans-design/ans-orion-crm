/**
 * Lecture montants MGA — colonnes Int ariary (FIN-01 phase 2).
 */
import { roundMga } from '@/lib/money/mga';

/** Normalise toute valeur monétaire en ariary entier. */
export function readMga(value: number | string | null | undefined): number {
  return roundMga(value);
}

export function commandeMoneyFields(row: {
  total?: number | null;
  acompte?: number | null;
  reste?: number | null;
}) {
  const total = readMga(row.total);
  const acompte = readMga(row.acompte);
  const reste =
    row.reste != null ? readMga(row.reste) : Math.max(0, total - acompte);
  return { total, acompte, reste };
}

export function paiementMontantMga(row: { montant?: number | null }): number {
  return readMga(row.montant);
}

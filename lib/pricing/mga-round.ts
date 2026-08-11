/**
 * Arrondi monétaire Ariary (MGA) — toujours entier.
 * Convention ORION : jamais de centimes flottants en stock/facture/caisse.
 */
export function roundMga(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

/** HT → TTC avec TVA % et arrondi Ariary. */
export function htToTtcMga(totalHT: number, tvaPercent: number): number {
  const rate = Number.isFinite(tvaPercent) ? tvaPercent / 100 : 0;
  return roundMga(totalHT * (1 + rate));
}

/** TTC → HT avec TVA % et arrondi Ariary. */
export function ttcToHtMga(totalTTC: number, tvaPercent: number): number {
  const rate = Number.isFinite(tvaPercent) ? tvaPercent / 100 : 0;
  if (rate <= -1) return roundMga(totalTTC);
  return roundMga(totalTTC / (1 + rate));
}

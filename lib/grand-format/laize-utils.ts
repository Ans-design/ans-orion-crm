/** Marge laize : facturation pleine laize si petite dimension dans [laize-30cm, laize]. */
export const GF_LAIZE_MARGIN_CM = 30;

/** Tolérance comparaison dimension ↔ laize (150, 150.0, 1.50 m). */
export const GF_LAIZE_EXACT_TOLERANCE_CM = 0.5;

/** Dimension éligible à une laize : ≤ laize et écart strictement < 30 cm. */
export function isDimWithinLaizeMargin(dimCm: number, laizeCm: number): boolean {
  if (!(dimCm > 0) || !(laizeCm > 0)) return false;
  if (dimCm > laizeCm + 1e-6) return false;
  return laizeCm - dimCm < GF_LAIZE_MARGIN_CM;
}

/** Convertit un libellé laize (1m50, 120cm, 1.5m…) en centimètres. */
export function parseLaizeLabelToCm(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;

  const s = String(raw).trim().toLowerCase().replace(/\s+/g, '');
  const cmDirect = s.match(/^(\d+(?:[.,]\d+)?)cm$/);
  if (cmDirect) return parseFloat(cmDirect[1].replace(',', '.'));

  const mOnly = s.match(/^(\d+(?:[.,]\d+)?)m$/);
  if (mOnly) return parseFloat(mOnly[1].replace(',', '.')) * 100;

  const mCm = s.match(/^(\d+)m(\d{1,2})$/);
  if (mCm) return parseInt(mCm[1], 10) * 100 + parseInt(mCm[2], 10);

  const plain = parseFloat(s.replace(',', '.'));
  if (Number.isFinite(plain) && plain > 0) {
    if (plain <= 4) return plain * 100;
    return plain;
  }
  return null;
}

/** Libellé chip POS à partir de cm (150 → 1m50). */
export function formatLaizeChipLabel(cm: number): string {
  if (!Number.isFinite(cm) || cm <= 0) return String(cm);
  const rounded = Math.round(cm);
  if (rounded % 100 === 0 && rounded >= 100) {
    const m = rounded / 100;
    return m % 1 === 0 ? `${m}m` : `${m.toFixed(2).replace('.', ',')}m`;
  }
  if (rounded < 100 && rounded % 10 === 0) {
    return `${rounded / 10}m${rounded % 10 === 0 && rounded < 100 ? '' : ''}`;
  }
  const m = Math.floor(rounded / 100);
  const rest = rounded % 100;
  if (m > 0 && rest > 0) return `${m}m${rest.toString().padStart(2, '0')}`;
  if (m > 0) return `${m}m`;
  return `${rounded} cm`;
}

export function laizeCmToChipLabel(cm: number): string {
  const r = Math.round(cm);
  if (r === 50) return '50 cm';
  if (r === 90) return '0m90';
  const m = Math.floor(r / 100);
  const rest = r % 100;
  if (m > 0 && rest > 0) return `${m}m${rest.toString().padStart(2, '0')}`;
  if (m > 0 && rest === 0) return `${m}m00`.replace('m00', 'm');
  return `${r} cm`;
}

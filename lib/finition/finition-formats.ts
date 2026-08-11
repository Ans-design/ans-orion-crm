/** Formats standard finitions POS — facteurs surface base A4 = 1. */

export type FinitionFormatDef = {
  id: string;
  label: string;
  mm: string;
  factor: number;
};

export const PELLICULAGE_FORMATS: FinitionFormatDef[] = [
  { id: 'A6', label: 'A6', mm: '105 × 148 mm', factor: 0.25 },
  { id: 'A5', label: 'A5', mm: '148 × 210 mm', factor: 0.5 },
  { id: 'A4', label: 'A4', mm: '210 × 297 mm', factor: 1 },
  { id: 'A3', label: 'A3', mm: '297 × 420 mm', factor: 2 },
  { id: 'A3_PLUS', label: 'A3+', mm: '320 × 450 mm', factor: 2.2 },
];

export const PLASTIFICATION_FORMATS: FinitionFormatDef[] = [
  { id: 'A6', label: 'A6', mm: '105 × 148 mm', factor: 0.25 },
  { id: 'A5', label: 'A5', mm: '148 × 210 mm', factor: 0.5 },
  { id: 'A4', label: 'A4', mm: '210 × 297 mm', factor: 1 },
  { id: 'A3', label: 'A3', mm: '297 × 420 mm', factor: 2 },
];

export const DORURE_FORMATS: FinitionFormatDef[] = [
  { id: 'A6', label: 'A6', mm: '105 × 148 mm', factor: 0.25 },
  { id: 'A5', label: 'A5', mm: '148 × 210 mm', factor: 0.5 },
  { id: 'A4', label: 'A4', mm: '210 × 297 mm', factor: 1 },
  { id: 'A3', label: 'A3', mm: '297 × 420 mm', factor: 2 },
  { id: 'A3_PLUS', label: 'A3+', mm: '320 × 450 mm', factor: 2.2 },
  { id: 'A2', label: 'A2', mm: '420 × 594 mm', factor: 4 },
];

export const VERNIS_FORMATS: FinitionFormatDef[] = [
  { id: 'A6', label: 'A6', mm: '105 × 148 mm', factor: 0.25 },
  { id: 'A5', label: 'A5', mm: '148 × 210 mm', factor: 0.5 },
  { id: 'A4', label: 'A4', mm: '210 × 297 mm', factor: 1 },
  { id: 'A3', label: 'A3', mm: '297 × 420 mm', factor: 2 },
  { id: 'A2', label: 'A2', mm: '420 × 594 mm', factor: 4 },
  { id: 'A1', label: 'A1', mm: '594 × 841 mm', factor: 8 },
  { id: 'A0', label: 'A0', mm: '841 × 1189 mm', factor: 16 },
];

/** Collage / rainage — conversion A4. */
export const COLLAGE_FORMATS: FinitionFormatDef[] = [
  { id: 'A5', label: 'A5', mm: '148 × 210 mm', factor: 0.5 },
  { id: 'A4', label: 'A4', mm: '210 × 297 mm', factor: 1 },
  { id: 'A3', label: 'A3', mm: '297 × 420 mm', factor: 2 },
  { id: 'A3_PLUS', label: 'A3+', mm: '320 × 450 mm', factor: 2.2 },
];

export const RAINAGE_FORMATS: FinitionFormatDef[] = [
  { id: 'A5', label: 'A5', mm: '148 × 210 mm', factor: 0.5 },
  { id: 'A4', label: 'A4', mm: '210 × 297 mm', factor: 1 },
  { id: 'A3', label: 'A3', mm: '297 × 420 mm', factor: 2 },
];

export function formatChipLabels(formats: FinitionFormatDef[], includeCustom = false): string[] {
  const labels = formats.map((f) => f.label);
  if (includeCustom) labels.push('Personnalisé');
  return labels;
}

/** Extrait A0–A6 / A3+ / SRA3 depuis un chip « A4 — 210×297 mm ». */
export function normalizeFormatId(raw: unknown): string {
  const original = String(raw ?? '').trim();
  if (!original) return '';
  // A3+ avant A3 — pas de \b après « + » (non-word)
  const iso = original.match(/\b(A3\+|SRA3|A[0-6])(?![0-9A-Za-z+])/i);
  if (iso) {
    const t = iso[1]!.toUpperCase();
    if (t === 'A3+' || t === 'SRA3') return 'A3_PLUS';
    return t;
  }
  const s = original.toUpperCase().replace(/\s+/g, '');
  if (s === 'SRA3' || s === 'A3+' || s === 'A3PLUS') return 'A3_PLUS';
  return original.trim();
}

export function formatFactor(formatId: string, formats: FinitionFormatDef[]): number {
  const id = normalizeFormatId(formatId);
  if (!id) return 1;
  const hit = formats.find(
    (f) => f.id === id || f.label.toUpperCase() === id || f.label === formatId,
  );
  return hit?.factor ?? 1;
}

/** Formats calendrier — tri surface, A3+ remplace SRA3 côté UI. */

export type CalendarFormatDef = {
  id: string;
  label: string;
  displayLabel: string;
  widthMm: number;
  heightMm: number;
  surfaceM2: number;
};

const A4_PLUS_W = 216;
const A4_PLUS_H = 303;
const A3_PLUS_W = 320;
const A3_PLUS_H = 450;

export const CALENDAR_STANDARD_FORMATS: CalendarFormatDef[] = [
  { id: 'A7', label: 'A7 — 74×105 mm', displayLabel: 'A7 — 74×105 mm', widthMm: 74, heightMm: 105, surfaceM2: 0.00777 },
  { id: 'A6', label: 'A6 — 105×148 mm', displayLabel: 'A6 — 105×148 mm', widthMm: 105, heightMm: 148, surfaceM2: 0.01554 },
  { id: 'A5', label: 'A5 — 148×210 mm', displayLabel: 'A5 — 148×210 mm', widthMm: 148, heightMm: 210, surfaceM2: 0.03108 },
  { id: 'A4', label: 'A4 — 210×297 mm', displayLabel: 'A4 — 210×297 mm', widthMm: 210, heightMm: 297, surfaceM2: 0.06237 },
  { id: 'A4+', label: 'A4+ — 216×303 mm', displayLabel: 'A4+ — 216×303 mm', widthMm: A4_PLUS_W, heightMm: A4_PLUS_H, surfaceM2: 0.06545 },
  { id: 'A3', label: 'A3 — 297×420 mm', displayLabel: 'A3 — 297×420 mm', widthMm: 297, heightMm: 420, surfaceM2: 0.12474 },
  { id: 'A3+', label: 'A3+ — 320×450 mm', displayLabel: 'A3+ — 320×450 mm', widthMm: A3_PLUS_W, heightMm: A3_PLUS_H, surfaceM2: 0.144 },
  { id: 'A2', label: 'A2 — 420×594 mm', displayLabel: 'A2 — 420×594 mm', widthMm: 420, heightMm: 594, surfaceM2: 0.24948 },
  { id: 'A1', label: 'A1 — 594×841 mm', displayLabel: 'A1 — 594×841 mm', widthMm: 594, heightMm: 841, surfaceM2: 0.49955 },
  { id: 'A0', label: 'A0 — 841×1189 mm', displayLabel: 'A0 — 841×1189 mm', widthMm: 841, heightMm: 1189, surfaceM2: 0.99905 },
  { id: 'DL', label: 'DL — 99×210 mm', displayLabel: 'DL — 99×210 mm', widthMm: 99, heightMm: 210, surfaceM2: 0.02079 },
];

export const CALENDAR_PLATEAU_FORMAT_LABELS = [
  'A4 — 210×297 mm',
  'A4+ — 216×303 mm',
  'A3 — 297×420 mm',
  'A3+ — 320×450 mm',
  'A2 — 420×594 mm',
  'Format personnalisé',
];

export const CALENDAR_MURAL_FORMAT_LABELS = [
  'A4 — 210×297 mm',
  'A4+ — 216×303 mm',
  'A3 — 297×420 mm',
  'A3+ — 320×450 mm',
  'A2 — 420×594 mm',
  'Format personnalisé',
];

export const CALENDAR_MARQUEPAGE_FORMAT_LABELS = [
  '50 × 150 mm',
  '55 × 170 mm',
  '60 × 180 mm',
  '70 × 200 mm',
  'A7 — 74×105 mm',
  'DL — 99×210 mm',
  'Format personnalisé',
];

function parseDimPair(text: string): { w: number; h: number } | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m)?/i);
  if (!m) return null;
  let w = parseFloat(m[1].replace(',', '.'));
  let h = parseFloat(m[2].replace(',', '.'));
  const unit = (m[3] || 'mm').toLowerCase();
  if (unit === 'cm') { w *= 10; h *= 10; }
  if (unit === 'm') { w *= 1000; h *= 1000; }
  return { w, h };
}

/** Normalise SRA3 → A3+ pour affichage. */
export function displayCalendarFormatLabel(raw: string): string {
  const s = raw.trim();
  if (/^SRA3\b/i.test(s) || s.toUpperCase() === 'SRA3') {
    return 'A3+ — 320×450 mm';
  }
  return s.replace(/\bSRA3\b/gi, 'A3+');
}

export function sortFormatLabelsBySurface(labels: string[]): string[] {
  const custom = labels.filter((l) => /personnalis|autres/i.test(l));
  const standard = labels.filter((l) => !/personnalis|autres/i.test(l));
  standard.sort((a, b) => resolveFormatSurfaceM2(a) - resolveFormatSurfaceM2(b));
  return [...standard, ...custom];
}

export function resolveFormatSurfaceM2(formatLabel: string): number {
  const label = displayCalendarFormatLabel(formatLabel);
  const known = CALENDAR_STANDARD_FORMATS.find(
    (f) => f.label === label || f.id === label || label.includes(f.id),
  );
  if (known) return known.surfaceM2;
  const dim = parseDimPair(label);
  if (dim) return (dim.w * dim.h) / 1_000_000;
  return 0;
}

/** Résout largeur × hauteur (mm) depuis chip format ou champs L/l. */
export function resolveCalendarDimensionsMm(
  config: Record<string, unknown>,
): { widthMm: number; heightMm: number; formatLabel: string } | null {
  const format = displayCalendarFormatLabel(String(config.format ?? config.dim ?? ''));
  if (/personnalis/i.test(format)) {
    const L = Number(config.longueur);
    const l = Number(config.largeur);
    if (Number.isFinite(L) && L > 0 && Number.isFinite(l) && l > 0) {
      return { widthMm: L, heightMm: l, formatLabel: 'Format personnalisé' };
    }
    return null;
  }
  if (/autres/i.test(format)) return null;

  const known = CALENDAR_STANDARD_FORMATS.find(
    (f) => format === f.label || format.startsWith(f.id) || format.includes(f.label),
  );
  if (known) {
    return { widthMm: known.widthMm, heightMm: known.heightMm, formatLabel: known.displayLabel };
  }

  const dim = parseDimPair(format);
  if (dim) {
    return { widthMm: dim.w, heightMm: dim.h, formatLabel: format };
  }

  const iso = format.match(/\b(A[0-7]|DL)\b/i);
  if (iso) {
    const f = CALENDAR_STANDARD_FORMATS.find((x) => x.id === iso[1].toUpperCase());
    if (f) return { widthMm: f.widthMm, heightMm: f.heightMm, formatLabel: f.displayLabel };
  }

  return null;
}

export function fmtMm(w: number, h: number): string {
  return `${Math.round(w)} × ${Math.round(h)} mm`;
}

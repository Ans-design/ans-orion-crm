/**
 * Imposition Carterie — nombre de pièces par feuille (A4/A3…).
 * Priorité : capacité manuelle Admin > calcul automatique (rotation).
 */

export type SheetFormatCode = 'A4' | 'A3' | 'A3+' | 'SRA3' | 'A5' | 'A6';

export const SHEET_SIZE_MM: Record<SheetFormatCode, { w: number; h: number }> = {
  A6: { w: 105, h: 148 },
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  'A3+': { w: 320, h: 450 },
  SRA3: { w: 320, h: 450 },
};

export type PiecesPerSheetInput = {
  sheetFormat: string;
  cardWidth: number;
  cardHeight: number;
  marginMm?: number;
  gapMm?: number;
  allowRotation?: boolean;
  /** Capacité forcée Admin — prioritaire si > 0 */
  manualPieces?: number | null;
};

export type PiecesPerSheetResult = {
  pieces: number;
  source: 'manual' | 'auto' | 'unknown';
  orientation: 'as_is' | 'rotated' | 'n/a';
  sheetFormat: SheetFormatCode;
  sheetW: number;
  sheetH: number;
  formula: string;
};

export function parseSheetFormatCode(raw: unknown): SheetFormatCode {
  const s = String(raw ?? '').toUpperCase();
  if (s.includes('A3+') || s.includes('SRA3')) return s.includes('SRA3') ? 'SRA3' : 'A3+';
  if (/\bA3\b/.test(s)) return 'A3';
  if (/\bA5\b/.test(s)) return 'A5';
  if (/\bA6\b/.test(s)) return 'A6';
  return 'A4';
}

/** Parse « 85×55 mm », « 85x55 », « Carré — 55×55 mm », etc. */
export function parseCardDimensionsMm(formatRaw: unknown): { w: number; h: number } | null {
  const s = String(formatRaw ?? '').trim();
  if (!s || /personnalis/i.test(s)) return null;
  const m = s.replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)/);
  if (m) {
    return { w: parseFloat(m[1]!), h: parseFloat(m[2]!) };
  }
  // Formats ISO feuille utilisés comme format fini (A6, A5, DL…)
  const iso = s.toUpperCase();
  if (/\bA6\b/.test(iso)) return { w: 105, h: 148 };
  if (/\bDL\b/.test(iso) || /100\s*[×x]\s*210/.test(s)) return { w: 100, h: 210 };
  if (/\bA5\b/.test(iso)) return { w: 148, h: 210 };
  if (/\bA4\b/.test(iso)) return { w: 210, h: 297 };
  return null;
}

function fitCount(
  sheetW: number,
  sheetH: number,
  cardW: number,
  cardH: number,
  margin: number,
  gap: number,
): number {
  if (cardW <= 0 || cardH <= 0 || sheetW <= 0 || sheetH <= 0) return 0;
  const usableW = sheetW - 2 * margin;
  const usableH = sheetH - 2 * margin;
  if (usableW < cardW || usableH < cardH) return 0;
  const cols = Math.floor((usableW + gap) / (cardW + gap));
  const rows = Math.floor((usableH + gap) / (cardH + gap));
  return Math.max(0, cols * rows);
}

/**
 * Calcule le nombre de pièces par feuille.
 * Choisit l’orientation (portrait/paysage) qui maximise la capacité.
 */
export function calculatePiecesPerSheet(input: PiecesPerSheetInput): PiecesPerSheetResult {
  const sheetFormat = parseSheetFormatCode(input.sheetFormat);
  const size = SHEET_SIZE_MM[sheetFormat];
  const margin = Math.max(0, Number(input.marginMm) || 0);
  const gap = Math.max(0, Number(input.gapMm) || 0);
  const allowRotation = input.allowRotation !== false;

  const manual = input.manualPieces != null ? Math.floor(Number(input.manualPieces)) : null;
  if (manual != null && manual > 0) {
    return {
      pieces: manual,
      source: 'manual',
      orientation: 'n/a',
      sheetFormat,
      sheetW: size.w,
      sheetH: size.h,
      formula: `manual:${manual}`,
    };
  }

  const w = Number(input.cardWidth);
  const h = Number(input.cardHeight);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return {
      pieces: 0,
      source: 'unknown',
      orientation: 'n/a',
      sheetFormat,
      sheetW: size.w,
      sheetH: size.h,
      formula: 'unknown_dims',
    };
  }

  const asIs = fitCount(size.w, size.h, w, h, margin, gap);
  const rotated = allowRotation ? fitCount(size.w, size.h, h, w, margin, gap) : 0;
  const useRotated = rotated > asIs;
  const pieces = Math.max(asIs, rotated);

  return {
    pieces,
    source: pieces > 0 ? 'auto' : 'unknown',
    orientation: useRotated ? 'rotated' : 'as_is',
    sheetFormat,
    sheetW: size.w,
    sheetH: size.h,
    formula: `fit:${useRotated ? `${h}×${w}` : `${w}×${h}`}→${pieces}@${sheetFormat}`,
  };
}

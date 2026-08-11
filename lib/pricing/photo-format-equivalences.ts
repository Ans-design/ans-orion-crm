/**
 * Équivalences formats Photo (Tirage / Cadre / Photobook).
 * Formats commerciaux → format facturation ISO. Source Admin + seed code.
 */
import type { PaperFormatRuleLike } from '@/lib/pricing/paper-format-rules';
import {
  findPaperFormatRule,
  resolvePaperFormatForCustomSize,
} from '@/lib/pricing/paper-format-rules';

export type PhotoFormatEquivalenceLike = {
  excelId?: string | null;
  displayLabel: string;
  widthMm: number;
  heightMm: number;
  billingFormat: string;
  billingWidthMm: number;
  billingHeightMm: number;
  category: string;
  active: boolean;
  visiblePos: boolean;
  details?: string | null;
  /** Alias commercial (ex. 10×15) — pas de chip séparé si l’ISO est déjà listé. */
  isAlias?: boolean;
};

/** Chips POS Photo — mm uniquement (équivalences cm gérées en facturation, pas affichées). */
export const PHOTO_POS_FORMAT_CHIPS = [
  'A6 — 105×148 mm',
  '145×145 mm',
  'A5 — 148×210 mm',
  'A4 — 210×297 mm',
  '295×295 mm',
  'A3 — 297×420 mm',
  'A3+ — 320×450 mm',
  'A2 — 420×594 mm',
  'Format personnalisé',
] as const;

/** Photobook — mm uniquement, ordre taille réelle. */
export const PHOTOBOOK_POS_FORMAT_CHIPS = [
  'A6 — 105×148 mm',
  'DL — 99×210 mm',
  '145×145 mm',
  'A5 — 148×210 mm',
  '200×200 mm',
  'A4 — 210×297 mm',
  '295×295 mm',
  'A3 — 297×420 mm',
  'A3+ — 320×450 mm',
  'A2 — 420×594 mm',
  'Format personnalisé',
] as const;

/** Labels legacy → ne plus afficher (remplacés). */
export const PHOTO_LEGACY_FORMAT_LABELS = [
  '10×15 cm',
  '10x15 cm',
  '13×18 cm',
  '13x18 cm',
  '15×20 cm',
  '15x20 cm',
  '20×30 cm',
  '20x30 cm',
  '30×40 cm',
  '30x40 cm',
  '30×45 cm',
  '30x45 cm',
  '40×60 cm',
  '40x60 cm',
  '15×15 cm',
  '15x15 cm',
  'Mini — 15×15 cm',
  '30×30 cm',
  '30x30 cm',
] as const;

const ISO_DIMS: Record<string, { w: number; h: number }> = {
  A6: { w: 105, h: 148 },
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  'A3+': { w: 320, h: 450 },
  A2: { w: 420, h: 594 },
  DL: { w: 99, h: 210 },
};

function row(
  displayLabel: string,
  widthMm: number,
  heightMm: number,
  billingFormat: string,
  opts?: Partial<PhotoFormatEquivalenceLike> & { excelId?: string },
): PhotoFormatEquivalenceLike {
  const bill = ISO_DIMS[billingFormat] ?? { w: widthMm, h: heightMm };
  return {
    excelId: opts?.excelId ?? null,
    displayLabel,
    widthMm,
    heightMm,
    billingFormat,
    billingWidthMm: opts?.billingWidthMm ?? bill.w,
    billingHeightMm: opts?.billingHeightMm ?? bill.h,
    category: opts?.category ?? 'photo',
    active: opts?.active ?? true,
    visiblePos: opts?.visiblePos ?? true,
    details: opts?.details ?? null,
    isAlias: opts?.isAlias ?? false,
  };
}

/**
 * Table officielle — seed Admin / Excel.
 * Les alias commerciaux (isAlias) ne sont pas des chips POS séparés.
 */
export const DEFAULT_PHOTO_FORMAT_EQUIVALENCES: PhotoFormatEquivalenceLike[] = [
  row('A6 — 105×148 mm', 105, 148, 'A6', { excelId: '001', category: 'iso', visiblePos: true }),
  row('A5 — 148×210 mm', 148, 210, 'A5', { excelId: '002', category: 'iso', visiblePos: true }),
  row('A4 — 210×297 mm', 210, 297, 'A4', { excelId: '003', category: 'iso', visiblePos: true }),
  row('A3 — 297×420 mm', 297, 420, 'A3', { excelId: '004', category: 'iso', visiblePos: true }),
  row('A3+ — 320×450 mm', 320, 450, 'A3+', { excelId: '005', category: 'iso', visiblePos: true }),
  row('A2 — 420×594 mm', 420, 594, 'A2', { excelId: '006', category: 'iso', visiblePos: true }),
  row('145×145 mm', 145, 145, 'A5', {
    excelId: '007',
    category: 'square',
    details: 'Carré photo (ex-14,5×14,5 cm) → facturé A5',
  }),
  row('295×295 mm', 295, 295, 'A3', {
    excelId: '008',
    category: 'square',
    details: 'Carré photo (ex-29,5×29,5 cm) → facturé A3',
  }),
  row('200×200 mm', 200, 200, 'A4', {
    excelId: '009',
    category: 'square',
    details: 'Carré photobook → facturé A4',
    visiblePos: true,
  }),
  row('DL — 99×210 mm', 99, 210, 'DL', { excelId: '010', category: 'iso', visiblePos: true }),
  // Alias commerciaux (prix = format facturation, pas de chip séparé)
  row('10×15 cm', 100, 150, 'A6', {
    excelId: '011',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Équivalent A6 — ne pas afficher si A6 présent',
  }),
  row('13×18 cm', 130, 180, 'A5', {
    excelId: '012',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Équivalent A5',
  }),
  row('15×20 cm', 150, 200, 'A5', {
    excelId: '013',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Équivalent A5',
  }),
  row('20×30 cm', 200, 300, 'A4', {
    excelId: '014',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Équivalent A4',
  }),
  row('30×40 cm', 300, 400, 'A3', {
    excelId: '015',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Équivalent A3',
  }),
  row('30×45 cm', 300, 450, 'A3+', {
    excelId: '016',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Équivalent A3+',
  }),
  row('40×60 cm', 400, 600, 'A2', {
    excelId: '017',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Équivalent A2',
  }),
  row('15×15 cm', 150, 150, 'A5', {
    excelId: '018',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Legacy → utiliser 145×145 mm',
  }),
  row('30×30 cm', 300, 300, 'A3', {
    excelId: '019',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Legacy → utiliser 295×295 mm',
  }),
  row('14,5×14,5 cm', 145, 145, 'A5', {
    excelId: '020',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Legacy cm → 145×145 mm',
  }),
  row('29,5×29,5 cm', 295, 295, 'A3', {
    excelId: '021',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Legacy cm → 295×295 mm',
  }),
  row('20×20 cm', 200, 200, 'A4', {
    excelId: '022',
    category: 'alias',
    isAlias: true,
    visiblePos: false,
    details: 'Legacy cm → 200×200 mm',
  }),
];

let cachedEquivalences: PhotoFormatEquivalenceLike[] = DEFAULT_PHOTO_FORMAT_EQUIVALENCES;

export function setPhotoFormatEquivalencesRuntime(rows: PhotoFormatEquivalenceLike[] | null) {
  cachedEquivalences = rows?.length ? rows : DEFAULT_PHOTO_FORMAT_EQUIVALENCES;
}

export function getPhotoFormatEquivalences(): PhotoFormatEquivalenceLike[] {
  return cachedEquivalences.filter((r) => r.active !== false);
}

function normalizeDims(w: number, h: number): [number, number] {
  return w <= h ? [w, h] : [h, w];
}

function dimsMatch(aW: number, aH: number, bW: number, bH: number, tolMm: number): boolean {
  const [aw, ah] = normalizeDims(aW, aH);
  const [bw, bh] = normalizeDims(bW, bH);
  return Math.abs(aw - bw) <= tolMm && Math.abs(ah - bh) <= tolMm;
}

/** Normalise libellé pour comparaison (×/x, virgule, espaces). */
export function normalizePhotoFormatLabel(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/×/g, 'x');
}

/**
 * Résout un libellé chip / legacy → format facturation.
 * Les équivalences commerciales primeront sur le mm strict.
 */
export function resolvePhotoFormatFromLabel(
  rawLabel: string,
  equivalences: PhotoFormatEquivalenceLike[] = getPhotoFormatEquivalences(),
): {
  chosenLabel: string;
  billingFormat: string | null;
  widthMm: number;
  heightMm: number;
  isCustom: boolean;
  reason: string;
} {
  const raw = String(rawLabel ?? '').trim();
  const chosenLabel = raw;
  if (!raw) {
    return { chosenLabel: '', billingFormat: null, widthMm: 0, heightMm: 0, isCustom: false, reason: 'empty' };
  }
  if (/personnalis/i.test(raw)) {
    return { chosenLabel, billingFormat: null, widthMm: 0, heightMm: 0, isCustom: true, reason: 'custom' };
  }

  const norm = normalizePhotoFormatLabel(raw);

  // Match exact / préfixe libellé (évite A3 ↔ A3+)
  for (const eq of equivalences) {
    const nEq = normalizePhotoFormatLabel(eq.displayLabel);
    const head = nEq.split('—')[0]!.trim();
    const rawHead = norm.split('—')[0]!.trim();
    if (norm === nEq || rawHead === head) {
      return {
        chosenLabel: eq.displayLabel,
        billingFormat: eq.billingFormat,
        widthMm: eq.widthMm,
        heightMm: eq.heightMm,
        isCustom: false,
        reason: `label→${eq.billingFormat}`,
      };
    }
  }

  // Codes ISO seuls (A4, A3+, …)
  if (/^a3\+/i.test(raw) || /a3\+/i.test(raw)) {
    return { chosenLabel: raw, billingFormat: 'A3+', widthMm: 320, heightMm: 450, isCustom: false, reason: 'iso' };
  }
  const iso = raw.match(/\b(A2|A3|A4|A5|A6|A7|DL)\b/i);
  if (iso) {
    const code = iso[1]!.toUpperCase();
    const d = ISO_DIMS[code];
    return {
      chosenLabel: raw,
      billingFormat: code,
      widthMm: d?.w ?? 0,
      heightMm: d?.h ?? 0,
      isCustom: false,
      reason: 'iso',
    };
  }

  // Dimensions dans le libellé (14,5×14,5 cm / 20x30 cm)
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)?/i);
  if (m) {
    let w = parseFloat(m[1]!.replace(',', '.'));
    let h = parseFloat(m[2]!.replace(',', '.'));
    const unit = (m[3] ?? 'cm').toLowerCase();
    if (unit === 'cm') {
      w *= 10;
      h *= 10;
    }
    const commercial = resolvePhotoCommercialDims(w, h, equivalences);
    if (commercial.billingFormat) {
      return {
        chosenLabel: raw,
        billingFormat: commercial.billingFormat,
        widthMm: w,
        heightMm: h,
        isCustom: false,
        reason: commercial.reason,
      };
    }
    return { chosenLabel: raw, billingFormat: null, widthMm: w, heightMm: h, isCustom: true, reason: 'dims_label' };
  }

  return { chosenLabel: raw, billingFormat: null, widthMm: 0, heightMm: 0, isCustom: true, reason: 'unknown' };
}

/**
 * Équivalences métier commerciales (tolérance mm) — primer sur contain strict.
 */
export function resolvePhotoCommercialDims(
  widthMm: number,
  heightMm: number,
  equivalences: PhotoFormatEquivalenceLike[] = getPhotoFormatEquivalences(),
  tolMm = 8,
): { billingFormat: string | null; reason: string; matchedLabel?: string } {
  if (!(widthMm > 0) || !(heightMm > 0)) {
    return { billingFormat: null, reason: 'dims_manquantes' };
  }

  // Alias / commerciaux d’abord (y compris carrés)
  const candidates = equivalences.filter((e) => e.active !== false);
  for (const eq of candidates) {
    if (dimsMatch(widthMm, heightMm, eq.widthMm, eq.heightMm, tolMm)) {
      return {
        billingFormat: eq.billingFormat,
        reason: `commercial:${eq.displayLabel}→${eq.billingFormat}`,
        matchedLabel: eq.displayLabel,
      };
    }
  }

  return { billingFormat: null, reason: 'no_commercial_match' };
}

/**
 * Format perso / dims → facturation.
 * 1) équivalence commerciale  2) format supérieur PaperFormatRule
 */
export function resolvePhotoBillingFormat(
  widthMm: number,
  heightMm: number,
  paperRules?: PaperFormatRuleLike[],
): {
  billingFormat: string | null;
  surDevis: boolean;
  reason: string;
  chosenLabel?: string;
} {
  const commercial = resolvePhotoCommercialDims(widthMm, heightMm);
  if (commercial.billingFormat) {
    return {
      billingFormat: commercial.billingFormat,
      surDevis: false,
      reason: commercial.reason,
      chosenLabel: commercial.matchedLabel,
    };
  }

  const resolved = resolvePaperFormatForCustomSize(widthMm, heightMm, paperRules);
  if (resolved.surDevis || !resolved.formatUsed) {
    return { billingFormat: null, surDevis: true, reason: resolved.reason };
  }
  return {
    billingFormat: resolved.formatUsed,
    surDevis: false,
    reason: resolved.reason,
  };
}

export function formatPhotoBillingMessage(chosenLabel: string, billingFormat: string): string {
  const chosen = String(chosenLabel ?? '').trim();
  if (!chosen) return `Format facturé : ${billingFormat}`;
  if (new RegExp(`\\b${billingFormat.replace('+', '\\+')}\\b`, 'i').test(chosen)) {
    return chosen;
  }
  return `${chosen} — facturé ${billingFormat}`;
}

export function findPhotoEquivalenceByBilling(
  billingFormat: string,
  equivalences: PhotoFormatEquivalenceLike[] = getPhotoFormatEquivalences(),
): PhotoFormatEquivalenceLike | null {
  const key = String(billingFormat ?? '').toUpperCase();
  return (
    equivalences.find((e) => e.billingFormat.toUpperCase() === key && !e.isAlias)
    ?? equivalences.find((e) => e.billingFormat.toUpperCase() === key)
    ?? null
  );
}

/** Vérifie qu’une règle papier A2 existe (ratio 4, sans découpe). */
export function ensureA2InPaperRules(rules: PaperFormatRuleLike[]): PaperFormatRuleLike[] {
  if (findPaperFormatRule('A2', rules)) return rules;
  return [
    ...rules,
    {
      formatCode: 'A2',
      widthMm: 420,
      heightMm: 594,
      ratioA4: 4,
      supplementAr: 0,
      cutAr: 0,
      formula: 'Prix A4 × 4',
      active: true,
    },
  ];
}

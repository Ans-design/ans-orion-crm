/**
 * Règles formats papier — base A4, découpe/suppléments administrables.
 * Prix = a4Price * ratioA4 + cutAr + supplementAr (depuis DB, pas hardcodé).
 */
import { resolvePriceEquivalentFromDims } from '@/lib/pos/format-commercial-aliases';

export type PaperFormatRuleLike = {
  formatCode: string;
  widthMm: number;
  heightMm: number;
  ratioA4: number;
  supplementAr: number;
  cutAr: number;
  formula?: string | null;
  active?: boolean;
};

/** Seed idempotent — valeurs par défaut du prompt (modifiables ensuite en Admin). */
export const DEFAULT_PAPER_FORMAT_RULES: PaperFormatRuleLike[] = [
  { formatCode: 'A10', widthMm: 26, heightMm: 37, ratioA4: 1 / 64, supplementAr: 0, cutAr: 50, formula: 'Prix A4/64 + découpe' },
  { formatCode: 'A9', widthMm: 37, heightMm: 52, ratioA4: 1 / 32, supplementAr: 0, cutAr: 50, formula: 'Prix A4/32 + découpe' },
  { formatCode: 'A8', widthMm: 52, heightMm: 74, ratioA4: 1 / 16, supplementAr: 0, cutAr: 50, formula: 'Prix A4/16 + découpe' },
  { formatCode: 'A7', widthMm: 74, heightMm: 105, ratioA4: 1 / 8, supplementAr: 0, cutAr: 50, formula: 'Prix A4/8 + découpe' },
  { formatCode: 'A6', widthMm: 105, heightMm: 148, ratioA4: 0.25, supplementAr: 0, cutAr: 50, formula: 'Prix A4/4 + découpe' },
  { formatCode: 'DL', widthMm: 99, heightMm: 210, ratioA4: 1 / 3, supplementAr: 0, cutAr: 50, formula: 'Prix A4/3 + découpe' },
  /** A5 = demi A4 — pas de découpe (découpe 50 Ar seulement si format < A5). */
  { formatCode: 'A5', widthMm: 148, heightMm: 210, ratioA4: 0.5, supplementAr: 0, cutAr: 0, formula: 'Prix A4/2' },
  { formatCode: 'B6', widthMm: 125, heightMm: 176, ratioA4: 0.35, supplementAr: 0, cutAr: 50, formula: '≈0.35×A4 + découpe' },
  { formatCode: 'B5', widthMm: 176, heightMm: 250, ratioA4: 1, supplementAr: 0, cutAr: 0, formula: 'Prix A4' },
  { formatCode: 'A4', widthMm: 210, heightMm: 297, ratioA4: 1, supplementAr: 0, cutAr: 0, formula: 'Prix A4' },
  { formatCode: 'A4+', widthMm: 225, heightMm: 320, ratioA4: 1, supplementAr: 100, cutAr: 0, formula: 'Prix A4 + 100' },
  { formatCode: 'A3', widthMm: 297, heightMm: 420, ratioA4: 2, supplementAr: 0, cutAr: 0, formula: 'Prix A4 × 2' },
  { formatCode: 'A3+', widthMm: 320, heightMm: 450, ratioA4: 2, supplementAr: 200, cutAr: 0, formula: 'Prix A4 × 2 + 200' },
  { formatCode: 'SRA3', widthMm: 320, heightMm: 450, ratioA4: 2, supplementAr: 200, cutAr: 0, formula: 'Alias A3+' },
  { formatCode: 'A2', widthMm: 420, heightMm: 594, ratioA4: 4, supplementAr: 0, cutAr: 0, formula: 'Prix A4 × 4' },
  /** Carré flyer 90×90 — ~1/8 feuille A4 + découpe */
  { formatCode: 'CARRE90', widthMm: 90, heightMm: 90, ratioA4: 0.125, supplementAr: 0, cutAr: 80, formula: 'Prix A4/8 + découpe carré' },
];

function normalizeDims(w: number, h: number): [number, number] {
  return w <= h ? [w, h] : [h, w];
}

function canContain(
  sheetW: number,
  sheetH: number,
  needW: number,
  needH: number,
): boolean {
  const [sw, sh] = normalizeDims(sheetW, sheetH);
  const [nw, nh] = normalizeDims(needW, needH);
  return sw + 0.01 >= nw && sh + 0.01 >= nh;
}

export type ResolvePaperFormatResult = {
  formatUsed: string | null;
  rule: PaperFormatRuleLike | null;
  reason: string;
  warning?: string;
  surDevis: boolean;
};

/**
 * Format personnalisé → format standard.
 * 1) Alias commercial arrondi (20×30 cm → A4)
 * 2) Format supérieur le plus proche qui contient la pièce
 * Orientation-free. Ne jamais utiliser un format inférieur (hors match commercial).
 */
export function resolvePaperFormatForCustomSize(
  widthMm: number,
  heightMm: number,
  rules: PaperFormatRuleLike[] = DEFAULT_PAPER_FORMAT_RULES,
): ResolvePaperFormatResult {
  if (!(widthMm > 0) || !(heightMm > 0)) {
    return {
      formatUsed: null,
      rule: null,
      reason: 'Dimensions manquantes',
      surDevis: true,
      warning: 'Largeur/hauteur requises',
    };
  }

  // Alias commerciaux arrondis (même tarif que l’ISO) — avant « supérieur »
  const commercial = resolvePriceEquivalentFromDims(widthMm, heightMm);
  if (commercial) {
    const rule = findPaperFormatRule(commercial.formatCode, rules);
    return {
      formatUsed: commercial.formatCode,
      rule,
      reason: commercial.reason,
      surDevis: false,
    };
  }

  const active = rules.filter((r) => r.active !== false);
  const candidates = active
    .filter((r) => canContain(r.widthMm, r.heightMm, widthMm, heightMm))
    .sort((a, b) => a.widthMm * a.heightMm - b.widthMm * b.heightMm);

  if (!candidates.length) {
    return {
      formatUsed: null,
      rule: null,
      reason: 'Aucun format standard ne contient ces dimensions',
      surDevis: true,
      warning: 'Passer en devis personnalisé ou grand format',
    };
  }

  const best = candidates[0]!;
  return {
    formatUsed: best.formatCode,
    rule: best,
    reason: `${widthMm}×${heightMm} mm → ${best.formatCode} (format supérieur)`,
    surDevis: false,
  };
}

export function findPaperFormatRule(
  formatCode: string,
  rules: PaperFormatRuleLike[] = DEFAULT_PAPER_FORMAT_RULES,
): PaperFormatRuleLike | null {
  const raw = String(formatCode ?? '').trim();
  if (!raw) return null;
  const key = raw.toUpperCase().replace(/\s/g, '');
  const alias = key === 'SRA3' ? 'A3+' : key;
  const exact =
    rules.find((r) => r.active !== false && r.formatCode.toUpperCase() === alias)
    ?? rules.find((r) => r.active !== false && r.formatCode.toUpperCase() === key);
  if (exact) return exact;

  // Carré flyer 90×90 (libellés POS : « Carré — 90×90 mm », « 90x90 »)
  if (/carr[eé]/i.test(raw) || /90\s*[×x]\s*90/i.test(raw) || /^(90X90|CARRE90)$/i.test(key)) {
    return (
      rules.find((r) => r.active !== false && r.formatCode.toUpperCase() === 'CARRE90')
      ?? null
    );
  }

  // Libellés POS longs : « A4 — 210×297 mm », « A5 148x210 »
  const iso = raw.match(/\b(A[0-7]\+?|DL|B[0-6]|SRA3)\b/i);
  if (iso) {
    const code = iso[1]!.toUpperCase().replace('SRA3', 'A3+');
    return (
      rules.find((r) => r.active !== false && r.formatCode.toUpperCase() === code)
      ?? null
    );
  }
  return null;
}

/**
 * Prix format depuis prix A4 + règle (ratio + découpe + supplément).
 */
export function computePaperFormatPrice(
  a4Price: number,
  formatCodeOrRule: string | PaperFormatRuleLike,
  rules: PaperFormatRuleLike[] = DEFAULT_PAPER_FORMAT_RULES,
): { price: number; formula: string; rule: PaperFormatRuleLike | null } {
  const rule =
    typeof formatCodeOrRule === 'string'
      ? findPaperFormatRule(formatCodeOrRule, rules)
      : formatCodeOrRule;

  if (!rule) {
    return { price: Math.round(a4Price), formula: 'a4_fallback', rule: null };
  }

  const price = Math.round(a4Price * rule.ratioA4 + rule.cutAr + rule.supplementAr);
  const formula =
    rule.formula
    ?? `A4×${rule.ratioA4}+découpe${rule.cutAr}+suppl${rule.supplementAr}`;
  return { price, formula, rule };
}

/**
 * Résout le facteur « legacy » pour compat : prixFormat / a4Price si a4>0.
 * Préférer computePaperFormatPrice pour la justesse.
 */
export function paperFormatEffectiveFactor(
  formatCode: string,
  rules: PaperFormatRuleLike[] = DEFAULT_PAPER_FORMAT_RULES,
  a4ReferencePrice = 1000,
): number {
  const { price } = computePaperFormatPrice(a4ReferencePrice, formatCode, rules);
  if (a4ReferencePrice <= 0) return 1;
  return price / a4ReferencePrice;
}

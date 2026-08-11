/**
 * Formats tampon — prix fixe, format perso → format standard supérieur (pas de surface).
 */

export type StampFormatLike = {
  id?: string;
  stampType: string;
  formatLabel: string;
  widthMm: number;
  heightMm: number;
  unitPrice: number;
  reference?: string | null;
  allowCustomFormat?: boolean;
  active?: boolean;
  status?: string;
};

export const DEFAULT_STAMP_FORMATS: StampFormatLike[] = [
  { stampType: 'Tampon standard', formatLabel: 'Carré 20×20 mm', widthMm: 20, heightMm: 20, unitPrice: 10000, reference: 'TAMP-20X20' },
  { stampType: 'Tampon standard', formatLabel: 'Carré 30×30 mm', widthMm: 30, heightMm: 30, unitPrice: 15000, reference: 'TAMP-30X30' },
  { stampType: 'Tampon standard', formatLabel: 'Carré 50×50 mm', widthMm: 50, heightMm: 50, unitPrice: 25000, reference: 'TAMP-50X50' },
  { stampType: 'Tampon standard', formatLabel: 'Rond Ø 20 mm', widthMm: 20, heightMm: 20, unitPrice: 10000, reference: 'TAMP-R20' },
  { stampType: 'Tampon standard', formatLabel: 'Rond Ø 30 mm', widthMm: 30, heightMm: 30, unitPrice: 15000, reference: 'TAMP-R30' },
  { stampType: 'Tampon standard', formatLabel: 'Rond Ø 40 mm', widthMm: 40, heightMm: 40, unitPrice: 20000, reference: 'TAMP-R40' },
  { stampType: 'Tampon standard', formatLabel: 'Rond Ø 50 mm', widthMm: 50, heightMm: 50, unitPrice: 25000, reference: 'TAMP-R50' },
  { stampType: 'Tampon standard', formatLabel: 'Petit — 38×14 mm', widthMm: 38, heightMm: 14, unitPrice: 12000, reference: 'TAMP-38X14' },
  { stampType: 'Tampon standard', formatLabel: 'Standard — 47×18 mm', widthMm: 47, heightMm: 18, unitPrice: 15000, reference: 'TAMP-47X18' },
  { stampType: 'Tampon standard', formatLabel: 'Moyen — 58×22 mm', widthMm: 58, heightMm: 22, unitPrice: 18000, reference: 'TAMP-58X22' },
  { stampType: 'Tampon standard', formatLabel: 'Grand — 68×47 mm', widthMm: 68, heightMm: 47, unitPrice: 28000, reference: 'TAMP-68X47' },
  { stampType: 'Tampon dateur', formatLabel: '40×20 mm', widthMm: 40, heightMm: 20, unitPrice: 22000, reference: 'TAMP-DAT-40X20' },
  { stampType: 'Tampon professionnel', formatLabel: '60×40 mm', widthMm: 60, heightMm: 40, unitPrice: 35000, reference: 'TAMP-PRO-60X40' },
];

function normalizeDims(w: number, h: number): [number, number] {
  return w <= h ? [w, h] : [h, w];
}

function canContain(sheetW: number, sheetH: number, needW: number, needH: number): boolean {
  const [sw, sh] = normalizeDims(sheetW, sheetH);
  const [nw, nh] = normalizeDims(needW, needH);
  return sw + 0.01 >= nw && sh + 0.01 >= nh;
}

export type ResolveStampFormatResult = {
  formatUsed: string | null;
  rule: StampFormatLike | null;
  unitPrice: number;
  surDevis: boolean;
  reason: string;
  message?: string;
};

/**
 * Format personnalisé → plus petit format standard qui contient la pièce.
 * Orientation-free. Jamais un format inférieur. Pas de calcul surface.
 */
export function resolveStampFormat(
  widthMm: number,
  heightMm: number,
  formats: StampFormatLike[],
  stampType?: string,
): ResolveStampFormatResult {
  if (!(widthMm > 0) || !(heightMm > 0)) {
    return {
      formatUsed: null,
      rule: null,
      unitPrice: 0,
      surDevis: true,
      reason: 'dimensions_manquantes',
    };
  }

  let active = formats.filter(
    (f) => f.active !== false && (f.status == null || f.status === 'published') && f.unitPrice > 0,
  );
  if (stampType) {
    const typed = active.filter((f) => f.stampType.toLowerCase().includes(stampType.toLowerCase().replace(/^tampon\s*/i, '').trim())
      || stampType.toLowerCase().includes(f.stampType.toLowerCase().replace(/^tampon\s*/i, '').trim()));
    if (typed.length) active = typed;
  }

  const candidates = active
    .filter((f) => canContain(f.widthMm, f.heightMm, widthMm, heightMm))
    .sort((a, b) => a.widthMm * a.heightMm - b.widthMm * b.heightMm);

  const best = candidates[0];
  if (!best) {
    return {
      formatUsed: null,
      rule: null,
      unitPrice: 0,
      surDevis: true,
      reason: 'format_hors_standard',
      message: 'Format hors standard — devis personnalisé',
    };
  }

  return {
    formatUsed: best.formatLabel,
    rule: best,
    unitPrice: best.unitPrice,
    surDevis: false,
    reason: 'format_superieur',
    message: `Format personnalisé facturé au format supérieur : ${best.formatLabel}`,
  };
}

/** Parse dimensions depuis un label format POS (Carré 20×20, Rond Ø 30, 47×18…). */
export function parseStampFormatDims(label: string): { widthMm: number; heightMm: number } | null {
  const v = String(label ?? '');
  const round = v.match(/Ø\s*(\d+)/i) || v.match(/diam[eè]tre\s*(\d+)/i);
  if (round) {
    const d = parseInt(round[1], 10);
    return { widthMm: d, heightMm: d };
  }
  const rect = v.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (rect) {
    return { widthMm: parseInt(rect[1], 10), heightMm: parseInt(rect[2], 10) };
  }
  return null;
}

export function findStampByLabel(
  label: string,
  formats: StampFormatLike[],
): StampFormatLike | null {
  const v = label.trim().toLowerCase();
  return (
    formats.find((f) => f.formatLabel.toLowerCase() === v)
    ?? formats.find((f) => v.includes(f.formatLabel.toLowerCase()) || f.formatLabel.toLowerCase().includes(v))
    ?? null
  );
}

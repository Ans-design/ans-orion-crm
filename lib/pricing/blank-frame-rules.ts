/**
 * Cadres vierges — résolution format supérieur + seed défauts Admin.
 */

export type BlankFrameLike = {
  id?: string;
  frameType: string;
  formatLabel: string;
  widthMm: number;
  heightMm: number;
  material?: string | null;
  color?: string | null;
  unitPrice: number;
  active?: boolean;
  status?: string;
};

/** Formats standards (mm) pour seed — alignés chips POS (sans doublons cm/ISO). */
export const CADRE_FORMAT_DEFS: Array<{ label: string; widthMm: number; heightMm: number }> = [
  { label: 'A6 — 105×148 mm', widthMm: 105, heightMm: 148 },
  { label: '145×145 mm', widthMm: 145, heightMm: 145 },
  { label: 'A5 — 148×210 mm', widthMm: 148, heightMm: 210 },
  { label: 'A4 — 210×297 mm', widthMm: 210, heightMm: 297 },
  { label: '295×295 mm', widthMm: 295, heightMm: 295 },
  { label: 'A3 — 297×420 mm', widthMm: 297, heightMm: 420 },
  { label: 'A3+ — 320×450 mm', widthMm: 320, heightMm: 450 },
  { label: 'A2 — 420×594 mm', widthMm: 420, heightMm: 594 },
  // Clés courtes pour seed prix
  { label: 'A6', widthMm: 105, heightMm: 148 },
  { label: 'A5', widthMm: 148, heightMm: 210 },
  { label: 'A4', widthMm: 210, heightMm: 297 },
  { label: 'A3', widthMm: 297, heightMm: 420 },
  { label: 'A3+', widthMm: 320, heightMm: 450 },
  { label: 'A2', widthMm: 420, heightMm: 594 },
];

/** Prix seed cadre vierge (modifiables Admin) — tests : bois A4=12000, plastique A5=8000. */
const SEED_PRICES: Record<string, Partial<Record<string, number>>> = {
  'Cadre bois': {
    A6: 4500,
    A5: 9000,
    A4: 12000,
    A3: 18000,
    'A3+': 20000,
    A2: 28000,
    '145×145 mm': 8500,
    '295×295 mm': 17000,
  },
  'Cadre plastique': {
    A6: 3000,
    A5: 8000,
    A4: 9500,
    A3: 14000,
    'A3+': 15500,
    A2: 22000,
    '145×145 mm': 7500,
    '295×295 mm': 13500,
  },
  'Cadre aluminium': {
    A6: 6000,
    A5: 11000,
    A4: 15000,
    A3: 22000,
    'A3+': 24000,
    A2: 32000,
    '145×145 mm': 10500,
    '295×295 mm': 21000,
  },
  'Cadre premium': {
    A4: 25000,
    A5: 18000,
    A3: 35000,
    A2: 48000,
    'A3+': 38000,
  },
};

export const DEFAULT_BLANK_FRAMES: BlankFrameLike[] = (() => {
  const rows: BlankFrameLike[] = [];
  const shortKey = (label: string) => {
    if (/A3\+/i.test(label)) return 'A3+';
    const iso = label.match(/\b(A2|A3|A4|A5|A6)\b/i);
    if (iso) return iso[1]!.toUpperCase();
    if (/145|14[,.]5/i.test(label)) return '145×145 mm';
    if (/295|29[,.]5/i.test(label)) return '295×295 mm';
    return label;
  };
  for (const [frameType, byFormat] of Object.entries(SEED_PRICES)) {
    for (const fmt of CADRE_FORMAT_DEFS) {
      const price = byFormat[fmt.label] ?? byFormat[shortKey(fmt.label)];
      if (price == null) continue;
      rows.push({
        frameType,
        formatLabel: fmt.label,
        widthMm: fmt.widthMm,
        heightMm: fmt.heightMm,
        unitPrice: price,
        material: frameType.replace(/^Cadre\s+/i, ''),
      });
    }
  }
  return rows;
})();

function normalizeDims(w: number, h: number): [number, number] {
  return w <= h ? [w, h] : [h, w];
}

function canContain(sheetW: number, sheetH: number, needW: number, needH: number): boolean {
  const [sw, sh] = normalizeDims(sheetW, sheetH);
  const [nw, nh] = normalizeDims(needW, needH);
  return sw + 0.01 >= nw && sh + 0.01 >= nh;
}

export type ResolveBlankFrameResult = {
  frame: BlankFrameLike | null;
  formatUsed: string | null;
  unitPrice: number;
  surDevis: boolean;
  reason: string;
  message?: string;
};

/**
 * Format perso → plus petit cadre standard du type qui contient la pièce.
 */
export function resolveBlankFrameFormat(
  widthMm: number,
  heightMm: number,
  frames: BlankFrameLike[],
  frameType?: string,
): ResolveBlankFrameResult {
  if (!(widthMm > 0) || !(heightMm > 0)) {
    return { frame: null, formatUsed: null, unitPrice: 0, surDevis: true, reason: 'dims_manquantes' };
  }

  let active = frames.filter(
    (f) => f.active !== false && (f.status == null || f.status === 'published') && f.unitPrice > 0,
  );
  if (frameType) {
    const t = frameType.toLowerCase().replace(/^cadre\s+/i, '').trim();
    const typed = active.filter((f) => {
      const ft = f.frameType.toLowerCase();
      return ft.includes(t) || t.includes(ft.replace(/^cadre\s+/i, '').trim());
    });
    if (typed.length) active = typed;
  }

  const candidates = active
    .filter((f) => canContain(f.widthMm, f.heightMm, widthMm, heightMm))
    .sort((a, b) => a.widthMm * a.heightMm - b.widthMm * b.heightMm);

  const best = candidates[0];
  if (!best) {
    return {
      frame: null,
      formatUsed: null,
      unitPrice: 0,
      surDevis: true,
      reason: 'format_hors_standard',
      message: 'Format cadre hors standard — devis personnalisé',
    };
  }

  return {
    frame: best,
    formatUsed: best.formatLabel,
    unitPrice: best.unitPrice,
    surDevis: false,
    reason: 'format_superieur',
    message: `Format personnalisé facturé au format supérieur : ${best.formatLabel}`,
  };
}

export function findBlankFrameByLabel(
  formatLabel: string,
  frames: BlankFrameLike[],
  frameType?: string,
): BlankFrameLike | null {
  let pool = frames.filter(
    (f) => f.active !== false && (f.status == null || f.status === 'published'),
  );
  if (frameType) {
    const t = frameType.toLowerCase().replace(/^cadre\s+/i, '').trim();
    const typed = pool.filter((f) => {
      const ft = f.frameType.toLowerCase();
      return ft.includes(t) || t.includes(ft.replace(/^cadre\s+/i, '').trim());
    });
    if (typed.length) pool = typed;
  }
  const v = formatLabel.trim().toLowerCase();
  return (
    pool.find((f) => f.formatLabel.toLowerCase() === v)
    ?? pool.find((f) => v.includes(f.formatLabel.toLowerCase()) || f.formatLabel.toLowerCase().includes(v))
    ?? null
  );
}

export function parseCadreFormatDims(label: string): { widthMm: number; heightMm: number } | null {
  const v = String(label ?? '');
  if (/\bA2\b/i.test(v)) return { widthMm: 420, heightMm: 594 };
  if (/\bA4\b/i.test(v) && !/A4\+/i.test(v)) return { widthMm: 210, heightMm: 297 };
  if (/\bA5\b/i.test(v)) return { widthMm: 148, heightMm: 210 };
  if (/\bA6\b/i.test(v)) return { widthMm: 105, heightMm: 148 };
  if (/A3\+/i.test(v)) return { widthMm: 320, heightMm: 450 };
  if (/\bA3\b/i.test(v)) return { widthMm: 297, heightMm: 420 };
  // 14,5×14,5 cm / 29,5×29,5 cm
  const cmDec = v.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*cm/i);
  if (cmDec) {
    return {
      widthMm: parseFloat(cmDec[1]!.replace(',', '.')) * 10,
      heightMm: parseFloat(cmDec[2]!.replace(',', '.')) * 10,
    };
  }
  const mm = v.match(/(\d+)\s*[x×]\s*(\d+)\s*mm/i);
  if (mm) return { widthMm: parseInt(mm[1], 10), heightMm: parseInt(mm[2], 10) };
  return null;
}

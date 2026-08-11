/** Génération SKU automatique — 5 lettres nom + caractéristiques */
export type SkuInput = {
  label: string;
  grammage?: string | null;
  thickness?: string | null;
  color?: string | null;
  formatLabel?: string | null;
  paperType?: string | null;
  widthM?: number | null;
  stockKind?: string | null;
  characteristic?: string | null;
  machineCompatible?: string | null;
};

function normalizeToken(s: string): string {
  return s
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function firstFiveLetters(label: string): string {
  const clean = normalizeToken(label).replace(/[^A-Z]/g, '');
  return (clean.slice(0, 5) || 'STOCK').padEnd(5, 'X');
}

function labelWords(label: string): string[] {
  return label
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[\s\-_/]+/)
    .map((w) => normalizeToken(w))
    .filter((w) => w.length >= 2);
}

export function buildSkuFromInput(input: SkuInput): string {
  const words = labelWords(input.label);
  const prefix = words[0]?.slice(0, 5).padEnd(5, 'X') || firstFiveLetters(input.label);
  const parts: string[] = [];

  const type = input.paperType?.trim();
  if (type) {
    const t = normalizeToken(type);
    if (t.length <= 8) parts.push(t.slice(0, 8));
  }

  if (input.grammage?.trim()) {
    parts.push(normalizeToken(input.grammage.replace(/\s/g, '')));
  } else if (input.thickness?.trim()) {
    parts.push(normalizeToken(input.thickness));
  }

  if (input.color?.trim()) {
    parts.push(normalizeToken(input.color).slice(0, 8));
  }

  if (input.formatLabel?.trim()) {
    parts.push(normalizeToken(input.formatLabel));
  } else if (input.widthM != null && input.widthM > 0) {
    parts.push(`${Math.round(input.widthM * 100)}CM`);
  }

  if (input.characteristic?.trim()) {
    const c = normalizeToken(input.characteristic);
    if (/\d+ML/i.test(input.characteristic)) parts.push(c.replace(/ML$/, 'ML'));
    else if (/^[XSML]+$/i.test(c) && c.length <= 3) parts.push(c);
    else if (c.length <= 12) parts.push(c);
  }

  if (input.machineCompatible?.trim()) {
    const m = normalizeToken(input.machineCompatible).slice(0, 12);
    if (m && !parts.includes(m)) parts.push(m);
  }

  // Mots significatifs du nom (ex. Stylo Bic Cristal Bleu → BIC, BLEU)
  if (!type && words.length > 1) {
    for (const w of words.slice(1, 4)) {
      if (w.length >= 2 && w.length <= 8 && !parts.includes(w)) parts.push(w);
    }
  }

  if (input.stockKind === 'rouleau' && !parts.some((p) => p.includes('ROUL'))) {
    parts.push('ROUL');
  }

  const suffix = parts.filter(Boolean).join('-') || 'STD';
  return `${prefix}-${suffix}`.slice(0, 48);
}

export async function ensureUniqueSku(
  baseSku: string,
  exists: (sku: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(baseSku))) return baseSku;
  for (let i = 2; i <= 999; i++) {
    const candidate = `${baseSku}-${String(i).padStart(3, '0')}`.slice(0, 50);
    if (!(await exists(candidate))) return candidate;
  }
  return `${baseSku}-${Date.now()}`.slice(0, 50);
}

export { STOCK_CATEGORIES, type StockCategoryId } from '@/lib/data/stock-categories';

export function stockStatus(
  quantity: number,
  minQty: number,
  reservedQty = 0,
): 'ok' | 'critique' | 'rupture' {
  if (quantity <= 0) return 'rupture';
  const available = Math.max(0, quantity - (reservedQty ?? 0));
  if (available <= minQty) return 'critique';
  return 'ok';
}

export { computeMarginPct, computeNetBenefit, standardQuantity } from '@/lib/utils/stock-price';

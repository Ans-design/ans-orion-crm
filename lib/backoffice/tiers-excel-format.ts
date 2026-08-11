import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';

export const TIERS_EXCEL_COLUMNS = [
  'ARTICLE',
  'RÉFÉRENCE',
  'QTÉ MIN',
  'QTÉ MAX',
  'MODE',
  'VALEUR',
  'UNITÉ',
  'STATUT',
  'ID',
] as const;

function pick(line: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = line[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseNum(v: unknown): number | null {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function parseTierExcelRow(line: Record<string, unknown>, lineNo: number) {
  const idRaw = pick(line, 'ID', 'id', 'article_id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  // Format Admin classique OU Excel ANS_PALIERS_REMISE (article_id / min_piece / remise_pct)
  const articleId =
    pick(line, 'RÉFÉRENCE', 'Reference', 'articleId')
    || pick(line, 'ARTICLE', 'Article', 'article')
    || pick(line, 'article_id');
  const minQty = parseNum(line['QTÉ MIN'] ?? line.QteMin ?? line.minQty ?? line.min_piece);
  const maxQty = parseNum(line['QTÉ MAX'] ?? line.QteMax ?? line.maxQty ?? line.max_piece);
  const modeRaw = pick(line, 'MODE', 'Mode');
  const hasRemisePct = line.remise_pct != null && String(line.remise_pct).trim() !== '';
  const mode = modeRaw || (hasRemisePct ? 'percent' : 'unit_price');
  const value = parseNum(
    line.VALEUR ?? line.Valeur ?? line.value ?? line.remise_pct,
  );
  return {
    lineNo,
    excelRowId: excelRowId ?? null,
    technicalId: technicalId ?? null,
    articleId,
    articleLabel: pick(line, 'ARTICLE', 'Article', 'article'),
    minQty: minQty ?? 1,
    maxQty,
    mode,
    value,
    saleUnit: pick(line, 'UNITÉ', 'Unite', 'saleUnit') || null,
    active: !['inactif', 'non', '0', 'false'].includes(pick(line, 'STATUT', 'Statut').toLowerCase()),
  };
}

export function excelRowToTierCanonical(line: Record<string, unknown>): Record<string, unknown> {
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  return {
    RÉFÉRENCE: pick(line, 'RÉFÉRENCE', 'Reference', 'articleId'),
    ARTICLE: pick(line, 'ARTICLE', 'Article'),
    excelRowId: excelRowId ?? '',
    ID: technicalId ?? idRaw,
  };
}

export function validateTiersExcelRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return { ok: false, message: 'Fichier vide.' };
  const hasRef = rows.some((r) => String(r.RÉFÉRENCE ?? r.Reference ?? r.ARTICLE ?? '').trim());
  if (!hasRef) return { ok: false, message: 'Colonne RÉFÉRENCE ou ARTICLE introuvable.' };
  const hasTier = rows.some((r) => r['QTÉ MIN'] != null || r.QteMin != null || r.VALEUR != null);
  if (!hasTier) return { ok: false, message: 'Colonne QTÉ MIN ou VALEUR introuvable.' };
  return { ok: true, materialColumn: 'RÉFÉRENCE' };
}

export function tierLineToExcelRow(
  data: {
    articleLabel: string;
    articleId: string;
    minQty: number;
    maxQty?: number | null;
    mode: string;
    value?: number | null;
    saleUnit?: string;
    active?: boolean;
  },
  excelRowId?: string | null,
) {
  return {
    ARTICLE: data.articleLabel,
    RÉFÉRENCE: data.articleId,
    'QTÉ MIN': data.minQty,
    'QTÉ MAX': data.maxQty ?? '',
    MODE: data.mode,
    VALEUR: data.value ?? '',
    UNITÉ: data.saleUnit ?? '',
    STATUT: data.active !== false ? 'actif' : 'inactif',
    ID: excelRowId ?? '',
  };
}

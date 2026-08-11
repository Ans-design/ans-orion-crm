import { parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';

export const PRICING_ARTICLES_EXCEL_COLUMNS = [
  'TYPE',
  'ARTICLE',
  'RÉFÉRENCE',
  'TYPE PRIX',
  'VALEUR',
  'UNITÉ',
  'FORMULE',
  'PALIER',
  'QTÉ MIN',
  'QTÉ MAX',
  'MODE',
  'STATUT',
  'ID',
] as const;

const FORMULA_STATUS_WORDS = new Set(['published', 'draft', 'none', 'publié', 'brouillon', 'aucune']);

function pick(line: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = line[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseNum(v: unknown): number | null {
  const raw = String(v ?? '').trim();
  if (!raw) return null;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const CALC_MAP: Record<string, string> = {
  piece: 'piece',
  pièce: 'piece',
  m2: 'm2',
  'm²': 'm2',
  ml: 'ml',
  forfait: 'forfait',
  coefficient: 'coefficient',
};

export function detectPricingRowType(line: Record<string, unknown>): 'PRIX' | 'PALIER' | 'FORMULE' {
  const typeRaw = pick(line, 'TYPE', 'Type').toUpperCase();
  if (typeRaw === 'PALIER' || typeRaw === 'TIER') return 'PALIER';
  if (typeRaw === 'FORMULE' || typeRaw === 'FORMULA') return 'FORMULE';
  if (typeRaw === 'PRIX' || typeRaw === 'PRICE') return 'PRIX';

  if (line['QTÉ MIN'] != null || line.QteMin != null) return 'PALIER';

  const formule = pick(line, 'FORMULE', 'Formule');
  if (
    formule
    && !FORMULA_STATUS_WORDS.has(formule.toLowerCase())
    && !/^\d+\s*paliers?/i.test(formule)
    && (formule.includes('+') || formule.includes('*') || formule.includes('base') || formule.length > 12)
  ) {
    return 'FORMULE';
  }

  return 'PRIX';
}

export function parsePricingArticleExcelRow(line: Record<string, unknown>, lineNo: number) {
  const rowType = detectPricingRowType(line);
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  const articleId = pick(line, 'RÉFÉRENCE', 'Reference', 'articleId') || pick(line, 'ARTICLE', 'Article');
  const typeRaw = pick(line, 'TYPE PRIX', 'TypePrix', 'calculationType').toLowerCase();

  const base = {
    lineNo,
    rowType,
    excelRowId: excelRowId ?? null,
    technicalId: technicalId ?? null,
    articleId,
    articleLabel: pick(line, 'ARTICLE', 'Article'),
    publicationStatus: pick(line, 'STATUT', 'Statut') || 'draft',
  };

  if (rowType === 'PALIER') {
    const minQty = parseNum(line['QTÉ MIN'] ?? line.PALIER ?? line.QteMin);
    return {
      ...base,
      calculationType: 'piece',
      prixBase: null as number | null,
      saleUnit: pick(line, 'UNITÉ', 'Unite', 'saleUnit') || 'pièce',
      tierMinQty: minQty ?? 1,
      tierMaxQty: parseNum(line['QTÉ MAX'] ?? line.QteMax),
      tierMode: pick(line, 'MODE', 'Mode') || 'unit_price',
      tierValue: parseNum(line.VALEUR ?? line.Valeur),
      tierActive: !['inactif', 'non', '0', 'false'].includes(pick(line, 'STATUT', 'Statut').toLowerCase()),
    };
  }

  if (rowType === 'FORMULE') {
    return {
      ...base,
      calculationType: 'formula',
      prixBase: null as number | null,
      saleUnit: pick(line, 'UNITÉ', 'Unite', 'saleUnit') || 'pièce',
      formulaExpression: pick(line, 'FORMULE', 'Formule'),
      formulaStatus: pick(line, 'STATUT', 'Statut') || 'draft',
    };
  }

  return {
    ...base,
    calculationType: CALC_MAP[typeRaw] ?? (typeRaw || 'piece'),
    prixBase: parseNum(line.VALEUR ?? line.Valeur ?? line.prixBase),
    saleUnit: pick(line, 'UNITÉ', 'Unite', 'saleUnit') || 'pièce',
    tierMinQty: null as number | null,
    tierMaxQty: null as number | null,
    tierMode: null as string | null,
    tierValue: null as number | null,
    tierActive: true,
    formulaExpression: null as string | null,
    formulaStatus: null as string | null,
  };
}

export function excelRowToPricingArticleCanonical(line: Record<string, unknown>): Record<string, unknown> {
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  return {
    RÉFÉRENCE: pick(line, 'RÉFÉRENCE', 'Reference', 'articleId'),
    ARTICLE: pick(line, 'ARTICLE', 'Article'),
    excelRowId: excelRowId ?? '',
    ID: technicalId ?? idRaw,
  };
}

export type ParsedPricingExcelRow = ReturnType<typeof parsePricingArticleExcelRow>;

export function isPalierRow(row: ParsedPricingExcelRow): row is ParsedPricingExcelRow & {
  rowType: 'PALIER';
  tierMinQty: number;
  tierMaxQty: number | null;
  tierMode: string;
  tierValue: number | null;
  tierActive: boolean;
  saleUnit: string;
} {
  return row.rowType === 'PALIER';
}

export function isFormuleRow(row: ParsedPricingExcelRow): row is ParsedPricingExcelRow & {
  rowType: 'FORMULE';
  formulaExpression: string;
  formulaStatus: string | null;
} {
  return row.rowType === 'FORMULE' && 'formulaExpression' in row && Boolean(row.formulaExpression);
}

export function validatePricingArticlesExcelRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return { ok: false, message: 'Fichier vide.' };
  const hasRef = rows.some((r) => String(r.RÉFÉRENCE ?? r.Reference ?? r.ARTICLE ?? '').trim());
  if (!hasRef) return { ok: false, message: 'Colonne RÉFÉRENCE ou ARTICLE introuvable.' };
  return { ok: true, materialColumn: 'RÉFÉRENCE' };
}

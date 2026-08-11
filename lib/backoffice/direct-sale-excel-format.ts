import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';
import {
  normalizeDirectSaleStatus,
  parseBoolExcel,
  slugifyDirectSaleName,
} from '@/lib/direct-sale/categories';

function resolveExcelId(raw: string): string | null {
  const parsed = parseExcelIdColumn(raw);
  return parsed.excelRowId ?? parsed.technicalId ?? null;
}

export const DIRECT_SALE_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'CATÉGORIE',
  'SOUS-CATÉGORIE',
  'RÉFÉRENCE',
  'PRIX UNITAIRE',
  'UNITÉ',
  'QTÉ MIN',
  'QTÉ MAX',
  'MATIÈRE LIÉE',
  'PERSONNALISABLE',
  'DEVIS SI HORS STANDARD',
  'VISIBLE POS',
  'STATUT',
  'DÉTAIL',
] as const;

export type DirectSaleExcelColumn = (typeof DIRECT_SALE_EXCEL_COLUMNS)[number];
export type DirectSaleExcelRow = Record<DirectSaleExcelColumn, string | number>;

export function parseDirectSaleExcelRow(raw: Record<string, unknown>, line: number) {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k] ?? raw[k.toUpperCase()] ?? raw[k.toLowerCase()];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  };

  const name = pick('ARTICLE', 'article', 'name');
  if (!name) return { error: `Ligne ${line} : ARTICLE requis` as const };

  const priceRaw = pick(
    'PRIX UNITAIRE',
    'prix unitaire',
    'PRIX UNITAIRE MAX (Ar)',
    'PRIX UNITAIRE MAX',
    'prix unitaire max (ar)',
  );
  const unitPrice = Number(String(priceRaw).replace(/\s/g, '').replace(',', '.'));
  const minQty = parseInt(pick('QTÉ MIN', 'qte min', 'QTÉ MIN'), 10);
  const maxRaw = pick('QTÉ MAX', 'qte max');
  const maxQty = maxRaw ? parseInt(maxRaw, 10) : null;
  const typePrix = pick('TYPE PRIX', 'type prix');
  const detailPos = pick('DÉTAIL POS', 'DÉTAIL', 'detail', 'description');
  const description = [typePrix ? `Type: ${typePrix}` : '', detailPos].filter(Boolean).join(' — ') || null;
  const excelIdRaw = pick('ID', 'id');
  const requiresQuote =
    typePrix.toLowerCase().includes('devis')
    || parseBoolExcel(pick('DEVIS SI HORS STANDARD', 'devis si hors standard') || 'oui');

  return {
    row: {
      excelId: resolveExcelId(excelIdRaw) ?? (excelIdRaw || null),
      name,
      slug: slugifyDirectSaleName(name),
      category: pick('CATÉGORIE', 'categorie', 'category') || 'petit_format',
      subCategory: pick('SOUS-CATÉGORIE', 'sous-categorie') || null,
      reference: pick('RÉFÉRENCE', 'reference') || excelIdRaw || null,
      description,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      unit: pick('UNITÉ', 'unite', 'unit') || 'pièce',
      minQuantity: Number.isFinite(minQty) && minQty > 0 ? minQty : 1,
      maxQuantity: maxQty != null && Number.isFinite(maxQty) ? maxQty : null,
      materialKey: pick('MATIÈRE LIÉE', 'matiere liee') || null,
      isCustomizable: parseBoolExcel(pick('PERSONNALISABLE', 'personnalisable') || 'oui'),
      requiresQuoteIfCustom: requiresQuote,
      visiblePOS: parseBoolExcel(pick('VISIBLE POS', 'visible pos') || 'oui'),
      status: normalizeDirectSaleStatus(pick('STATUT', 'statut')),
    },
  };
}

export function directSaleToExcelRow(
  article: {
    excelId?: string | null;
    name: string;
    category: string;
    subCategory?: string | null;
    reference?: string | null;
    unitPrice: number;
    unit: string;
    minQuantity: number;
    maxQuantity?: number | null;
    materialKey?: string | null;
    isCustomizable: boolean;
    requiresQuoteIfCustom: boolean;
    visiblePOS: boolean;
    status: string;
    description?: string | null;
  },
  excelRowId?: string | null,
): DirectSaleExcelRow {
  const id = excelRowId ?? article.excelId;
  return {
    ID: id && /^\d+$/.test(id) ? formatExcelRowId(parseInt(id, 10)) : (id ?? ''),
    ARTICLE: article.name,
    'CATÉGORIE': article.category,
    'SOUS-CATÉGORIE': article.subCategory ?? '',
    RÉFÉRENCE: article.reference ?? '',
    'PRIX UNITAIRE': article.unitPrice,
    UNITÉ: article.unit,
    'QTÉ MIN': article.minQuantity,
    'QTÉ MAX': article.maxQuantity ?? '',
    'MATIÈRE LIÉE': article.materialKey ?? '',
    PERSONNALISABLE: article.isCustomizable ? 'oui' : 'non',
    'DEVIS SI HORS STANDARD': article.requiresQuoteIfCustom ? 'oui' : 'non',
    'VISIBLE POS': article.visiblePOS ? 'oui' : 'non',
    STATUT: article.status === 'published' ? 'publié' : article.status === 'archived' ? 'archivé' : 'brouillon',
    DÉTAIL: article.description ?? '',
  };
}

export const DIRECT_SALE_TIER_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'RÉFÉRENCE ARTICLE',
  'QTÉ MIN',
  'QTÉ MAX',
  'TYPE REMISE',
  'VALEUR REMISE',
  'PRIX UNITAIRE FINAL',
  'ACTIF',
  'DÉTAIL',
] as const;

export function parseDirectSaleTierExcelRow(raw: Record<string, unknown>, line: number) {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k] ?? raw[k.toUpperCase()];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  };

  const articleName = pick('ARTICLE', 'article');
  const articleRef = pick(
    'RÉFÉRENCE ARTICLE',
    'reference article',
    'RÉFÉRENCE',
    'ID ARTICLE',
    'id article',
  );
  if (!articleName && !articleRef) {
    return { error: `Ligne ${line} : ARTICLE ou RÉFÉRENCE ARTICLE / ID ARTICLE requis` as const };
  }

  const minQty = parseInt(pick('QTÉ MIN', 'qte min'), 10) || 1;
  const maxRaw = pick('QTÉ MAX', 'qte max');
  const discountTypeRaw = pick('TYPE REMISE', 'type remise').toLowerCase();
  let discountType = 'percent';
  if (discountTypeRaw.includes('unit') || discountTypeRaw.includes('prix')) discountType = 'unit_price';
  else if (discountTypeRaw.includes('fix')) discountType = 'fixed';

  const remisePctRaw = pick('REMISE %', 'remise %', 'VALEUR REMISE', 'valeur remise');
  const finalRaw = pick(
    'PRIX UNITAIRE FINAL (Ar)',
    'PRIX UNITAIRE FINAL',
    'prix unitaire final (ar)',
    'prix unitaire final',
  );
  const finalUnitPrice = finalRaw ? Number(String(finalRaw).replace(/\s/g, '').replace(',', '.')) : null;
  let discountValue = Number(String(remisePctRaw).replace(',', '.')) || 0;
  // Feuille ORION : REMISE % souvent en fraction (0.1 = 10 %)
  if (discountType === 'percent' && discountValue > 0 && discountValue < 1) {
    discountValue = Math.round(discountValue * 10000) / 100;
  }
  if (discountType === 'unit_price' && !discountValue && finalUnitPrice != null) {
    discountValue = finalUnitPrice;
  }

  const variante = pick('VARIANTE / MATIÈRE / FORMAT', 'variante');
  const note = pick('NOTE', 'DÉTAIL', 'detail');
  const label = [variante && variante !== 'Standard' ? variante : '', note].filter(Boolean).join(' — ') || null;

  return {
    row: {
      excelId: resolveExcelId(pick('ID')) ?? (pick('ID') || null),
      articleName,
      articleRef: articleRef || null,
      minQty,
      maxQty: maxRaw ? parseInt(maxRaw, 10) : null,
      discountType,
      discountValue,
      finalUnitPrice: finalUnitPrice != null && Number.isFinite(finalUnitPrice) ? finalUnitPrice : null,
      label,
      active: parseBoolExcel(pick('ACTIF', 'actif') || 'oui'),
    },
  };
}

export type DirectSaleTierExcelColumn = (typeof DIRECT_SALE_TIER_EXCEL_COLUMNS)[number];
export type DirectSaleTierExcelRow = Record<DirectSaleTierExcelColumn, string | number>;

function tierDiscountTypeLabel(type: string): string {
  if (type === 'unit_price') return 'prix_unitaire';
  if (type === 'fixed') return 'fixe';
  return 'pourcentage';
}

export function directSaleTierToExcelRow(
  tier: {
    excelId?: string | null;
    minQty: number;
    maxQty?: number | null;
    discountType: string;
    discountValue: number;
    finalUnitPrice?: number | null;
    label?: string | null;
    active: boolean;
  },
  article: {
    name: string;
    reference?: string | null;
    excelId?: string | null;
  },
  excelRowId?: string | null,
): DirectSaleTierExcelRow {
  const id = excelRowId ?? tier.excelId;
  return {
    ID: id && /^\d+$/.test(id) ? formatExcelRowId(parseInt(id, 10)) : (id ?? ''),
    ARTICLE: article.name,
    'RÉFÉRENCE ARTICLE': article.reference ?? '',
    'QTÉ MIN': tier.minQty,
    'QTÉ MAX': tier.maxQty ?? '',
    'TYPE REMISE': tierDiscountTypeLabel(tier.discountType),
    'VALEUR REMISE': tier.discountValue,
    'PRIX UNITAIRE FINAL': tier.finalUnitPrice ?? '',
    ACTIF: tier.active ? 'oui' : 'non',
    DÉTAIL: tier.label ?? '',
  };
}

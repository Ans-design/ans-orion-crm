import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';
import type { ChipArticleSummary } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import {
  canonicalFamilyLabel,
  normalizeCategoryId,
  suggestCorrectCategory,
} from '@/lib/pos/article-category-taxonomy';

export const CATALOGUE_POS_EXCEL_COLUMNS = [
  'ID',
  'ARTICLE',
  'CATÉGORIE',
  'FAMILLE',
  'TYPE ARTICLE',
  'MODE PRIX',
  'SOURCE PRIX',
  'MATIÈRE LIÉE',
  'VISIBLE POS',
  'STATUT',
  'RÉFÉRENCE',
  'DÉTAIL',
] as const;

/** Colonnes export-only — ignorées à l'import (compteurs / dérivés). */
export const CATALOGUE_POS_EXPORT_ONLY_COLUMNS = ['DÉTAIL'] as const;

export type CataloguePosExcelRow = Record<(typeof CATALOGUE_POS_EXCEL_COLUMNS)[number], string | number | boolean>;

export function catalogueArticleToExcel(
  row: ChipArticleSummary & {
    priceMode?: string | null;
    articleType?: string | null;
    detail?: string | null;
  },
  excelRowId?: string | null,
): CataloguePosExcelRow {
  const id = excelRowId
    ? (/^\d+$/.test(excelRowId) ? formatExcelRowId(parseInt(excelRowId, 10)) : excelRowId)
    : '';
  const categoryId =
    normalizeCategoryId(row.category)
    ?? normalizeCategoryId(row.family)
    ?? suggestCorrectCategory({
      articleId: row.articleId,
      name: row.articleLabel,
      family: row.family,
      category: row.category,
    });
  return {
    ID: id,
    ARTICLE: row.articleLabel,
    CATÉGORIE: canonicalFamilyLabel(categoryId),
    FAMILLE: row.family || canonicalFamilyLabel(categoryId),
    'TYPE ARTICLE': row.articleType ?? row.category ?? categoryId,
    'MODE PRIX': row.priceMode ?? '',
    'SOURCE PRIX': (row as { priceSource?: string }).priceSource ?? row.dataSource ?? '',
    'MATIÈRE LIÉE': (row as { linkedMaterial?: string }).linkedMaterial ?? '',
    'VISIBLE POS': row.visiblePos ? 'oui' : 'non',
    STATUT: row.status,
    RÉFÉRENCE: row.articleId,
    DÉTAIL: row.detail ?? (row.anomalyCount > 0 ? `${row.anomalyCount} anomalie(s)` : ''),
  };
}

export function excelRowToCatalogueCanonical(line: Record<string, unknown>): Record<string, unknown> {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = line[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return typeof v === 'string' ? v.trim() : v;
      }
    }
    return '';
  };
  const idRaw = pick('ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  return {
    ID: technicalId ?? '',
    ARTICLE: pick('ARTICLE', 'Article', 'article'),
    CATÉGORIE: pick('CATÉGORIE', 'Categorie', 'category'),
    FAMILLE: pick('FAMILLE', 'Famille', 'family'),
    'TYPE ARTICLE': pick('TYPE ARTICLE', 'Type article', 'articleType'),
    'MODE PRIX': pick('MODE PRIX', 'Mode prix', 'priceMode'),
    'SOURCE PRIX': pick('SOURCE PRIX', 'Source prix', 'priceSource'),
    'MATIÈRE LIÉE': pick('MATIÈRE LIÉE', 'Matière liée', 'linkedMaterial'),
    'VISIBLE POS': pick('VISIBLE POS', 'Visible POS', 'visiblePos', 'POS'),
    STATUT: pick('STATUT', 'Statut', 'status'),
    RÉFÉRENCE: pick('RÉFÉRENCE', 'Référence', 'reference', 'articleId'),
    DÉTAIL: pick('DÉTAIL', 'Detail', 'detail'),
    ACTIF: pick('ACTIF', 'Actif', 'active'),
    excelRowId: excelRowId ?? '',
  };
}

function parseOuiNon(v: unknown, defaultVal: boolean): boolean {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return defaultVal;
  return t === 'oui' || t === '1' || t === 'true' || t === 'x';
}

export function parseCatalogueExcelRow(line: Record<string, unknown>, lineNo: number) {
  const norm = excelRowToCatalogueCanonical(line);
  const categoryRaw = String(norm.CATÉGORIE ?? norm.FAMILLE ?? '').trim();
  const categoryId = normalizeCategoryId(categoryRaw)
    ?? suggestCorrectCategory({
      articleId: String(norm.RÉFÉRENCE ?? '').trim(),
      name: String(norm.ARTICLE ?? '').trim(),
      family: categoryRaw,
    });
  return {
    lineNo,
    articleLabel: String(norm.ARTICLE ?? '').trim(),
    articleId: String(norm.RÉFÉRENCE ?? norm.ID ?? '').trim(),
    excelRowId: String(norm.excelRowId ?? '').trim(),
    family: canonicalFamilyLabel(categoryId),
    category: categoryId,
    active: parseOuiNon(norm.ACTIF, true),
    visiblePos: parseOuiNon(norm['VISIBLE POS'], true),
    status: String(norm.STATUT ?? '').trim(),
    articleType: String(norm['TYPE ARTICLE'] ?? '').trim(),
    priceMode: String(norm['MODE PRIX'] ?? '').trim(),
    hadExportOnlyColumns: CATALOGUE_POS_EXPORT_ONLY_COLUMNS.some(
      (col) => line[col] !== undefined && line[col] !== null && String(line[col]).trim() !== '',
    ),
  };
}

export function validateCataloguePosExcelRows(rows: Record<string, unknown>[]) {
  if (!rows.length) {
    return { ok: false, message: 'Fichier vide.' };
  }
  const canonical = rows.map(excelRowToCatalogueCanonical);
  const ok = canonical.some((r) => String(r.ARTICLE ?? '').trim() || String(r.RÉFÉRENCE ?? '').trim());
  if (!ok) {
    return { ok: false, message: 'Colonnes ARTICLE ou RÉFÉRENCE introuvables.' };
  }
  return { ok: true, materialColumn: 'ARTICLE' };
}

/**
 * Contrat Excel Options / Chips — Administration.
 */
import { formatExcelRowId, isTechnicalDbId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';

export const CHIPS_EXCEL_COLUMNS = [
  'ARTICLE',
  'BLOC',
  'CHAMP',
  'LIBELLÉ',
  'TYPE',
  'ACTIF',
  'VISIBLE POS',
  'IMPACT PRIX',
  'ORDRE',
  'SOURCE',
  'ID',
] as const;

export type ChipsExcelColumn = (typeof CHIPS_EXCEL_COLUMNS)[number];
export type ChipsExcelRow = Record<ChipsExcelColumn, string | number | boolean>;

export function chipRowToExcel(
  row: {
    articleLabel?: string;
    blockLabel?: string;
    blockKey?: string;
    fieldKey?: string;
    label?: string;
    fieldType?: string;
    active?: boolean;
    visiblePos?: boolean;
    impactsPrice?: boolean;
    sortOrder?: number;
    source?: string;
    id?: string;
    groupId?: string;
    excelRowId?: string | null;
  },
  excelRowId?: string | null,
): ChipsExcelRow {
  const id = excelRowId
    ? (/^\d+$/.test(excelRowId) ? formatExcelRowId(parseInt(excelRowId, 10)) : excelRowId)
    : '';
  return {
    ARTICLE: row.articleLabel ?? '',
    BLOC: row.blockLabel ?? row.blockKey ?? '',
    CHAMP: row.fieldKey ?? '',
    LIBELLÉ: row.label ?? '',
    TYPE: row.fieldType ?? 'select',
    ACTIF: row.active ? 'oui' : 'non',
    'VISIBLE POS': row.visiblePos ? 'oui' : 'non',
    'IMPACT PRIX': row.impactsPrice ? 'oui' : 'non',
    ORDRE: row.sortOrder ?? 0,
    SOURCE: row.source ?? '',
    ID: id,
  };
}

export function excelRowToChipCanonical(line: Record<string, unknown>): Record<string, unknown> {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = line[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return typeof v === 'string' ? v.trim() : v;
      }
    }
    return '';
  };

  const idRaw = pick('ID', 'id', 'Id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);

  return {
    ARTICLE: pick('ARTICLE', 'Article', 'article'),
    RÉFÉRENCE: pick('RÉFÉRENCE', 'Reference', 'reference', 'articleId'),
    BLOC: pick('BLOC', 'Bloc', 'blockKey', 'block'),
    CHAMP: pick('CHAMP', 'Champ', 'fieldKey', 'field'),
    LIBELLÉ: pick('LIBELLÉ', 'Libellé', 'Libelle', 'label'),
    TYPE: pick('TYPE', 'Type', 'fieldType'),
    ACTIF: pick('ACTIF', 'Actif', 'active'),
    'VISIBLE POS': pick('VISIBLE POS', 'Visible POS', 'visiblePos', 'POS'),
    'IMPACT PRIX': pick('IMPACT PRIX', 'Impact prix', 'impactsPrice', 'Prix'),
    ORDRE: pick('ORDRE', 'Ordre', 'sortOrder'),
    INDICATIF: pick('INDICATIF', 'Indicatif'),
    MONTANT: pick('MONTANT', 'Montant'),
    SOURCE: pick('SOURCE', 'Source', 'source'),
    ID: technicalId ?? '',
    excelRowId: excelRowId ?? '',
  };
}

function parseOuiNon(v: unknown, defaultVal = false): boolean {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return defaultVal;
  return t === 'oui' || t === '1' || t === 'true' || t === 'x' || t === 'yes';
}

export function parseChipExcelRow(line: Record<string, unknown>, lineNo: number) {
  const norm = excelRowToChipCanonical(line);
  return {
    lineNo,
    articleLabel: String(norm.ARTICLE ?? norm.RÉFÉRENCE ?? '').trim(),
    articleReference: String(norm.RÉFÉRENCE ?? '').trim(),
    blockKey: String(norm.BLOC ?? '').trim(),
    fieldKey: String(norm.CHAMP ?? '').trim(),
    label: String(norm.LIBELLÉ ?? '').trim(),
    fieldType: String(norm.TYPE ?? 'select').trim() || 'select',
    active: parseOuiNon(norm.ACTIF, true),
    visiblePos: parseOuiNon(norm['VISIBLE POS'], true),
    impactsPrice: parseOuiNon(norm['IMPACT PRIX'], false),
    sortOrder: Number(norm.ORDRE) || 0,
    source: String(norm.SOURCE ?? '').trim(),
    excelRowId: String(norm.excelRowId ?? '').trim(),
    technicalId: String(norm.ID ?? '').trim(),
    groupId: isTechnicalDbId(String(norm.ID ?? '')) ? String(norm.ID) : '',
    indicatif: norm.INDICATIF !== '' ? parseOuiNon(norm.INDICATIF, false) : undefined,
    montant: norm.MONTANT !== '' && norm.MONTANT != null ? Number(norm.MONTANT) : undefined,
  };
}

export function validateChipsExcelRows(rows: Record<string, unknown>[]): {
  ok: boolean;
  message?: string;
  materialColumn?: string;
} {
  if (!rows.length) {
    return { ok: false, message: 'Fichier vide ou sans données après la ligne d\'en-têtes.' };
  }
  const canonical = rows.map(excelRowToChipCanonical);
  const withArticle = canonical.filter((r) => String(r.ARTICLE ?? '').trim() !== '').length;
  const withField = canonical.filter((r) => String(r.CHAMP ?? '').trim() !== '').length;
  if (withArticle === 0 && withField === 0) {
    return {
      ok: false,
      message: 'Colonnes ARTICLE ou CHAMP introuvables — vérifiez le modèle Excel.',
    };
  }
  return { ok: true, materialColumn: 'ARTICLE' };
}

export function emptyChipsExcelTemplate(): ChipsExcelRow[] {
  return [
    chipRowToExcel({
      articleLabel: 'Exemple article',
      blockLabel: 'Matière',
      fieldKey: 'matiere',
      label: 'Papier couché',
      fieldType: 'select',
      active: true,
      visiblePos: true,
      impactsPrice: true,
      sortOrder: 1,
      source: 'manuel',
    }, '001'),
  ];
}

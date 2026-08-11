import type { PricingVariableRow } from '@/lib/server/modules/backoffice-v2/admin-backoffice-pricing.types';

export const VARIABLES_EXCEL_COLUMNS = [
  'ARTICLE',
  'RÉFÉRENCE',
  'BLOC',
  'CHAMP',
  'LIBELLÉ',
  'IMPACT PRIX',
  'INDICATIF',
  'POS',
  'MONTANT',
  'SOURCE',
  'ID',
] as const;

export function pricingVariableToExcelRow(row: PricingVariableRow, excelRowId?: string | null) {
  return {
    ARTICLE: row.articleLabel,
    RÉFÉRENCE: row.articleId,
    BLOC: row.blockLabel,
    CHAMP: row.fieldKey,
    LIBELLÉ: row.label,
    'IMPACT PRIX': row.impactsPrice ? 'oui' : 'non',
    INDICATIF: row.isInformational ? 'oui' : 'non',
    POS: row.visiblePos ? 'oui' : 'non',
    MONTANT: row.priceModifier ?? '',
    SOURCE: row.source,
    ID: excelRowId ?? '',
  };
}

export function validateVariablesExcelRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return { ok: false, message: 'Fichier vide.' };
  const hasField = rows.some((r) => String(r.CHAMP ?? r.Champ ?? '').trim());
  const hasRef = rows.some((r) => String(r.RÉFÉRENCE ?? r.Reference ?? '').trim());
  if (!hasField) return { ok: false, message: 'Colonne CHAMP introuvable.' };
  if (!hasRef) return { ok: false, message: 'Colonne RÉFÉRENCE introuvable.' };
  return { ok: true, materialColumn: 'CHAMP' };
}

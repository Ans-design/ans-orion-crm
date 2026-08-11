import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';
import {
  deriveMaterialTableFields,
  type CharacteristicType,
} from '@/lib/backoffice/material-table-fields';

const TYPE_ORDER: Record<CharacteristicType, number> = {
  grammage: 1,
  epaisseur: 2,
  laize: 3,
  format: 4,
  taille: 5,
  face: 6,
  finition: 7,
  couleur: 8,
  autre: 9,
};

const FORMAT_ORDER = ['A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0'];
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'XXXL'];

function parseCharacteristicNumber(displayValue: string): number {
  const n = Number(displayValue.replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function getCharacteristicSortKey(row: MaterialPriceUnifiedRow): [number, number, string] {
  const fields = deriveMaterialTableFields(row);
  const char = fields.mainCharacteristic;
  if (!char) return [99, 0, ''];

  const typeOrder = TYPE_ORDER[char.type] ?? 99;
  let numOrder = 0;

  if (char.type === 'grammage' || char.type === 'epaisseur' || char.type === 'laize') {
    numOrder = parseCharacteristicNumber(char.displayValue);
  } else if (char.type === 'format') {
    const idx = FORMAT_ORDER.indexOf(char.displayValue.toUpperCase());
    numOrder = idx >= 0 ? idx : 999;
  } else if (char.type === 'taille') {
    const idx = SIZE_ORDER.indexOf(char.displayValue.toUpperCase());
    numOrder = idx >= 0 ? idx : 999;
  }

  return [typeOrder, numOrder, char.displayValue];
}

export type MaterialRowSortMode =
  | 'name-asc'
  | 'name-desc'
  | 'family-asc'
  | 'price-asc'
  | 'price-desc'
  | 'logical';

function incompleteRank(row: MaterialPriceUnifiedRow): number {
  return deriveMaterialTableFields(row).isIncompleteName ? 1 : 0;
}

/** Tri métier : matière → type caractéristique → valeur numérique */
export function compareMaterialRows(
  a: MaterialPriceUnifiedRow,
  b: MaterialPriceUnifiedRow,
  mode: MaterialRowSortMode = 'logical',
): number {
  const fa = deriveMaterialTableFields(a);
  const fb = deriveMaterialTableFields(b);

  const inc = incompleteRank(a) - incompleteRank(b);
  if (inc !== 0) return inc;

  if (mode === 'family-asc') {
    const fam = (fa.family ?? '').localeCompare(fb.family ?? '', 'fr');
    if (fam !== 0) return fam;
  }

  if (mode === 'price-asc') {
    const diff = (a.basePrintPrice ?? 0) - (b.basePrintPrice ?? 0);
    if (diff !== 0) return diff;
  } else if (mode === 'price-desc') {
    const diff = (b.basePrintPrice ?? 0) - (a.basePrintPrice ?? 0);
    if (diff !== 0) return diff;
  }

  const nameCmp = fa.materialName.localeCompare(fb.materialName, 'fr', { sensitivity: 'base' });
  if (mode === 'name-desc') {
    if (nameCmp !== 0) return -nameCmp;
  } else if (nameCmp !== 0) {
    return nameCmp;
  }

  const [ta, na, da] = getCharacteristicSortKey(a);
  const [tb, nb, db] = getCharacteristicSortKey(b);
  if (ta !== tb) return ta - tb;
  if (na !== nb) return na - nb;
  return da.localeCompare(db, 'fr', { numeric: true });
}

export function sortMaterialRows<T extends MaterialPriceUnifiedRow>(
  rows: T[],
  mode: MaterialRowSortMode = 'logical',
): T[] {
  return [...rows].sort((a, b) => compareMaterialRows(a, b, mode));
}

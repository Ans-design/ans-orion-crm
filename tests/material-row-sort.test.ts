import { describe, expect, it } from 'vitest';
import { compareMaterialRows } from '@/lib/backoffice/material-row-sort';
import { isMaterialRowToVerify } from '@/lib/backoffice/material-table-fields';
import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';

function row(partial: Partial<MaterialPriceUnifiedRow> & { id: string; name: string }): MaterialPriceUnifiedRow {
  const { id, name, ...rest } = partial;
  return {
    id,
    name,
    family: 'Papier',
    grammage: null,
    thickness: null,
    format: null,
    unit: null,
    unitDisplay: null,
    unitStandard: null,
    conversionFactor: null,
    stockItemId: null,
    stockAvailable: null,
    stockThreshold: null,
    purchasePrice: null,
    basePrintPrice: null,
    blankSellPrice: null,
    maxPrice: null,
    marginTarget: null,
    marginMin: null,
    active: true,
    visiblePOS: true,
    commercialUsage: 'used_by_pos_products',
    impactsPrice: true,
    impactsStock: true,
    archived: false,
    source: 'test',
    linkedArticlesCount: 0,
    anomaliesCount: 0,
    materialKey: name,
    publicationStatus: 'draft',
    anomalies: [],
    articleId: null,
    articleName: null,
    formatLabel: null,
    face: null,
    basePrintingPriceId: null,
    rowKind: 'material',
    ...rest,
  };
}

describe('compareMaterialRows', () => {
  it('trie les grammages numériquement sous le même nom', () => {
    const a = row({ id: '1', name: 'Glossy 120g', grammage: '120g' });
    const b = row({ id: '2', name: 'Glossy 250g', grammage: '250g' });
    const c = row({ id: '3', name: 'Glossy 140g', grammage: '140g' });
    const sorted = [b, a, c].sort((x, y) => compareMaterialRows(x, y, 'logical'));
    expect(sorted.map((r) => r.grammage)).toEqual(['120g', '140g', '250g']);
  });

  it('place À compléter en fin de liste', () => {
    const ok = row({ id: '1', name: 'Glossy 120g', grammage: '120g' });
    const incomplete = row({ id: '2', name: 'Matière article', grammage: 'Recto', face: 'Recto' });
    expect(compareMaterialRows(ok, incomplete, 'logical')).toBeLessThan(0);
  });
});

describe('isMaterialRowToVerify', () => {
  it('détecte nom incomplet, stock non lié et anomalies', () => {
    expect(isMaterialRowToVerify(row({ id: '1', name: 'Glossy 120g' }))).toBe(true);
    expect(isMaterialRowToVerify(row({ id: '2', name: 'Glossy 120g', stockItemId: 'stk-1' }))).toBe(false);
    expect(isMaterialRowToVerify(row({ id: '3', name: 'Matière article' }))).toBe(true);
    expect(isMaterialRowToVerify(row({ id: '4', name: 'Glossy', anomaliesCount: 2 }))).toBe(true);
  });
});

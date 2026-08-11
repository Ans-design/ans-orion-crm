import { describe, expect, it } from 'vitest';
import {
  aggregateMaterialGroups,
  formatPriceSummary,
  formatVariantSummary,
} from '@/lib/backoffice/material-group-aggregate';
import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';

function row(partial: Partial<MaterialPriceUnifiedRow> & { id: string; name: string }): MaterialPriceUnifiedRow {
  return {
    articleId: null,
    articleName: null,
    formatLabel: null,
    face: null,
    basePrintingPriceId: null,
    rowKind: 'material',
    family: 'Petit format',
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
    basePrintPrice: 1000,
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
    materialKey: 'glossy',
    publicationStatus: 'draft',
    anomalies: [],
    ...partial,
  };
}

describe('material-group-aggregate', () => {
  it('agrège Glossy en une seule ligne de base', () => {
    const groups = aggregateMaterialGroups([
      row({ id: '1', name: 'Glossy 120g', grammage: '120g', materialKey: 'glossy' }),
      row({ id: '2', name: 'Glossy 160g', grammage: '160g', materialKey: 'glossy' }),
      row({ id: '3', name: 'Glossy 250g', grammage: '250g', materialKey: 'glossy', basePrintPrice: null }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.variantCount).toBe(3);
    expect(groups[0]!.missingPriceCount).toBe(1);
  });

  it('formate résumés déclinaisons et prix', () => {
    expect(formatVariantSummary(['120g', '160g', '250g', '300g', '350g'], 3)).toBe('120g · 160g · 250g +2');
    expect(formatPriceSummary(2, 1)).toBe('2 prix · 1 manquant');
  });
});

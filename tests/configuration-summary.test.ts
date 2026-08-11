import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '@/lib/data/catalogue';
import { getProductConfig } from '@/lib/data/config-types';
import {
  buildConfigurationSummaryRows,
  collectMissingFieldLabels,
  formatMissingFieldsShort,
} from '@/lib/pos/configuration-summary';

describe('configuration-summary', () => {
  const flyer = CATALOGUE.find((a) => a.id === 'fly-std')!;

  it('lists core product rows', () => {
    const rows = buildConfigurationSummaryRows({
      article: flyer,
      config: { quantite: 100 },
      productConfig: getProductConfig(flyer.id),
      quantity: 100,
    });
    expect(rows.some((r) => r.key === 'produit' && r.complete)).toBe(true);
    expect(rows.some((r) => r.key === 'quantite' && r.value === '100')).toBe(true);
  });

  it('collects missing required fields', () => {
    const pc = getProductConfig(flyer.id);
    const missing = collectMissingFieldLabels(pc, {});
    expect(missing.length).toBeGreaterThan(0);
  });

  it('expose priceImpactBadge descriptif sur couleur_doypack', () => {
    const doypack = CATALOGUE.find((a) => a.id === 'pkg-doypack')!;
    const rows = buildConfigurationSummaryRows({
      article: doypack,
      config: { couleur_doypack: 'Blanc' },
      productConfig: getProductConfig(doypack.id),
      quantity: 500,
    });
    const couleur = rows.find((r) => r.key === 'couleur_doypack');
    expect(couleur?.priceImpactBadge).toBe('Descriptif');
  });

  it('formats short missing list', () => {
    expect(formatMissingFieldsShort(['Format', 'Matière', 'Quantité'], 2)).toContain('(+1)');
  });
});

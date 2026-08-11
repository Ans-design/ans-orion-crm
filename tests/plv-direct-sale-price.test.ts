import { describe, expect, it, beforeEach } from 'vitest';
import {
  setPlvDirectSaleRuntimeParams,
  resolvePlvDirectSaleFlatPrice,
} from '@/lib/pricing/plv-direct-sale-runtime';
import { computePlvPrice } from '@/lib/pricing/plv-pricing';

describe('PLV DirectSale price overrides', () => {
  beforeEach(() => {
    setPlvDirectSaleRuntimeParams({
      overrides: [
        {
          sourceRef: 'AVD008',
          articleId: 'plv-rollup',
          type: 'Roll-up standard',
          format: '80×200 cm',
          unitPrice: 150_000,
        },
        {
          sourceRef: 'AVD009',
          articleId: 'plv-rollup',
          type: 'Roll-up deluxe / premium',
          format: '85×200 cm',
          unitPrice: 250_000,
        },
        {
          sourceRef: 'AVD011',
          articleId: 'plv-xbanner',
          type: 'X-Banner standard',
          format: '80×200 cm',
          unitPrice: 85_000,
        },
      ],
      prixBaseByArticle: {
        'plv-rollup': 150_000,
        'plv-xbanner': 85_000,
      },
    });
  });

  it('résout le prix flat par type+format', () => {
    const hit = resolvePlvDirectSaleFlatPrice('plv-rollup', {
      type: 'Roll-up standard',
      format: '80×200 cm',
    });
    expect(hit?.unitPrice).toBe(150_000);
    expect(hit?.sourceRef).toBe('AVD008');
  });

  it('fallback type seul si format différent', () => {
    const hit = resolvePlvDirectSaleFlatPrice('plv-rollup', {
      type: 'Roll-up deluxe / premium',
      format: 'autre',
    });
    expect(hit?.unitPrice).toBe(250_000);
  });

  it('computePlvPrice utilise le prix DirectSale AVD008', () => {
    const r = computePlvPrice(
      'plv-rollup',
      { type: 'Roll-up standard', format: '80×200 cm', matiere: 'Bâche' },
      1,
    );
    expect(r.calculable).toBe(true);
    expect(r.prixUnitaire).toBe(150_000);
    expect(r.formula).toContain('AVD008');
  });

  it('computePlvPrice X-Banner AVD011', () => {
    const r = computePlvPrice(
      'AVD011',
      { type: 'X-Banner standard', format: '80×200 cm', matiere: 'Bâche' },
      1,
    );
    expect(r.calculable).toBe(true);
    expect(r.prixUnitaire).toBe(85_000);
  });

  it('sans override → formule m² (pas de flat DirectSale)', () => {
    setPlvDirectSaleRuntimeParams(null);
    const r = computePlvPrice(
      'plv-rollup',
      { type: 'Roll-up mini', format: '60×160 cm', matiere: 'Bâche', grammage: '440g' },
      1,
    );
    expect(r.formula?.includes('directSale')).toBeFalsy();
  });
});

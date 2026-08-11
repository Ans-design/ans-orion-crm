import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GF_ADMIN_PRICING,
  getGfAdminPricing,
  normalizeGfAdminPricing,
  setGfAdminPricingRuntime,
} from '@/lib/grand-format/gf-admin-config';
import { evaluateBache } from '@/lib/grand-format/bache-rules';

describe('gf admin pricing runtime', () => {
  it('normalize merge defaults', () => {
    const n = normalizeGfAdminPricing({ ourletPerMlAr: 2000 });
    expect(n.ourletPerMlAr).toBe(2000);
    expect(n.eyeletUnitPriceAr).toBe(DEFAULT_GF_ADMIN_PRICING.eyeletUnitPriceAr);
  });

  it('runtime override impacte evaluateBache ourlet', () => {
    setGfAdminPricingRuntime({
      ...DEFAULT_GF_ADMIN_PRICING,
      ourletPerMlAr: 3000,
    });
    expect(getGfAdminPricing().ourletPerMlAr).toBe(3000);

    const ev = evaluateBache(
      {
        type_bache: 'Bâche PVC standard',
        grammage: '440g',
        format: 'Format personnalisé',
        longueur_cm: 100,
        largeur_cm: 100,
        laize: '150 cm',
        dos: 'Dos blanc',
        qty: 1,
        bache_finitions: { ourlet: true },
      },
      { prixM2: 20000 },
    );
    // périmètre 4 m × 3000
    expect(ev.finishingTotalAr).toBe(12_000);
    setGfAdminPricingRuntime(null);
  });
});

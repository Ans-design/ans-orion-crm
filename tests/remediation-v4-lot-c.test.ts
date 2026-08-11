import { describe, expect, it } from 'vitest';
import {
  resolvePricingFamilyFromArticleId,
  PRICING_ENGINE_FAMILIES,
} from '@/lib/pricing/pricing-engine-contract';
import { CART_STORAGE_VERSION } from '@/lib/cart-store';
import { isPublicPage } from '@/lib/auth/public-routes';

describe('Lot C — pricing engine contract', () => {
  it('résout familles depuis articleId', () => {
    expect(resolvePricingFamilyFromArticleId('bk-livres')).toBe('livres');
    expect(resolvePricingFamilyFromArticleId('gf-bache')).toBe('grand_format');
    expect(resolvePricingFamilyFromArticleId('flyer-a5')).toBe('flyer');
    expect(PRICING_ENGINE_FAMILIES).toContain('livres');
  });
});

describe('Lot C — panier version', () => {
  it('expose marqueur migration V4', () => {
    expect(CART_STORAGE_VERSION).toBeGreaterThanOrEqual(2);
  });
});

describe('Lot B7 — devis id route existe', () => {
  it('fichier page devis/[id] présent', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const p = path.join(process.cwd(), 'app/(app)/devis/[id]/page.tsx');
    expect(fs.existsSync(p)).toBe(true);
  });
});

describe('Lot A régression — BAT public', () => {
  it('garde /bat privé', () => {
    expect(isPublicPage('/bat')).toBe(false);
    expect(isPublicPage('/bat/valider/tok')).toBe(true);
  });
});

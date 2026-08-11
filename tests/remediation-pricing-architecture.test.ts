/**
 * Architecture tarifaire — stubs Excel, STRICT, cache, service canonique.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  articleHasPrix2026Grid,
  getPrix2026EntryUnitPrice,
  resolvePrix2026UnitPrice,
  PRIX_2026_RUNTIME_STATUS,
} from '@/lib/data/prix-2026-grids';
import { isPrix2026LegacyEnabled } from '@/lib/pricing/prix-2026-legacy';
import {
  isDemoPricingFallbackAllowed,
  isOperationalStrictPricing,
} from '@/lib/pricing/pricing-mode-policy';
import {
  getPricingCacheGeneration,
  invalidatePricingRuntimeCache,
  pricingCacheGet,
  pricingCacheKey,
  pricingCacheSet,
  setPricingCacheReleaseId,
} from '@/lib/pricing/pricing-runtime-cache';
import { dualWriteOptionModifier } from '@/lib/money/option-modifier';

describe('PRX-01 stubs runtime prix-2026', () => {
  it('ne porte aucun tarif numérique', () => {
    expect(PRIX_2026_RUNTIME_STATUS).toBe('archive-stub-no-tariffs');
    expect(articleHasPrix2026Grid('cv-std')).toBe(false);
    expect(getPrix2026EntryUnitPrice('gd-mug')).toBeNull();
    expect(resolvePrix2026UnitPrice('fly-std', { qty: 100 }, 100)).toBeNull();
  });

  it('archive figée présente hors lib/data', () => {
    const archive = path.join(process.cwd(), 'archives/pricing/prix-2026-grids/goodies.ts');
    expect(fs.existsSync(archive)).toBe(true);
    const src = fs.readFileSync(archive, 'utf8');
    expect(src).toMatch(/\d{3,}/);
    const stub = fs.readFileSync(
      path.join(process.cwd(), 'lib/data/prix-2026-grids/goodies.ts'),
      'utf8',
    );
    expect(stub).toMatch(/STUB/);
    expect(stub).not.toMatch(/15000/);
  });
});

describe('anti-réintroduction archives dans runtime', () => {
  it('calculate.ts et price-preview n’importent pas archives/', () => {
    const files = [
      'lib/pricing/calculate.ts',
      'app/api/pos/price-preview/route.ts',
      'lib/pricing/canonical-tariff-service.ts',
    ];
    for (const f of files) {
      const src = fs.readFileSync(path.join(process.cwd(), f), 'utf8');
      expect(src).not.toMatch(/archives\/pricing\/prix-2026/);
    }
  });

  it('stubs lib/data ne ré-exportent pas de montants hardcodés massifs', () => {
    const index = fs.readFileSync(
      path.join(process.cwd(), 'lib/data/prix-2026-grids/index.ts'),
      'utf8',
    );
    expect(index).toMatch(/STUB|archive-stub/);
    expect(index).not.toMatch(/unitPrice:\s*[1-9]\d{3,}/);
  });
});

describe('STRICT / démo', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('staging est STRICT opérationnel', () => {
    process.env.APP_ENV = 'staging';
    delete process.env.STRICT_POS_PRICING;
    expect(isOperationalStrictPricing()).toBe(true);
    expect(isDemoPricingFallbackAllowed()).toBe(false);
  });

  it('prod refuse démo même avec flag', () => {
    process.env.APP_ENV = 'production';
    process.env.ALLOW_DEMO_PRICING_FALLBACK = 'true';
    process.env.LOCAL_DEV = 'true';
    expect(isDemoPricingFallbackAllowed()).toBe(false);
  });

  it('local + flag autorise démo', () => {
    process.env.APP_ENV = 'local';
    process.env.LOCAL_DEV = 'true';
    process.env.ALLOW_DEMO_PRICING_FALLBACK = 'true';
    delete process.env.USE_PRODUCTION_DB;
    delete process.env.STRICT_POS_PRICING;
    expect(isDemoPricingFallbackAllowed()).toBe(true);
  });

  it('USE_PRIX_2026_LEGACY refusé en staging', () => {
    process.env.APP_ENV = 'staging';
    process.env.USE_PRIX_2026_LEGACY = 'true';
    expect(isPrix2026LegacyEnabled()).toBe(false);
  });
});

describe('cache runtime invalidation', () => {
  beforeEach(() => {
    invalidatePricingRuntimeCache('test-reset');
    setPricingCacheReleaseId('rel-a');
  });

  it('invalide les entrées après publish', () => {
    const key = pricingCacheKey(['t', 1]);
    pricingCacheSet(key, { v: 1 });
    expect(pricingCacheGet<{ v: number }>(key)?.v).toBe(1);
    const gen = getPricingCacheGeneration();
    invalidatePricingRuntimeCache('publish-test');
    expect(getPricingCacheGeneration()).toBe(gen + 1);
    expect(pricingCacheGet(key)).toBeUndefined();
  });

  it('ignore cache si releaseId change', () => {
    const key = pricingCacheKey(['t', 2]);
    pricingCacheSet(key, { v: 2 });
    setPricingCacheReleaseId('rel-b');
    expect(pricingCacheGet(key)).toBeUndefined();
  });
});

describe('publication atomique — contrat dual-write options', () => {
  it('ne mélange pas Ar et multiplicateur', () => {
    expect(dualWriteOptionModifier('fixed', 1200).priceMultiplier).toBe(0);
    expect(dualWriteOptionModifier('multiplier', 0.1).priceAddonAr).toBe(0);
  });
});

describe('même entrée — stabilité calcul helpers', () => {
  it('arrondi MGA déterministe multi-qty', async () => {
    const { addMga, applyRemiseMga } = await import('@/lib/money/mga');
    expect(applyRemiseMga(addMga(10_000, 10_000), 10)).toBe(18_000);
    expect(applyRemiseMga(50_000, 0)).toBe(50_000);
  });
});

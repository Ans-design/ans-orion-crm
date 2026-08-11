import { describe, expect, it } from 'vitest';
import { resolvePublicationParity } from '@/lib/pricing/publication-parity';
import {
  computeFinancialBreakdown,
  formatRatePct,
} from '@/lib/pricing/financial-definitions';
import { applyPriceBlocksToUnit, type PriceBlock } from '@/lib/pricing/price-builder-blocks';

describe('publication parity Admin↔POS (§11/§13)', () => {
  it('ne marque Synchronisé que si la parité POS est vérifiée', () => {
    const pending = resolvePublicationParity({
      profileStatus: 'published',
      latestFormula: { version: 3, status: 'published' },
    });
    expect(pending.tone).toBe('warn');
    expect(pending.label).toBe('Actif — parité à vérifier');

    const synced = resolvePublicationParity({
      profileStatus: 'published',
      latestFormula: { version: 3, status: 'published', coherenceHash: 'abcdef012345' },
      posParityVerified: true,
      posDriftCount: 0,
    });
    expect(synced.tone).toBe('ok');
    expect(synced.label).toBe('Synchronisé');
  });

  it('signale les écarts POS même si profil+formule publiés', () => {
    const s = resolvePublicationParity({
      profileStatus: 'published',
      latestFormula: { version: 3, status: 'published' },
      posParityVerified: false,
      posDriftCount: 2,
    });
    expect(s.tone).toBe('danger');
    expect(s.label).toBe('Écart POS');
  });

  it('requires publication when profile published but formula draft', () => {
    const s = resolvePublicationParity({
      profileStatus: 'published',
      latestFormula: { version: 4, status: 'draft' },
    });
    expect(s.tone).toBe('warn');
    expect(s.label).toBe('À appliquer');
  });

  it('never claims synced without a formula', () => {
    const s = resolvePublicationParity({
      profileStatus: 'published',
      latestFormula: null,
    });
    expect(s.tone).toBe('warn');
    expect(s.label).not.toBe('Synchronisé');
  });
});

describe('financial definitions (§7)', () => {
  it('separates margin-on-cost from markup-on-sell', () => {
    const b = computeFinancialBreakdown(130, 100);
    expect(b.benefit).toBe(30);
    expect(b.marginOnCostRate).toBeCloseTo(0.3, 5);
    expect(b.markupOnSellRate).toBeCloseTo(30 / 130, 5);
    expect(b.multiplier).toBeCloseTo(1.3, 5);
    expect(formatRatePct(b.marginOnCostRate)).toBe('30.0 %');
  });

  it('returns null rates when cost or sell is zero', () => {
    expect(computeFinancialBreakdown(100, 0).marginOnCostRate).toBeNull();
    expect(computeFinancialBreakdown(0, 50).markupOnSellRate).toBeNull();
  });
});

describe('applyPriceBlocksToUnit — marge sur prix de vente', () => {
  it('applique coût / (1 - marge) et non coût × (1 + marge)', () => {
    const blocks: PriceBlock[] = [
      { id: '1', kind: 'base_fixed', enabled: true, value: 700 },
      { id: '2', kind: 'margin_percent', enabled: true, value: 30 },
    ];
    const r = applyPriceBlocksToUnit(blocks, { qty: 1, prixBase: 700 });
    // 700 / (1 - 0.30) = 1000
    expect(r.unit).toBe(1000);
    expect(r.unit).not.toBe(910); // 700 × 1.3 serait faux
  });

  it('arrondit au pas supérieur et respecte le minimum', () => {
    const blocks: PriceBlock[] = [
      { id: '1', kind: 'base_fixed', enabled: true, value: 123 },
      { id: '2', kind: 'round_ar', enabled: true, value: 50 },
      { id: '3', kind: 'minimum', enabled: true, value: 500 },
    ];
    const r = applyPriceBlocksToUnit(blocks, { qty: 1, prixBase: 123 });
    expect(r.unit).toBe(150);
    expect(r.total).toBe(500);
  });
});

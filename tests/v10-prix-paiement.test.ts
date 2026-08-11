import { describe, expect, it } from 'vitest';
import { PriceUnavailableError, isPriceUnavailable } from '@/lib/pricing/price-unavailable';
import { paymentIdempotencyKey } from '@/lib/server/outbox';
import { isCataloguePriceUnavailableMode } from '@/lib/services/catalogue-pos-builder';

describe('PRIX-002 price unavailable', () => {
  it('détecte PRICE_UNAVAILABLE', () => {
    const err = new PriceUnavailableError('x', 'gf-pvc');
    expect(isPriceUnavailable(err)).toBe(true);
    expect(err.code).toBe('PRICE_UNAVAILABLE');
  });

  it('mode static-fallback = indisponible vérité DB', () => {
    expect(isCataloguePriceUnavailableMode('static-fallback')).toBe(true);
    expect(isCataloguePriceUnavailableMode('database-full')).toBe(false);
  });
});

describe('DATA-006 payment idempotency key', () => {
  it('normalise une clé stable', () => {
    const a = paymentIdempotencyKey({
      provider: 'manual',
      reference: 'REF-1',
      factureId: 'f1',
      montant: 1000.5,
    });
    const b = paymentIdempotencyKey({
      provider: 'manual',
      reference: 'ref-1',
      factureId: 'f1',
      montant: 1000.5,
    });
    expect(a).toBe(b);
  });
});

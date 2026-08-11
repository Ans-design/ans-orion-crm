import { describe, it, expect } from 'vitest';
import { checkStockAvailability } from '@/lib/services/StockAvailabilityService';

describe('StockAvailabilityService', () => {
  it('bloque article désactivé', () => {
    const r = checkStockAvailability({ articleId: 'disabled-flyer', configuration: { disabled: true } });
    expect(r.status).toBe('DISABLED');
    expect(r.canAddToCart).toBe(false);
  });

  it('autorise stock disponible', () => {
    const r = checkStockAvailability({ articleId: 'flyer-a5', quantity: 100 });
    expect(r.canAddToCart).toBe(true);
    expect(['AVAILABLE', 'LOW_STOCK']).toContain(r.status);
  });

  it('sur commande affiche délai', () => {
    const r = checkStockAvailability({ articleId: 'special', configuration: { onDemand: true } });
    expect(r.status).toBe('ON_DEMAND');
    expect(r.estimatedDelayDays).toBeGreaterThan(0);
  });
});

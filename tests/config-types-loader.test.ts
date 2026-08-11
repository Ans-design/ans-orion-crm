import { describe, expect, it, vi } from 'vitest';

describe('config-types-loader', () => {
  it('charge getProductConfig via import dynamique', async () => {
    vi.resetModules();
    const mod = await import('@/lib/data/config-types-loader');
    const cfg = await mod.loadProductConfig('cart-visite', 'carte_visite');
    expect(cfg === null || typeof cfg === 'object').toBe(true);
  });
});

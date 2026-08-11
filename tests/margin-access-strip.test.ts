import { describe, expect, it } from 'vitest';
import {
  stripCommande360Overview,
  stripPurchaseOrder,
} from '@/lib/auth/margin-access';

describe('margin-access strip helpers', () => {
  it('stripCommande360Overview retire les marges pour commercial', () => {
    const payload = {
      commande: { id: 'c1' },
      summary: { margeEstimee: 12000, margeEstimeePct: 38, totalBAT: 1 },
    };
    const stripped = stripCommande360Overview(payload, 'commercial');
    expect(stripped.summary?.margeEstimee).toBeUndefined();
    expect(stripped.summary?.margeEstimeePct).toBeUndefined();
    expect(stripped.summary?.totalBAT).toBe(1);
  });

  it('stripCommande360Overview conserve les marges pour admin', () => {
    const payload = { summary: { margeEstimee: 12000, margeEstimeePct: 38 } };
    const kept = stripCommande360Overview(payload, 'admin');
    expect(kept.summary?.margeEstimee).toBe(12000);
  });

  it('stripPurchaseOrder masque coûts achat pour commercial', () => {
    const order = {
      id: 'po-1',
      totalHT: 50000,
      lignes: [{ id: 'l1', label: 'Papier', unitCost: 1200, total: 24000 }],
    };
    const stripped = stripPurchaseOrder(order, 'commercial');
    expect(stripped.totalHT).toBeUndefined();
    expect(stripped.lignes?.[0]?.unitCost).toBeUndefined();
    expect(stripped.lignes?.[0]?.total).toBeUndefined();
    expect(stripped.lignes?.[0]?.label).toBe('Papier');
  });
});

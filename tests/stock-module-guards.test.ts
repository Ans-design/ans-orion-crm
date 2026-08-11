import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  update: vi.fn(),
  adjustStock: vi.fn(),
}));

vi.mock('@/lib/server/modules/stock/stock.repository', () => ({
  stockRepository: {
    findById: mocks.findById,
    update: mocks.update,
  },
}));

vi.mock('@/lib/services/stock-service', () => ({
  adjustStock: mocks.adjustStock,
  resolveStockAvailability: vi.fn(),
}));

import { adjustStockItem, updateStockItemRecord } from '@/lib/server/modules/stock/stock.service';

describe('stock module guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuse une mise à jour réservée incohérente', async () => {
    mocks.findById.mockResolvedValue({
      id: 'stock-1',
      label: 'Papier offset',
      quantity: 5,
      reservedQty: 2,
      movements: [],
    });

    const result = await updateStockItemRecord('stock-1', { reservedQty: 6 });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.code).toBe('RESERVED_QTY_EXCEEDS_STOCK');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('mappe le refus de mouvement stock en erreur métier typée', async () => {
    mocks.findById.mockResolvedValue({
      id: 'stock-1',
      label: 'Papier offset',
      quantity: 5,
      reservedQty: 4,
      movements: [],
    });
    mocks.adjustStock.mockRejectedValue(
      new Error('Mouvement refusé: stock réel (3) inférieur au stock réservé (4 feuille)'),
    );

    const result = await adjustStockItem(
      'stock-1',
      { type: 'sortie', quantity: 2 },
      { userId: 'user-1', userName: 'Test' },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.code).toBe('RESERVED_QTY_EXCEEDS_STOCK');
  });
});

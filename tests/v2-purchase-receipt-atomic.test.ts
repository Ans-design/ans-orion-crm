/**
 * V2-05b — réception achat atomique, sans écriture DB réelle.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  purchaseFindUnique: vi.fn(),
  purchaseUpdate: vi.fn(),
  purchaseUpdateMany: vi.fn(),
  lineUpdate: vi.fn(),
  stockFindUnique: vi.fn(),
  stockUpdate: vi.fn(),
  adjustStock: vi.fn(),
  syncMaterial: vi.fn(),
  events: [] as string[],
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/services/stock-service', () => ({
  adjustStock: mocks.adjustStock,
}));

vi.mock('@/lib/server/modules/materials/material-stock-sync.service', () => ({
  syncMaterialFromStockItem: mocks.syncMaterial,
}));

import { receivePurchaseOrder } from '@/lib/services/purchase-order-service';

function createTx() {
  return {
    purchaseOrder: {
      findUnique: mocks.purchaseFindUnique,
      update: mocks.purchaseUpdate,
      updateMany: mocks.purchaseUpdateMany,
    },
    purchaseOrderLine: {
      update: mocks.lineUpdate,
    },
    stockItem: {
      findUnique: mocks.stockFindUnique,
      update: mocks.stockUpdate,
    },
  };
}

const lines = [
  {
    id: 'line-1',
    stockItemId: 'stock-1',
    label: 'Papier A',
    qty: 10,
    unitCost: 100,
    receivedQty: 0,
    purchaseUnit: 'feuille',
    conversionFactor: 1,
  },
  {
    id: 'line-2',
    stockItemId: 'stock-1',
    label: 'Papier A bis',
    qty: 10,
    unitCost: 110,
    receivedQty: 0,
    purchaseUnit: 'feuille',
    conversionFactor: 1,
  },
];

const initialOrder = {
  id: 'po-1',
  numero: 'ACH-2026-001',
  supplierId: 'supplier-1',
  supplier: { name: 'Papeterie' },
  statut: 'Commandé',
  receivedAt: null,
  lignes: lines,
};

describe('V2-05b — réception achat atomique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.events.length = 0;

    const tx = createTx();
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => {
      mocks.events.push('tx:start');
      try {
        const result = await callback(tx);
        mocks.events.push('tx:commit');
        return result;
      } catch (error) {
        mocks.events.push('tx:rollback');
        throw error;
      }
    });
    mocks.purchaseFindUnique
      .mockResolvedValueOnce(initialOrder)
      .mockResolvedValueOnce({
        ...initialOrder,
        lignes: lines.map((line) => ({ ...line, receivedQty: line.qty })),
      });
    mocks.stockFindUnique.mockResolvedValue({
      id: 'stock-1',
      unit: 'feuille',
      unitDisplay: 'feuille',
      conversionFactor: 1,
    });
    mocks.adjustStock.mockImplementation(async () => {
      mocks.events.push('stock:adjust');
      return { id: 'stock-1' };
    });
    mocks.lineUpdate.mockResolvedValue({});
    mocks.stockUpdate.mockResolvedValue({});
    mocks.purchaseUpdateMany.mockResolvedValue({ count: 1 });
    mocks.purchaseUpdate.mockResolvedValue({
      ...initialOrder,
      statut: 'Reçu',
      lignes: lines.map((line) => ({ ...line, receivedQty: line.qty })),
    });
    mocks.syncMaterial.mockImplementation(async () => {
      mocks.events.push('material:sync');
    });
  });

  it('englobe mouvements, lignes et statut dans une seule transaction', async () => {
    const result = await receivePurchaseOrder('po-1', 'user-1', 'Alice');
    const tx = createTx();

    expect(result.statut).toBe('Reçu');
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.adjustStock).toHaveBeenCalledTimes(2);
    expect(mocks.adjustStock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ reference: 'ACH-2026-001/line-1' }),
      tx,
    );
    expect(mocks.adjustStock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ reference: 'ACH-2026-001/line-2' }),
      tx,
    );
    expect(mocks.lineUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.purchaseUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.purchaseUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.events.indexOf('tx:commit')).toBeLessThan(
      mocks.events.indexOf('material:sync'),
    );
  });

  it('une erreur de ligne empêche la finalisation et la sync post-commit', async () => {
    mocks.adjustStock
      .mockResolvedValueOnce({ id: 'stock-1' })
      .mockRejectedValueOnce(new Error('échec mouvement'));

    await expect(receivePurchaseOrder('po-1')).rejects.toThrow('échec mouvement');

    expect(mocks.events).toContain('tx:rollback');
    expect(mocks.purchaseUpdate).not.toHaveBeenCalled();
    expect(mocks.syncMaterial).not.toHaveBeenCalled();
  });

  it('refuse un second claim concurrent', async () => {
    mocks.purchaseUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(receivePurchaseOrder('po-1')).rejects.toThrow(/déjà en cours|déjà reçue/i);

    expect(mocks.adjustStock).not.toHaveBeenCalled();
    expect(mocks.syncMaterial).not.toHaveBeenCalled();
  });
});

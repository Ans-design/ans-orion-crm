import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  createMovement: vi.fn(),
  findFirstMovement: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stockItem: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
    stockMovement: {
      create: mocks.createMovement,
      findFirst: mocks.findFirstMovement,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/services/StockAvailabilityService', () => ({
  checkStockAvailabilitySimulated: vi.fn(),
}));

import { adjustStock } from '@/lib/services/stock-service';

function mockTx() {
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      stockItem: { findUnique: mocks.findUnique, update: mocks.update },
      stockMovement: {
        findFirst: mocks.findFirstMovement,
        create: mocks.createMovement,
      },
    };
    return fn(tx);
  });
}

describe('adjustStock guards reserved consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirstMovement.mockResolvedValue(null);
    mockTx();
  });

  it('refuse une sortie qui ferait passer le stock réel sous le stock réservé', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'stock-1',
      quantity: 10,
      reservedQty: 9,
      unit: 'feuille',
    });

    await expect(
      adjustStock({
        stockItemId: 'stock-1',
        type: 'sortie',
        quantity: 2,
        reference: 'TEST-SORTIE-RESERVE',
      }),
    ).rejects.toThrow(/stock réservé/i);

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('refuse un ajustement inférieur au stock déjà réservé', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'stock-1',
      quantity: 12,
      reservedQty: 6,
      unit: 'm2',
    });

    await expect(
      adjustStock({
        stockItemId: 'stock-1',
        type: 'ajustement',
        quantity: 5,
      }),
    ).rejects.toThrow(/stock réservé/i);

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('autorise un mouvement cohérent et persiste la transaction', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'stock-1',
      quantity: 12,
      reservedQty: 4,
      unit: 'feuille',
    });
    mocks.update.mockResolvedValue({ id: 'stock-1', quantity: 9, reservedQty: 4 });
    mocks.createMovement.mockResolvedValue({ id: 'mv-1' });

    const updated = await adjustStock({
      stockItemId: 'stock-1',
      type: 'sortie',
      quantity: 3,
      reference: 'CMD-1',
    });

    expect(updated.quantity).toBe(9);
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.createMovement).toHaveBeenCalled();
    expect(mocks.transaction).toHaveBeenCalled();
  });
});

/**
 * D-011 — consommation réservation à fin production (mocks + pur).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeStockAfterReservationConsume } from '@/lib/services/stock-quantity';

const mocks = vi.hoisted(() => ({
  findUniqueItem: vi.fn(),
  updateItem: vi.fn(),
  findUniqueRes: vi.fn(),
  findManyRes: vi.fn(),
  updateRes: vi.fn(),
  createMovement: vi.fn(),
  findFirstMovement: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stockItem: { findUnique: mocks.findUniqueItem, update: mocks.updateItem },
    stockReservation: {
      findUnique: mocks.findUniqueRes,
      findMany: mocks.findManyRes,
      update: mocks.updateRes,
    },
    stockMovement: { create: mocks.createMovement, findFirst: mocks.findFirstMovement },
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/services/StockAvailabilityService', () => ({
  checkStockAvailabilitySimulated: vi.fn(),
}));

import { consumeStockReservation } from '@/lib/services/stock-service';

describe('computeStockAfterReservationConsume', () => {
  it('débite qty + réservé', () => {
    expect(computeStockAfterReservationConsume({ quantity: 20, reservedQty: 5 }, 5)).toEqual({
      quantity: 15,
      reservedQty: 0,
    });
  });

  it('refuse si réservé insuffisant', () => {
    expect(() => computeStockAfterReservationConsume({ quantity: 20, reservedQty: 2 }, 5)).toThrow(
      /Réservé insuffisant/i,
    );
  });
});

describe('consumeStockReservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        stockItem: { findUnique: mocks.findUniqueItem, update: mocks.updateItem },
        stockReservation: {
          findUnique: mocks.findUniqueRes,
          findMany: mocks.findManyRes,
          update: mocks.updateRes,
        },
        stockMovement: { create: mocks.createMovement, findFirst: mocks.findFirstMovement },
      };
      return fn(tx);
    });
  });

  it('idempotent si déjà consumed', async () => {
    mocks.findUniqueRes.mockResolvedValue({
      id: 'res-1',
      stockItemId: 's1',
      quantity: 3,
      status: 'consumed',
      commandeId: 'c1',
    });
    const r = await consumeStockReservation({ reservationId: 'res-1' });
    expect(r.status).toBe('consumed');
    expect(mocks.updateItem).not.toHaveBeenCalled();
  });

  it('consomme active et écrit mouvement production', async () => {
    mocks.findUniqueRes.mockResolvedValue({
      id: 'res-1',
      stockItemId: 's1',
      quantity: 4,
      status: 'active',
      commandeId: 'c1',
      releasedAt: null,
    });
    mocks.findFirstMovement.mockResolvedValue(null);
    mocks.findUniqueItem.mockResolvedValue({
      id: 's1',
      quantity: 20,
      reservedQty: 4,
      unit: 'u',
    });
    mocks.updateRes.mockResolvedValue({ id: 'res-1', status: 'consumed' });
    mocks.updateItem.mockResolvedValue({ id: 's1', quantity: 16, reservedQty: 0 });
    mocks.createMovement.mockResolvedValue({ id: 'mv-1' });

    const r = await consumeStockReservation({ reservationId: 'res-1' });
    expect(r.status).toBe('consumed');
    expect(mocks.updateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { quantity: 16, reservedQty: 0 },
      }),
    );
    expect(mocks.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'production',
          quantity: 4,
          reference: 'PROD-CONSUME-res-1',
        }),
      }),
    );
  });
});

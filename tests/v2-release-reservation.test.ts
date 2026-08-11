/**
 * V2-02R — libération réservation stock (mocks, sans DB write).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUniqueItem: vi.fn(),
  updateItem: vi.fn(),
  findUniqueRes: vi.fn(),
  findFirstRes: vi.fn(),
  updateRes: vi.fn(),
  createMovement: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stockItem: { findUnique: mocks.findUniqueItem, update: mocks.updateItem },
    stockReservation: {
      findUnique: mocks.findUniqueRes,
      findFirst: mocks.findFirstRes,
      update: mocks.updateRes,
    },
    stockMovement: { create: mocks.createMovement },
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/services/StockAvailabilityService', () => ({
  checkStockAvailabilitySimulated: vi.fn(),
}));

import { releaseStockReservation } from '@/lib/services/stock-service';

describe('releaseStockReservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        stockItem: { findUnique: mocks.findUniqueItem, update: mocks.updateItem },
        stockReservation: {
          findUnique: mocks.findUniqueRes,
          findFirst: mocks.findFirstRes,
          update: mocks.updateRes,
        },
        stockMovement: { create: mocks.createMovement },
      };
      return fn(tx);
    });
  });

  it('no-op idempotent si déjà released', async () => {
    mocks.findUniqueRes.mockResolvedValue({
      id: 'res-1',
      stockItemId: 's1',
      quantity: 3,
      status: 'released',
      commandeId: 'c1',
    });
    const r = await releaseStockReservation({ reservationId: 'res-1' });
    expect(r.status).toBe('released');
    expect(mocks.updateItem).not.toHaveBeenCalled();
  });

  it('libère active et écrit annulation_reservation', async () => {
    mocks.findUniqueRes.mockResolvedValue({
      id: 'res-1',
      stockItemId: 's1',
      quantity: 4,
      status: 'active',
      commandeId: 'c1',
    });
    mocks.findUniqueItem.mockResolvedValue({
      id: 's1',
      quantity: 20,
      reservedQty: 4,
      unit: 'u',
    });
    mocks.updateRes.mockResolvedValue({
      id: 'res-1',
      status: 'released',
      releasedAt: new Date(),
    });
    mocks.updateItem.mockResolvedValue({ id: 's1', reservedQty: 0 });
    mocks.createMovement.mockResolvedValue({ id: 'mv-1' });

    const r = await releaseStockReservation({
      reservationId: 'res-1',
      reference: 'CMD-1',
    });
    expect(r.status).toBe('released');
    expect(mocks.updateItem).toHaveBeenCalled();
    expect(mocks.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'annulation_reservation', quantity: 4 }),
      }),
    );
  });
});

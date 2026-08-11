/**
 * LOT 4 — Idempotence & cohérence stock (pures + mocks Prisma, sans seed / write métier).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertStockQuantityConsistency,
  buildMovementIdempotencyWhere,
  computeNextStockQuantity,
  resolveMovementDeltaKind,
  stockAvailable,
} from '@/lib/services/stock-quantity';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  createMovement: vi.fn(),
  findFirstMovement: vi.fn(),
  findFirstReservation: vi.fn(),
  createReservation: vi.fn(),
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
    stockReservation: {
      findFirst: mocks.findFirstReservation,
      create: mocks.createReservation,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock('@/lib/services/StockAvailabilityService', () => ({
  checkStockAvailabilitySimulated: vi.fn(),
}));

import { adjustStock, reserveStock } from '@/lib/services/stock-service';

describe('LOT4 GOLDEN — stockAvailable / delta', () => {
  it.each([
    [{ quantity: 100, reservedQty: 0 }, 100],
    [{ quantity: 100, reservedQty: 40 }, 60],
    [{ quantity: 10, reservedQty: 10 }, 0],
    [{ quantity: 5, reservedQty: 8 }, 0],
    [{ quantity: 5, reservedQty: null }, 5],
  ])('stockAvailable(%j) → %i', (item, expected) => {
    expect(stockAvailable(item)).toBe(expected);
  });

  it.each([
    ['sortie', 'entree', 'sortie'],
    ['perte', 'entree', 'sortie'],
    ['production', 'ajustement', 'sortie'],
    ['vente_directe', 'entree', 'sortie'],
    ['transfert', 'entree', 'sortie'],
    ['entree', 'sortie', 'entree'],
    ['retour', 'sortie', 'entree'],
    ['ajustement', 'ajustement', 'ajustement'],
    ['stock_initial', 'entree', 'entree'],
  ] as const)('resolveMovementDeltaKind(%s, %s) → %s', (label, fallback, expected) => {
    expect(resolveMovementDeltaKind(label, fallback)).toBe(expected);
  });

  it('computeNextStockQuantity — sortie / entrée / ajustement', () => {
    expect(computeNextStockQuantity(100, 'sortie', 12)).toBe(88);
    expect(computeNextStockQuantity(100, 'entree', 12)).toBe(112);
    expect(computeNextStockQuantity(100, 'ajustement', 55)).toBe(55);
    expect(computeNextStockQuantity(100, 'entree', 5, 'perte')).toBe(95);
  });

  it('assertStockQuantityConsistency — négatif et sous-réservé', () => {
    expect(() =>
      assertStockQuantityConsistency({ quantity: 10, reservedQty: 0 }, -1),
    ).toThrow(/insuffisant/i);
    expect(() =>
      assertStockQuantityConsistency({ quantity: 10, reservedQty: 8, unit: 'u' }, 5),
    ).toThrow(/stock réservé/i);
    expect(() =>
      assertStockQuantityConsistency({ quantity: 10, reservedQty: 4 }, 6),
    ).not.toThrow();
  });

  it('buildMovementIdempotencyWhere — sans référence → null', () => {
    expect(
      buildMovementIdempotencyWhere({
        stockItemId: 's1',
        type: 'sortie',
        quantity: 3,
        reference: '  ',
      }),
    ).toBeNull();
  });

  it('buildMovementIdempotencyWhere — avec référence', () => {
    expect(
      buildMovementIdempotencyWhere({
        stockItemId: 's1',
        type: 'production',
        quantity: -4,
        reference: 'CMD-1',
        commandeId: 'c1',
      }),
    ).toEqual({
      stockItemId: 's1',
      type: 'production',
      quantity: 4,
      reference: 'CMD-1',
      commandeId: 'c1',
    });
  });
});

describe('LOT4 — adjustStock idempotence (référence)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it('replay même référence → ne double pas le débit', async () => {
    const item = { id: 'stock-1', quantity: 90, reservedQty: 0, unit: 'u' };
    mocks.findUnique.mockResolvedValue(item);
    mocks.findFirstMovement.mockResolvedValue({
      id: 'mv-existing',
      stockItemId: 'stock-1',
      type: 'sortie',
      quantity: 10,
      reference: 'CMD-99',
    });

    const result = await adjustStock({
      stockItemId: 'stock-1',
      type: 'sortie',
      quantity: 10,
      reference: 'CMD-99',
      commandeId: 'cmd-99',
    });

    expect(result.quantity).toBe(90);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.createMovement).not.toHaveBeenCalled();
  });

  it('sans référence ni commandeId → refuse la sortie (anti-doublon)', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'stock-1',
      quantity: 20,
      reservedQty: 0,
      unit: 'u',
    });

    await expect(
      adjustStock({
        stockItemId: 'stock-1',
        type: 'sortie',
        quantity: 5,
      }),
    ).rejects.toThrow(/Référence obligatoire/i);

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('réutilise une transaction externe sans transaction imbriquée', async () => {
    const externalTx = {
      stockItem: { findUnique: mocks.findUnique, update: mocks.update },
      stockMovement: {
        findFirst: mocks.findFirstMovement,
        create: mocks.createMovement,
      },
    };
    mocks.findUnique.mockResolvedValue({
      id: 'stock-1',
      quantity: 20,
      reservedQty: 0,
      unit: 'u',
    });
    mocks.findFirstMovement.mockResolvedValue(null);
    mocks.update.mockResolvedValue({ id: 'stock-1', quantity: 25 });
    mocks.createMovement.mockResolvedValue({ id: 'mv-entree' });

    const result = await adjustStock({
      stockItemId: 'stock-1',
      type: 'entree',
      quantity: 5,
      reference: 'ACH-1/ligne-1',
    }, externalTx as never);

    expect(result.quantity).toBe(25);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.createMovement).toHaveBeenCalled();
  });
});

describe('LOT4 — reserveStock idempotence (commande)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('réservation active existante même qty → retourne existante', async () => {
    const existing = {
      id: 'res-1',
      stockItemId: 'stock-1',
      commandeId: 'cmd-1',
      quantity: 7,
      status: 'active',
    };
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        stockItem: { findUnique: mocks.findUnique, update: mocks.update },
        stockReservation: {
          findFirst: mocks.findFirstReservation,
          create: mocks.createReservation,
        },
        stockMovement: { create: mocks.createMovement },
      };
      return fn(tx);
    });
    mocks.findUnique.mockResolvedValue({
      id: 'stock-1',
      quantity: 50,
      reservedQty: 7,
      unit: 'feuille',
    });
    mocks.findFirstReservation.mockResolvedValue(existing);

    const result = await reserveStock({
      stockItemId: 'stock-1',
      quantity: 7,
      commandeId: 'cmd-1',
    });

    expect(result.id).toBe('res-1');
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.createReservation).not.toHaveBeenCalled();
  });

  it('réservation active qty différente → erreur', async () => {
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        stockItem: { findUnique: mocks.findUnique, update: mocks.update },
        stockReservation: {
          findFirst: mocks.findFirstReservation,
          create: mocks.createReservation,
        },
        stockMovement: { create: mocks.createMovement },
      };
      return fn(tx);
    });
    mocks.findUnique.mockResolvedValue({
      id: 'stock-1',
      quantity: 50,
      reservedQty: 7,
      unit: 'feuille',
    });
    mocks.findFirstReservation.mockResolvedValue({
      id: 'res-1',
      quantity: 7,
      status: 'active',
    });

    await expect(
      reserveStock({
        stockItemId: 'stock-1',
        quantity: 10,
        commandeId: 'cmd-1',
      }),
    ).rejects.toThrow(/quantité différente/i);
  });

  it('refuse si disponible insuffisant', async () => {
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        stockItem: { findUnique: mocks.findUnique, update: mocks.update },
        stockReservation: {
          findFirst: mocks.findFirstReservation,
          create: mocks.createReservation,
        },
        stockMovement: { create: mocks.createMovement },
      };
      return fn(tx);
    });
    mocks.findUnique.mockResolvedValue({
      id: 'stock-1',
      quantity: 10,
      reservedQty: 8,
      unit: 'u',
    });
    mocks.findFirstReservation.mockResolvedValue(null);

    await expect(
      reserveStock({
        stockItemId: 'stock-1',
        quantity: 5,
        commandeId: 'cmd-2',
      }),
    ).rejects.toThrow(/insuffisant/i);
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockQueryRaw = vi.fn();
const mockPrismaFindMany = vi.fn();

vi.mock('@/lib/server/modules/stock/stock.repository', () => ({
  stockRepository: {
    findMany: (...args: unknown[]) => mockFindMany(...args),
    count: (...args: unknown[]) => mockCount(...args),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRawUnsafe: (...args: unknown[]) => mockQueryRaw(...args),
    stockItem: {
      findMany: (...args: unknown[]) => mockPrismaFindMany(...args),
    },
  },
}));

import { listStockItems } from '@/lib/server/modules/stock/stock.service';

const item = (id: string, quantity: number, minQty = 5) => ({
  id,
  quantity,
  minQty,
  actif: true,
  archived: false,
  category: 'Papier',
  label: `Item ${id}`,
  sku: id,
});

describe('listStockItems stats', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockCount.mockReset();
    mockQueryRaw.mockReset();
    mockPrismaFindMany.mockReset();
  });

  it('calcule les KPI sur tous les articles actifs, pas sur la liste filtrée', async () => {
    const filtered = [item('b', 2)];
    mockCount
      .mockResolvedValueOnce(4) // totalActive
      .mockResolvedValueOnce(1) // outOfStock
      .mockResolvedValueOnce(1); // totalFiltered
    mockQueryRaw.mockResolvedValue([{ c: 2 }]); // critical
    mockFindMany.mockResolvedValue(filtered);

    const { items, stats } = await listStockItems({
      category: '',
      critical: false,
      outOfStock: false,
      search: 'filtre',
      stockCategory: '',
      vendable: false,
      linkedMaterial: '',
    });

    expect(items).toHaveLength(1);
    expect(stats).toEqual({ total: 4, critical: 2, outOfStock: 1 });
  });

  it('filtre critique sur items sans recalculer total global', async () => {
    const all = [item('a', 0), item('b', 3), item('c', 10)];
    mockCount
      .mockResolvedValueOnce(3) // totalActive
      .mockResolvedValueOnce(1) // outOfStock
      .mockResolvedValueOnce(3); // totalFiltered (ignored when critical)
    mockQueryRaw.mockResolvedValue([{ c: 2 }]);
    mockFindMany.mockResolvedValue(all);

    const { items, stats } = await listStockItems({
      category: '',
      critical: true,
      outOfStock: false,
      search: '',
      stockCategory: '',
      vendable: false,
      linkedMaterial: '',
    });

    expect(items).toHaveLength(2);
    expect(stats.total).toBe(3);
    expect(stats.critical).toBe(2);
  });
});

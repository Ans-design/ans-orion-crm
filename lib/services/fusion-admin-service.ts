import { prisma } from '@/lib/prisma';

export async function listMaterialsForAdmin() {
  return prisma.materialCatalog.findMany({
    include: {
      grammages: { orderBy: { value: 'asc' } },
    },
    orderBy: [{ family: 'asc' }, { label: 'asc' }],
  });
}

export async function setMaterialActive(id: string, actif: boolean) {
  return prisma.materialCatalog.update({
    where: { id },
    data: { actif },
  });
}

export async function setGrammageActive(id: string, actif: boolean) {
  return prisma.grammageCatalog.update({
    where: { id },
    data: { actif },
  });
}

export type SalePriceFilter = 'all' | 'active' | 'inactive' | 'manual' | 'modified';

export async function listSalePricesForAdmin(params: {
  q?: string;
  page?: number;
  limit?: number;
  filter?: SalePriceFilter;
}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(10, params.limit ?? 50));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  const filter = params.filter ?? 'all';
  if (filter === 'active') where.actif = true;
  else if (filter === 'inactive') where.actif = false;
  else if (filter === 'manual') where.priceType = 'manual';
  else if (filter === 'modified') where.adminModified = true;

  if (params.q?.trim()) {
    const q = params.q.trim();
    where.OR = [
      { productNormalized: { contains: q } },
      { format: { contains: q } },
      { material: { contains: q } },
      { grammage: { contains: q } },
      { qtyTier: { contains: q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.salePrice2026.findMany({
      where,
      orderBy: [{ productNormalized: 'asc' }, { format: 'asc' }, { qtyTier: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.salePrice2026.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function setSalePriceActive(id: string, actif: boolean) {
  return prisma.salePrice2026.update({
    where: { id },
    data: { actif, posStatus: actif ? 'active' : 'inactive' },
  });
}

export {
  updateCurrentPrice,
  resetRowToSource,
  resetModifiedRowsToSource,
  getCompareStats,
  exportPriceStoreJson,
  backfillSourcePrices,
} from '@/lib/pricing/ans-price-store';

export async function listAnomaliesForAdmin(showResolved = false) {
  return prisma.importAnomaly.findMany({
    where: showResolved ? {} : { resolved: false },
    orderBy: [{ resolved: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });
}

export async function setAnomalyResolved(id: string, resolved: boolean, decision?: string) {
  return prisma.importAnomaly.update({
    where: { id },
    data: {
      resolved,
      ...(decision !== undefined ? { decision } : {}),
    },
  });
}

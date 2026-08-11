/**
 * Prix matière par contexte — couche canonique (Stock & Matières = source).
 * Les vues ISF / Grand Format synchronisent vers/depuis cette table.
 */
import { prisma } from '@/lib/prisma';

export const PRICE_CONTEXTS = [
  'RAW_STOCK',
  'PRINT_SMALL_FORMAT',
  'PRINT_GRAND_FORMAT',
  'BLANK_MATERIAL',
  'PHOTO_PRINT',
  'PVC_RIGID',
  'DIRECT_COMPONENT',
] as const;

export type PriceContext = (typeof PRICE_CONTEXTS)[number];

export const PRICE_UNITS = ['piece', 'sheet', 'm2', 'ml', 'a4', 'kg', 'roll'] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export type MaterialContextPriceRow = {
  id: string;
  baseMaterialId: string;
  materialKey: string;
  priceContext: string;
  priceUnit: string;
  baseFormat: string | null;
  priceHT: number;
  costHT: number | null;
  sourceTable: string | null;
  sourceRowId: string | null;
  active: boolean;
};

function hasDelegate(): boolean {
  const client = prisma as unknown as Record<string, unknown>;
  return typeof client.materialContextPrice === 'object' && client.materialContextPrice != null;
}

export async function upsertMaterialContextPrice(input: {
  baseMaterialId: string;
  materialKey: string;
  priceContext: PriceContext | string;
  priceUnit?: string;
  baseFormat?: string | null;
  priceHT: number;
  costHT?: number | null;
  sourceTable?: string | null;
  sourceRowId?: string | null;
  details?: string | null;
  active?: boolean;
}): Promise<MaterialContextPriceRow | null> {
  if (!hasDelegate()) return null;
  const priceUnit = input.priceUnit ?? (input.priceContext === 'PRINT_GRAND_FORMAT' ? 'm2' : 'a4');
  const baseFormat = input.baseFormat ?? (priceUnit === 'a4' ? 'A4' : null);

  const existing = await prisma.materialContextPrice.findFirst({
    where: {
      baseMaterialId: input.baseMaterialId,
      priceContext: input.priceContext,
      priceUnit,
      baseFormat: baseFormat ?? null,
    },
  });

  const data = {
    materialKey: input.materialKey,
    priceHT: input.priceHT,
    costHT: input.costHT ?? null,
    sourceTable: input.sourceTable ?? null,
    sourceRowId: input.sourceRowId ?? null,
    details: input.details ?? null,
    active: input.active !== false,
  };

  if (existing) {
    return prisma.materialContextPrice.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.materialContextPrice.create({
    data: {
      baseMaterialId: input.baseMaterialId,
      priceContext: input.priceContext,
      priceUnit,
      baseFormat,
      ...data,
      materialKey: input.materialKey,
    },
  });
}

export async function getMaterialBasePrice(
  materialIdOrKey: string,
  context: PriceContext | string,
  opts?: { format?: string | null; unit?: string | null },
): Promise<{ priceHT: number; costHT: number | null; source: string; rowId: string | null } | null> {
  if (!hasDelegate()) return null;

  const format = opts?.format ?? (context === 'PRINT_SMALL_FORMAT' ? 'A4' : null);
  const unit = opts?.unit ?? (context === 'PRINT_GRAND_FORMAT' ? 'm2' : 'a4');

  const rows = await prisma.materialContextPrice.findMany({
    where: {
      active: true,
      priceContext: context,
      OR: [
        { baseMaterialId: materialIdOrKey },
        { materialKey: materialIdOrKey },
        { materialKey: { startsWith: `${materialIdOrKey}:` } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  }).catch(() => []);

  if (!rows.length) return null;

  const scored = rows.map((r) => {
    let score = 0;
    if (r.baseMaterialId === materialIdOrKey || r.materialKey === materialIdOrKey) score += 5;
    if (unit && r.priceUnit === unit) score += 3;
    if (format && r.baseFormat === format) score += 3;
    else if (!r.baseFormat) score += 1;
    return { r, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0]?.r;
  if (!best || !(best.priceHT > 0)) return null;
  return {
    priceHT: best.priceHT,
    costHT: best.costHT,
    source: 'materialContextPrice',
    rowId: best.id,
  };
}

export async function listMaterialContextPrices(filters?: {
  priceContext?: string;
  materialKey?: string;
  baseMaterialId?: string;
}) {
  if (!hasDelegate()) return [];
  return prisma.materialContextPrice.findMany({
    where: {
      ...(filters?.priceContext ? { priceContext: filters.priceContext } : {}),
      ...(filters?.materialKey ? { materialKey: filters.materialKey } : {}),
      ...(filters?.baseMaterialId ? { baseMaterialId: filters.baseMaterialId } : {}),
      active: true,
    },
    orderBy: [{ materialKey: 'asc' }, { priceContext: 'asc' }],
  });
}

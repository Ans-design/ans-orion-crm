import { prisma } from '@/lib/prisma';
import { asStockExtended } from '@/lib/server/modules/stock/stock.types';

export type MaterialStockSnapshot = {
  materialId: string | null;
  stockItemId: string | null;
  materialKey: string | null;
  sku: string | null;
  label: string | null;
  purchasePrice: number | null;
  basePrintPrice: number | null;
  maxPrice: number | null;
  publicationStatus: string | null;
  unitDisplay: string | null;
  unitStandard: string | null;
  conversionFactor: number | null;
  stockAvailable: number | null;
  formulaVersion: string | number | null;
  publicationVersion: string | null;
};

/** Résout matière publiée + stock lié pour figer dans devis/commande */
export async function resolveMaterialStockSnapshot(params: {
  materialKey?: string | null;
  paperType?: string | null;
  grammage?: string | null;
}): Promise<MaterialStockSnapshot | null> {
  const key = params.materialKey?.trim();
  const paper = params.paperType?.trim();
  const gr = params.grammage?.trim();

  let material = key
    ? await prisma.baseMaterial.findFirst({
        where: { materialKey: key, archived: false },
      })
    : null;

  if (!material && paper && gr) {
    material = await prisma.baseMaterial.findFirst({
      where: {
        archived: false,
        OR: [
          { label: { contains: paper } },
          { materialKey: { contains: paper } },
        ],
        grammage: gr,
      },
    });
  }

  if (!material) return null;

  let stock = material.stockItemId
    ? await prisma.stockItem.findUnique({ where: { id: material.stockItemId } })
    : null;

  if (!stock && material.stockItemId == null) {
    stock = await prisma.stockItem.findFirst({
      where: { baseMaterialId: material.id, actif: true },
    });
  }

  const s = stock ? asStockExtended(stock) : null;
  const available = s ? Math.max(0, s.quantity - (s.reservedQty ?? 0)) : null;

  return {
    materialId: material.id,
    stockItemId: s?.id ?? material.stockItemId ?? null,
    materialKey: material.materialKey,
    sku: s?.sku ?? null,
    label: material.label,
    purchasePrice: material.purchasePrice ?? s?.unitCost ?? null,
    basePrintPrice: material.basePrintPrice ?? null,
    maxPrice: material.maxPrice ?? null,
    publicationStatus: material.publicationStatus,
    unitDisplay: material.unitDisplay ?? s?.unitDisplay ?? null,
    unitStandard: material.unitStandard ?? s?.unitStandard ?? null,
    conversionFactor: material.conversionFactor ?? s?.conversionFactor ?? null,
    stockAvailable: available,
    formulaVersion: material.basePrintType ?? null,
    publicationVersion: material.publicationStatus,
  };
}

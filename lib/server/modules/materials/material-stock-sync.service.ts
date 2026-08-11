import { prisma } from '@/lib/prisma';
import { stockStatus, standardQuantity } from '../stock/stock-sku.service';
import { asStockExtended } from '../stock/stock.types';
import { patchBaseMaterial } from '../pricing/base-material.repository';
import { buildMaterialKey } from './material-key';

/** Stock → Matières DB : sync complète (quantités, prix, unités, identité) */
export async function syncMaterialFromStockItem(stockItemId: string) {
  const raw = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
  if (!raw) return null;
  const stock = asStockExtended(raw);

  const material = await prisma.baseMaterial.findFirst({
    where: { OR: [{ stockItemId: stock.id }, ...(stock.baseMaterialId ? [{ id: stock.baseMaterialId }] : [])] },
  });
  if (!material) return null;

  const available = Math.max(0, stock.quantity - (stock.reservedQty ?? 0));
  const status = stockStatus(available, stock.minQty);
  const supplierName = stock.supplier ?? null;
  const materialKey =
    stock.materialKey ??
    buildMaterialKey(stock.paperType ?? stock.sku, stock.grammage);

  const family =
    stock.category === 'GrandFormat'
      ? 'Grand format'
      : stock.stockCategory === 'vente_directe'
        ? 'Vente directe'
        : material.family;

  const anomalies: string[] = [];
  if (status === 'rupture') anomalies.push('Stock rupture');
  else if (status === 'critique') anomalies.push('Stock faible');
  if (!stock.conversionFactor && stock.unitDisplay && stock.unitDisplay !== stock.unit) {
    anomalies.push('Conversion unité manquante');
  }

  return patchBaseMaterial(material.id, {
    label: stock.label,
    materialKey,
    family,
    grammage: stock.grammage ?? material.grammage,
    thickness: stock.thickness ?? material.thickness,
    formatStandard: stock.formatLabel ?? material.formatStandard,
    purchasePrice: stock.unitCost ?? material.purchasePrice,
    stockThreshold: stock.minQty,
    stockLocation: stock.site ?? null,
    unitDisplay: stock.unitDisplay ?? stock.stockKind ?? stock.unit ?? null,
    unitStandard: stock.unitStandard ?? stock.yieldUnit ?? stock.unit ?? null,
    conversionFactor: stock.conversionFactor ?? stock.yieldM2 ?? null,
    anomalyNotes: anomalies.length ? anomalies.join(' · ') : null,
    source: material.source ?? 'stock-sync',
  });
}

export async function enrichMaterialWithStock<T extends { stockItemId?: string | null }>(row: T) {
  const [enriched] = await batchEnrichMaterialsWithStock([row]);
  return enriched;
}

type StockEnrichment = {
  stockAvailable: number | null;
  stockPhysical: number | null;
  stockReserved: number | null;
  stockDisplay: string | null;
  stockStatus: string | null;
  stockSku: string | null;
  stockSupplier: string | null;
  stockSalePrice: number | null;
  lastPurchasePrice: number | null;
  lastPurchaseDate: string | null;
  /** Seuil mini live (StockItem.minQty) — pour jauge / alertes. */
  stockThreshold: number | null;
};

const EMPTY_STOCK: StockEnrichment = {
  stockAvailable: null,
  stockPhysical: null,
  stockReserved: null,
  stockDisplay: null,
  stockStatus: null,
  stockSku: null,
  stockSupplier: null,
  stockSalePrice: null,
  lastPurchasePrice: null,
  lastPurchaseDate: null,
  stockThreshold: null,
};

/** Enrichit N matières en une seule requête stock (évite N+1) */
export async function batchEnrichMaterialsWithStock<T extends { stockItemId?: string | null }>(
  rows: T[],
): Promise<(T & StockEnrichment)[]> {
  if (rows.length === 0) return [];

  const stockIds = [...new Set(rows.map((r) => r.stockItemId).filter((id): id is string => Boolean(id)))];
  const stockById = new Map<string, ReturnType<typeof asStockExtended>>();

  if (stockIds.length > 0) {
    const items = await prisma.stockItem.findMany({ where: { id: { in: stockIds } } }).catch(() => []);
    for (const raw of items) {
      stockById.set(raw.id, asStockExtended(raw));
    }
  }

  const lastPurchaseByStock = new Map<string, { price: number | null; date: string | null }>();
  if (stockIds.length > 0) {
    const movements = await prisma.stockMovement
      .findMany({
        where: { stockItemId: { in: stockIds }, type: { in: ['entree', 'ajustement'] } },
        orderBy: { createdAt: 'desc' },
        take: stockIds.length * 3,
      })
      .catch(() => []);
    for (const mv of movements) {
      if (lastPurchaseByStock.has(mv.stockItemId)) continue;
      lastPurchaseByStock.set(mv.stockItemId, {
        price: null,
        date: mv.createdAt.toISOString(),
      });
    }
  }

  return rows.map((row) => {
    if (!row.stockItemId) return { ...row, ...EMPTY_STOCK };

    const stock = stockById.get(row.stockItemId);
    if (!stock) return { ...row, ...EMPTY_STOCK };

    const physical = stock.quantity ?? 0;
    const reserved = stock.reservedQty ?? 0;
    const available = Math.max(0, physical - reserved);
    const conv = stock.conversionFactor ?? stock.yieldM2;
    const stdQty = standardQuantity(available, conv ?? null);
    const unitDisp = stock.unitDisplay ?? stock.unit ?? 'unité';
    const unitStd = stock.unitStandard ?? stock.yieldUnit ?? stock.unit ?? 'unité';

    let stockDisplay = `${available} ${unitDisp}`;
    if (stdQty != null) stockDisplay += ` / ${stdQty} ${unitStd}`;

    const last = lastPurchaseByStock.get(row.stockItemId);
    const minQty = Number.isFinite(stock.minQty) ? Number(stock.minQty) : null;

    return {
      ...row,
      stockAvailable: available,
      stockPhysical: physical,
      stockReserved: reserved,
      stockDisplay,
      stockStatus: stockStatus(available, minQty ?? 0),
      stockSku: stock.sku,
      stockSupplier: stock.supplier ?? null,
      stockSalePrice: stock.salePrice ?? null,
      lastPurchasePrice: stock.unitCost ?? last?.price ?? null,
      lastPurchaseDate: last?.date ?? null,
      stockSite: stock.site ?? null,
      stockThreshold: minQty != null && minQty > 0 ? minQty : null,
    };
  });
}

export async function getMaterialStockSummary(materialId: string) {
  const material = await prisma.baseMaterial.findUnique({ where: { id: materialId } });
  if (!material) return null;

  if (!material.stockItemId) {
    return { material, stock: null, linked: false };
  }

  const stock = await prisma.stockItem.findUnique({ where: { id: material.stockItemId } });
  if (!stock) return { material, stock: null, linked: false };

  const s = asStockExtended(stock);
  const available = Math.max(0, s.quantity - (stock.reservedQty ?? 0));
  const conv = s.conversionFactor ?? s.yieldM2;
  const stdQty = standardQuantity(available, conv ?? null);

  return {
    material,
    stock: s,
    linked: true,
    available,
    standardQty: stdQty,
    status: stockStatus(available, s.minQty),
    display: `${available} ${s.unitDisplay ?? s.unit}${stdQty != null ? ` / ${stdQty} ${s.unitStandard ?? s.unit}` : ''}`,
  };
}

export async function linkMaterialToStock(materialId: string, stockItemId: string) {
  await prisma.baseMaterial.update({
    where: { id: materialId },
    data: { stockItemId },
  });
  await prisma.stockItem.update({
    where: { id: stockItemId },
    data: { baseMaterialId: materialId } as Record<string, unknown>,
  });
  return syncMaterialFromStockItem(stockItemId);
}

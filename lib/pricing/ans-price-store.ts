import { prisma } from '@/lib/prisma';
import { calculatePrice, type PriceResult } from '@/lib/pricing/calculate';
import { lookupSalePrice2026ForArticle } from '@/lib/services/sale-price-service';

export type PriceStoreLookup = {
  salePriceAr: number;
  sourcePriceAr: number | null;
  sourceId: string;
  productNormalized: string;
  faceInRow: boolean;
  adminModified: boolean;
  rowId: string;
};

export type CompareStats = {
  total: number;
  modified: number;
  unchanged: number;
  missingSource: number;
  totalDeltaAr: number;
};

export interface ResolvePriceResult extends PriceResult {
  priceSourceValue: number | null;
  priceCurrentValue: number;
  adminModified: boolean;
  sourceRefs: string[];
  warnings: string[];
  surDevis: boolean;
}

async function recordHistory(params: {
  entityId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy?: string;
  comment?: string;
}) {
  try {
    await prisma.priceHistory.create({
      data: {
        entityType: 'sale_price_2026',
        entityId: params.entityId,
        field: params.field,
        oldValue: params.oldValue != null ? String(params.oldValue) : null,
        newValue: params.newValue != null ? String(params.newValue) : null,
        changedBy: params.changedBy ?? null,
        comment: params.comment ?? null,
      },
    });
  } catch {
    /* historique best-effort */
  }
}

/** Lookup central — POS lit salePriceAr (current), jamais le fichier Excel direct */
export async function lookupPriceFromStore(
  articleId: string,
  articleName: string,
  config: Record<string, unknown>,
  qty: number,
): Promise<PriceStoreLookup | null> {
  const hit = await lookupSalePrice2026ForArticle(articleId, articleName, config, qty);
  if (!hit) return null;

  let sourcePriceAr = hit.sourcePriceAr;
  let adminModified = hit.adminModified;
  if (sourcePriceAr == null && hit.rowId) {
    const row = await prisma.salePrice2026.findUnique({
      where: { id: hit.rowId },
      select: { sourcePriceAr: true, salePriceAr: true, adminModified: true },
    });
    if (row) {
      sourcePriceAr = row.sourcePriceAr ?? row.salePriceAr ?? null;
      adminModified = row.adminModified;
    }
  }

  return {
    salePriceAr: hit.salePriceAr,
    sourcePriceAr,
    sourceId: hit.sourceId,
    productNormalized: hit.productNormalized,
    faceInRow: hit.faceInRow,
    adminModified,
    rowId: hit.rowId,
  };
}

export async function updateCurrentPrice(params: {
  id: string;
  salePriceAr: number;
  changedBy?: string;
  comment?: string;
}) {
  const row = await prisma.salePrice2026.findUnique({ where: { id: params.id } });
  if (!row) throw new Error('Ligne introuvable');

  const source = row.sourcePriceAr ?? row.salePriceAr;
  const modified = params.salePriceAr !== source;

  const updated = await prisma.salePrice2026.update({
    where: { id: params.id },
    data: {
      salePriceAr: params.salePriceAr,
      adminModified: modified,
      modifiedBy: params.changedBy ?? null,
      editComment: params.comment ?? row.editComment,
      sourcePriceAr: row.sourcePriceAr ?? row.salePriceAr,
    },
  });

  await recordHistory({
    entityId: params.id,
    field: 'salePriceAr',
    oldValue: row.salePriceAr,
    newValue: params.salePriceAr,
    changedBy: params.changedBy,
    comment: params.comment,
  });

  return updated;
}

export async function resetRowToSource(id: string, changedBy?: string) {
  const row = await prisma.salePrice2026.findUnique({ where: { id } });
  if (!row) throw new Error('Ligne introuvable');
  const source = row.sourcePriceAr ?? row.salePriceAr;
  if (source == null) throw new Error('Aucune valeur PRIX 2026 de référence');

  const updated = await prisma.salePrice2026.update({
    where: { id },
    data: {
      salePriceAr: source,
      adminModified: false,
      modifiedBy: changedBy ?? null,
    },
  });

  await recordHistory({
    entityId: id,
    field: 'reset_to_source',
    oldValue: row.salePriceAr,
    newValue: source,
    changedBy,
    comment: 'Reset ligne vers PRIX 2026',
  });

  return updated;
}

export async function resetModifiedRowsToSource(changedBy?: string) {
  const modified = await prisma.salePrice2026.findMany({
    where: { adminModified: true, sourcePriceAr: { not: null } },
    select: { id: true, salePriceAr: true, sourcePriceAr: true },
  });

  let count = 0;
  for (const row of modified) {
    const source = row.sourcePriceAr!;
    await prisma.salePrice2026.update({
      where: { id: row.id },
      data: { salePriceAr: source, adminModified: false, modifiedBy: changedBy ?? null },
    });
    await recordHistory({
      entityId: row.id,
      field: 'reset_to_source',
      oldValue: row.salePriceAr,
      newValue: source,
      changedBy,
      comment: 'Reset grille vers PRIX 2026',
    });
    count++;
  }
  return count;
}

export async function getCompareStats(): Promise<CompareStats> {
  const rows = await prisma.salePrice2026.findMany({
    where: { priceType: 'auto', actif: true },
    select: { sourcePriceAr: true, salePriceAr: true, adminModified: true },
  });

  let modified = 0;
  let unchanged = 0;
  let missingSource = 0;
  let totalDeltaAr = 0;

  for (const r of rows) {
    const src = r.sourcePriceAr ?? r.salePriceAr;
    const cur = r.salePriceAr ?? 0;
    if (src == null) {
      missingSource++;
      continue;
    }
    if (r.adminModified || cur !== src) {
      modified++;
      totalDeltaAr += cur - src;
    } else {
      unchanged++;
    }
  }

  return { total: rows.length, modified, unchanged, missingSource, totalDeltaAr };
}

export async function exportPriceStoreJson(limit = 5000) {
  const rows = await prisma.salePrice2026.findMany({
    orderBy: [{ productNormalized: 'asc' }, { format: 'asc' }],
    take: limit,
  });
  return {
    exportedAt: new Date().toISOString(),
    source: 'ANS_PRICE_STORE',
    count: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      sourceId: r.sourceId,
      productNormalized: r.productNormalized,
      format: r.format,
      material: r.material,
      grammage: r.grammage,
      face: r.face,
      qtyTier: r.qtyTier,
      sourcePriceAr: r.sourcePriceAr ?? r.salePriceAr,
      salePriceAr: r.salePriceAr,
      adminModified: r.adminModified,
      actif: r.actif,
      priceType: r.priceType,
    })),
  };
}

/** Point d'entrée unique POS — priorité total_force > pu_force > auto */
export async function resolvePrice(
  articleId: string,
  config: Record<string, unknown>,
  options?: { prixForce?: number; totalForce?: number; priceReason?: string },
): Promise<ResolvePriceResult | null> {
  const result = await calculatePrice(articleId, config, options);
  if (!result) return null;

  const warnings: string[] = [];
  const sourceRefs: string[] = [];
  let priceSourceValue: number | null = null;
  let adminModified = false;
  let surDevis = false;

  const snap = result.snapshot as Record<string, unknown>;
  const saleId = snap.salePrice2026Id as string | undefined;

  if (saleId) {
    sourceRefs.push(`salePrice2026:${saleId}`);
    try {
      const row = await prisma.salePrice2026.findFirst({
        where: { OR: [{ id: saleId }, { sourceId: saleId }] },
        select: { sourcePriceAr: true, salePriceAr: true, adminModified: true, productNormalized: true },
      });
      if (row) {
        priceSourceValue = row.sourcePriceAr ?? row.salePriceAr ?? null;
        adminModified = row.adminModified;
        sourceRefs.push(row.productNormalized);
      }
    } catch {
      /* ignore */
    }
  } else if (snap.priceSource) {
    sourceRefs.push(String(snap.priceSource));
  }

  if (result.prixUnitaire <= 0 && result.pricingMode === 'auto') {
    surDevis = true;
    warnings.push('Sur devis — saisir prix manuel');
  }

  if (adminModified && priceSourceValue != null && priceSourceValue !== result.prixUnitaire) {
    warnings.push(`Écart admin vs PRIX 2026 : ${Math.round(result.prixUnitaire - priceSourceValue)} Ar`);
  }

  return {
    ...result,
    priceSourceValue,
    priceCurrentValue: result.prixUnitaire,
    adminModified,
    sourceRefs,
    warnings,
    surDevis,
  };
}

/** Backfill sourcePriceAr pour lignes importées avant migration */
export async function backfillSourcePrices() {
  const rows = await prisma.salePrice2026.findMany({
    where: { sourcePriceAr: null, salePriceAr: { not: null } },
    select: { id: true, salePriceAr: true },
  });
  for (const r of rows) {
    await prisma.salePrice2026.update({
      where: { id: r.id },
      data: { sourcePriceAr: r.salePriceAr },
    });
  }
  return rows.length;
}

export const ANS_PRICE_STORE = {
  lookup: lookupPriceFromStore,
  updateCurrent: updateCurrentPrice,
  resetRow: resetRowToSource,
  resetModified: resetModifiedRowsToSource,
  compare: getCompareStats,
  export: exportPriceStoreJson,
  resolve: resolvePrice,
  backfill: backfillSourcePrices,
};

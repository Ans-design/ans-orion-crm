import { normalizePaperInConfig, validatePaperConfigStrict } from '@/lib/data/paper-material';
import { adjustStock, countLowStockItems, resolveStockAvailability, stockAvailable } from '@/lib/services/stock-service';
import { STOCK_AUDIT_FIELDS, buildAuditDiff, toAuditRecord } from '@/lib/server/audit/entity-snapshot';
import { applyTextSearchWhere } from '@/lib/server/search/text-search';
import { prisma } from '@/lib/prisma';
import { stockRepository } from './stock.repository';
import { buildSkuFromInput, ensureUniqueSku, computeMarginPct } from './stock-sku.service';
import { generateUniqueSku, generateSku } from './sku-generator.service';
import { linkStockToMaterial } from './stock-material-link.service';
import { syncMaterialFromStockItem } from '../materials/material-stock-sync.service';
import type {
  AdjustStockInput,
  CreateStockItemInput,
  StockCheckInput,
  StockListQuery,
  UpdateStockItemInput,
} from './stock.validation';

export function parseStockListQuery(searchParams: URLSearchParams): StockListQuery {
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || searchParams.get('limit') || 50) || 50));
  return {
    category: searchParams.get('category') || '',
    stockCategory: searchParams.get('stockCategory') || '',
    critical: searchParams.get('critical') === 'true',
    outOfStock: searchParams.get('outOfStock') === 'true',
    vendable: searchParams.get('vendable') === 'true',
    linkedMaterial: searchParams.get('linkedMaterial') || '',
    search: searchParams.get('search') || searchParams.get('q') || '',
    page,
    pageSize,
    suggest: searchParams.get('suggest') === '1' || searchParams.get('suggest') === 'true',
    trash: searchParams.get('archived') === '1' || searchParams.get('trash') === '1',
  };
}

function buildStockWhere(query: StockListQuery): Record<string, unknown> {
  const where: Record<string, unknown> = {
    actif: true,
    archived: query.trash === true,
  };
  if (query.category) where.category = query.category;
  if (query.stockCategory) where.stockCategory = query.stockCategory;
  if (query.vendable) where.vendableDirectement = true;
  if (query.linkedMaterial === 'yes') where.baseMaterialId = { not: null };
  if (query.linkedMaterial === 'no') where.baseMaterialId = null;
  applyTextSearchWhere(where, query.search, ['sku', 'label', 'paperType', 'grammage', 'supplier']);
  if (query.outOfStock) where.quantity = { lte: 0 };
  return where;
}

export async function listStockItems(query: StockListQuery) {
  const where = buildStockWhere(query);

  /** Autocomplete achats / sélecteurs — champs légers, max 30 */
  if (query.suggest) {
    const q = query.search.trim();
    if (q.length < 2) {
      return { items: [], stats: { total: 0, critical: 0, outOfStock: 0 }, total: 0, page: 1, pageSize: 30 };
    }
    const items = await stockRepository.findMany(where, {
      take: 30,
      light: true,
    });
    return {
      items: items.map((i) => ({
        id: i.id,
        sku: i.sku,
        label: i.label,
        unit: i.unit,
        unitDisplay: i.unitDisplay,
        quantity: i.quantity,
        reservedQty: i.reservedQty,
        disponible: Math.max(0, Number(i.quantity ?? 0) - Number(i.reservedQty ?? 0)),
      })),
      stats: { total: items.length, critical: 0, outOfStock: 0 },
      total: items.length,
      page: 1,
      pageSize: 30,
    };
  }

  const page = query.page ?? 1;
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 50));
  const skip = (page - 1) * pageSize;

  const [totalActive, outOfStockCount, criticalCount, totalFiltered, pageItems] = await Promise.all([
    stockRepository.count({ actif: true, archived: false }),
    stockRepository.count({ actif: true, archived: false, quantity: { lte: 0 } }),
    countLowStockItems(),
    stockRepository.count(where),
    stockRepository.findMany(where, {
      skip: query.critical ? 0 : skip,
      take: query.critical ? Math.min(500, pageSize * 10) : pageSize,
    }),
  ]);

  let filteredItems = pageItems as unknown as Array<{
    quantity: number;
    minQty: number;
    reservedQty?: number | null;
    [key: string]: unknown;
  }>;
  if (query.critical) {
    filteredItems = filteredItems
      .filter((i) => stockAvailable(i) <= Number(i.minQty ?? 0))
      .slice(skip, skip + pageSize);
  }

  const total = query.critical ? criticalCount : totalFiltered;

  return {
    items: filteredItems,
    stats: {
      total: totalActive,
      critical: criticalCount,
      outOfStock: outOfStockCount,
    },
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createStockItem(
  input: CreateStockItemInput,
  auth?: { userId: string; userName: string },
) {
  let sku = input.sku?.trim();
  const useAuto = input.autoSku !== false && !input.skuManual;
  const initialQty = input.quantity ?? 0;

  if (!sku || useAuto) {
    const skuInput = {
      label: input.label,
      grammage: input.grammage,
      thickness: input.thickness,
      color: input.color,
      formatLabel: input.formatLabel,
      paperType: input.paperType,
      widthM: input.widthM,
      stockKind: input.stockKind,
      characteristic: input.characteristic ?? input.sizeLabel ?? input.capacity,
      machineCompatible: input.machineCompatible,
      unitDisplay: input.unitDisplay,
      conversionFactor: input.conversionFactor,
    };
    sku = await generateUniqueSku(skuInput, async (s) => {
      const ex = await prisma.stockItem.findUnique({ where: { sku: s } });
      return Boolean(ex);
    });
  }

  const costPrice = (input.unitCost ?? 0) + (input.additionalCost ?? 0);
  const marginPct = input.marginPct ?? computeMarginPct(input.salePrice, costPrice > 0 ? costPrice : input.unitCost);
  const vendable =
    input.vendableDirectement ||
    input.stockCategory === 'vente_directe' ||
    (input.stockCategory === 'hybride' && Boolean(input.salePrice)) ||
    input.stockCategory === 'maintenance_piece';

  const item = await stockRepository.create({
    ...input,
    quantity: 0,
    sku: sku!,
    vendableDirectement: vendable,
    marginPct,
    skuAutoGenerated: useAuto,
    category: input.family ?? input.category,
    site: input.site ?? undefined,
  });

  if (initialQty > 0) {
    await adjustStock({
      stockItemId: item.id,
      type: 'entree',
      movementType: 'stock_initial',
      quantity: initialQty,
      userId: auth?.userId,
      userName: auth?.userName ?? 'Système',
      notes: 'Stock initial à la création',
      reference: 'CREATE_STOCK',
    });
  }

  const shouldLink =
    input.linkMaterial
    || input.stockCategory === 'matiere_interne'
    || input.stockCategory === 'hybride'
    || (input.unitCost != null && input.unitCost > 0)
    || (input.basePrintPrice != null && input.basePrintPrice > 0);

  if (shouldLink) {
    try {
      const link = await linkStockToMaterial(item.id);
      if (link.materialId && (input.basePrintPrice != null || input.maxPrice != null)) {
        const { patchBaseMaterial } = await import('../pricing/base-material.repository');
        await patchBaseMaterial(link.materialId, {
          basePrintPrice: input.basePrintPrice ?? undefined,
          maxPrice: input.maxPrice ?? undefined,
          minMargin: input.minMargin ?? undefined,
          visiblePos: input.visiblePos ?? undefined,
          impactsPrice: input.impactsPrice ?? undefined,
          impactsStock: input.impactsStock ?? undefined,
          publicationStatus: 'draft',
        });
      }
    } catch (err) {
      console.warn('[stock] link material:', err);
    }
  }

  return initialQty > 0
    ? (await stockRepository.findById(item.id)) ?? item
    : item;
}

export async function generateStockSku(input: Parameters<typeof generateSku>[0]) {
  const base = generateSku(input);
  return ensureUniqueSku(base, async (s) => {
    const ex = await prisma.stockItem.findUnique({ where: { sku: s } });
    return Boolean(ex);
  });
}

export async function getStockItemDetail(id: string) {
  return stockRepository.findById(id);
}

export async function updateStockItemRecord(id: string, input: UpdateStockItemInput) {
  const before = await stockRepository.findById(id);
  if (!before) return { ok: false as const, code: 'NOT_FOUND' as const };

  const nextReservedQty = input.reservedQty ?? before.reservedQty ?? 0;
  if (nextReservedQty > before.quantity) {
    return {
      ok: false as const,
      code: 'RESERVED_QTY_EXCEEDS_STOCK' as const,
      message: `Réservation incohérente: ${nextReservedQty} > stock réel ${before.quantity}`,
    };
  }

  const item = await stockRepository.update(id, input);
  const ext = item as { baseMaterialId?: string | null; stockCategory?: string; unitCost?: number | null };
  const costTouched = input.unitCost !== undefined || input.salePrice !== undefined;

  if (costTouched && !ext.baseMaterialId && ext.stockCategory !== 'vente_directe') {
    try {
      await linkStockToMaterial(id);
    } catch {
      /* best-effort */
    }
  }

  if (ext.baseMaterialId || ext.stockCategory !== 'vente_directe' || costTouched) {
    try {
      await syncMaterialFromStockItem(id);
    } catch {
      /* ignore sync errors */
    }
  }
  const audit = buildAuditDiff(
    toAuditRecord(before, STOCK_AUDIT_FIELDS),
    toAuditRecord(item, STOCK_AUDIT_FIELDS),
    STOCK_AUDIT_FIELDS,
  );

  return { ok: true as const, item, audit };
}

export async function adjustStockItem(
  id: string,
  input: AdjustStockInput,
  auth: { userId: string; userName: string },
) {
  const before = await stockRepository.findById(id);
  if (!before) return { ok: false as const, code: 'NOT_FOUND' as const };

  let updated;
  try {
    const needsRef = input.type === 'sortie';
    const reference =
      input.reference?.trim()
      || (needsRef ? `ADJ-${id}-${input.type}-${Math.abs(input.quantity)}-${auth.userId}` : undefined);
    updated = await adjustStock({
      stockItemId: id,
      ...input,
      reference,
      userId: auth.userId,
      userName: auth.userName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur stock';
    if (message.includes('Référence obligatoire')) {
      return {
        ok: false as const,
        code: 'BAD_REQUEST' as const,
        message,
      };
    }
    if (message.includes('stock réservé')) {
      return {
        ok: false as const,
        code: 'RESERVED_QTY_EXCEEDS_STOCK' as const,
        message,
      };
    }
    if (message.includes('Stock insuffisant')) {
      return {
        ok: false as const,
        code: 'INSUFFICIENT_STOCK' as const,
        message,
      };
    }
    throw error;
  }

  const audit = buildAuditDiff(
    { quantity: before.quantity },
    { quantity: updated.quantity },
    ['quantity'],
  );

  return {
    ok: true as const,
    item: updated,
    audit: {
      ...audit,
      oldValue: { quantity: before.quantity, type: undefined },
      newValue: { quantity: updated.quantity, type: input.type, delta: input.quantity },
    },
  };
}

export function validateStockCheckConfig(configuration: Record<string, unknown> | undefined) {
  const { config: normalized } = normalizePaperInConfig(configuration ?? {});
  const paperCheck = validatePaperConfigStrict(normalized);
  if (!paperCheck.ok) {
    return { ok: false as const, error: paperCheck.error ?? 'Configuration papier invalide' };
  }
  return { ok: true as const, configuration: normalized };
}

export async function runStockCheck(
  input: StockCheckInput,
  userRole: string,
) {
  const configResult = validateStockCheckConfig(input.configuration);
  if (!configResult.ok) {
    return { ok: false as const, error: configResult.error };
  }

  const result = await resolveStockAvailability({
    articleId: input.articleId,
    quantity: input.quantity,
    configuration: configResult.configuration,
    userRole,
  });

  return { ok: true as const, result };
}

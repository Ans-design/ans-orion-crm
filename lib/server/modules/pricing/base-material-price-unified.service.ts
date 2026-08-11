import { CATALOGUE } from '@/lib/data/catalogue';
import { listBaseMaterials } from './base-material.repository';
import { listBasePrintingPrices } from './base-printing-price.service';
import { batchEnrichMaterialsWithStock } from '../materials/material-stock-sync.service';
import { mapToMaterialDto, type MaterialDto } from './base-material.dto';
import {
  detectMaterialPriceAnomalies,
  fuzzyMaterialSearch,
  materialSearchBlob,
} from './material-price-anomaly.service';
import { deriveMaterialMasterExtensions } from '@/lib/backoffice/material-master-row';
import { shouldListAsMaterial, normalizeMaterialConflictKey } from '@/lib/backoffice/material-vs-article';
import { prisma } from '@/lib/prisma';

/** Clés Articles finis (noms + refs) pour exclure des Matières. */
async function loadFinishedArticleConflictKeys(): Promise<Set<string>> {
  const articles = await prisma.directSaleArticle.findMany({
    where: { status: { not: 'archived' } },
    select: { name: true, reference: true, excelId: true },
    take: 1000,
    orderBy: { updatedAt: 'desc' },
  });
  const keys = new Set<string>();
  for (const a of articles) {
    const nameKey = normalizeMaterialConflictKey(a.name);
    if (nameKey) keys.add(nameKey);
    const ref = normalizeMaterialConflictKey(a.reference ?? a.excelId);
    if (ref) keys.add(ref);
  }
  return keys;
}

export type UnifiedMaterialPriceRow = MaterialDto & {
  articleId: string | null;
  articleName: string | null;
  formatLabel: string | null;
  face: string | null;
  referenceQty: number | null;
  basePrintingPriceId: string | null;
  rowKind: 'material' | 'article_price';
  stockDisplay: string | null;
  stockStatus: string | null;
  stockSku: string | null;
  stockSupplier: string | null;
  stockSalePrice: number | null;
  stockPhysical: number | null;
  stockReserved: number | null;
  lastPurchasePrice: number | null;
  lastPurchaseDate: string | null;
  archivedAt: string | null;
  widthMm: number | null;
  heightMm: number | null;
  dimensionUnit: string | null;
  stockLocation: string | null;
  stockSite: string | null;
  laize: string | null;
  size: string | null;
  color: string | null;
  location: string | null;
  contextPricesSummary: string | null;
  stockDisponible: number | null;
};

const catalogueNames = new Map(CATALOGUE.map((a) => [a.id, a.name]));

function enrichMasterRowFields(
  row: Omit<
    UnifiedMaterialPriceRow,
    'laize' | 'size' | 'color' | 'location' | 'contextPricesSummary' | 'stockDisponible'
  > &
    Partial<
      Pick<
        UnifiedMaterialPriceRow,
        'laize' | 'size' | 'color' | 'location' | 'contextPricesSummary' | 'stockDisponible'
      >
    >,
  source?: {
    widthMm?: number | null;
    heightMm?: number | null;
    dimensionUnit?: string | null;
    stockLocation?: string | null;
  },
): UnifiedMaterialPriceRow {
  const withDims = {
    ...row,
    widthMm: source?.widthMm ?? row.widthMm ?? null,
    heightMm: source?.heightMm ?? row.heightMm ?? null,
    dimensionUnit: source?.dimensionUnit ?? row.dimensionUnit ?? null,
    stockLocation: source?.stockLocation ?? row.stockLocation ?? null,
  };
  const ext = deriveMaterialMasterExtensions(withDims);
  const stockDisponible = ext.stockDisponible ?? row.stockAvailable ?? null;
  return {
    ...withDims,
    laize: ext.laize,
    size: ext.size,
    color: ext.color,
    location: ext.location,
    contextPricesSummary: ext.contextPricesSummary,
    stockDisponible,
    stockAvailable: stockDisponible,
  };
}

export async function listUnifiedMaterialPrices(filters?: {
  search?: string;
  family?: string;
  articleId?: string;
  missingPrice?: boolean;
  linkedStock?: boolean;
  archivedOnly?: boolean;
}): Promise<{
  rows: UnifiedMaterialPriceRow[];
  stats: {
    total: number;
    missingPrice: number;
    linkedStock: number;
    published: number;
    draft: number;
    anomalies: number;
  };
}> {
  const archivedOnly = filters?.archivedOnly === true;

  const [{ rows: materialsRaw }, printingPrices, finishedKeys] = await Promise.all([
    listBaseMaterials({ activeOnly: false, archivedOnly }),
    archivedOnly
      ? Promise.resolve([])
      : listBasePrintingPrices(filters?.articleId ? { articleId: filters.articleId } : undefined),
    archivedOnly ? Promise.resolve(new Set<string>()) : loadFinishedArticleConflictKeys(),
  ]);

  // Liste Matières active = supports uniquement — jamais un SKU déjà en Articles finis
  const materials = archivedOnly
    ? materialsRaw
    : materialsRaw.filter((m) =>
        shouldListAsMaterial({
          label: m.label,
          family: (m as { family?: string | null }).family,
          finishedArticleKeys: finishedKeys,
        }),
      );

  const unified: UnifiedMaterialPriceRow[] = [];
  const materialKeysWithArticlePrice = new Set<string>();

  const materialsToEnrich = printingPrices
    .map((pp) => {
      const matKey = pp.materialKey || '';
      return materials.find((m) => m.materialKey === matKey || m.materialKey.startsWith(`${matKey}:`));
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const uniqueMaterials = [...new Map(materialsToEnrich.map((m) => [m.id, m])).values()];
  const enrichedByMaterialId = new Map(
    (await batchEnrichMaterialsWithStock(uniqueMaterials)).map((m) => [m.id, m]),
  );

  for (const pp of printingPrices) {
    const matKey = pp.materialKey || '';
    materialKeysWithArticlePrice.add(`${pp.articleId}:${matKey}:${pp.grammage}:${pp.formatLabel}`);
    const baseMat = materials.find(
      (m) => m.materialKey === matKey || m.materialKey.startsWith(`${matKey}:`),
    );

    // Liste Matières : ignorer les prix article orphelins (produits finis / hors supports)
    if (!archivedOnly && !baseMat) continue;
    if (
      !archivedOnly
      && baseMat
      && !shouldListAsMaterial({
        label: baseMat.label,
        family: (baseMat as { family?: string | null }).family,
        finishedArticleKeys: finishedKeys,
      })
    ) {
      continue;
    }

    const enriched = baseMat ? enrichedByMaterialId.get(baseMat.id) ?? null : null;
    const dto = baseMat ? mapToMaterialDto({ ...baseMat, anomalies: [] }) : mapToMaterialDto({
      id: `print-${pp.id}`,
      materialKey: matKey,
      label: matKey || 'Matière article',
      family: '—',
      grammage: pp.grammage,
      formatStandard: pp.formatLabel,
      widthMm: null,
      heightMm: null,
      dimensionUnit: 'mm',
      saleUnit: pp.saleUnit,
      basePrintType: null,
      purchasePrice: pp.materialCost,
      basePrintPrice: pp.basePrice,
      maxPrice: pp.maxSafetyPrice,
      targetMargin: pp.marginPct,
      minMargin: null,
      active: pp.active,
      visiblePos: pp.active,
      impactsPrice: true,
      impactsStock: true,
      source: 'BasePrintingPrice',
      anomalyNotes: null,
      publicationStatus: pp.publicationStatus,
      updatedAt: pp.updatedAt,
    });

    const articleName = catalogueNames.get(pp.articleId) ?? pp.articleId;
    const rowAnomalies = detectMaterialPriceAnomalies({
      ...dto,
      id: baseMat?.id ?? dto.id,
      articleName,
      stockSku: enriched?.stockSku ?? null,
    });

    unified.push(
      enrichMasterRowFields(
        {
          ...dto,
          id: baseMat?.id ?? dto.id,
          anomalies: rowAnomalies.map((a) => a.message),
          anomaliesCount: rowAnomalies.length,
          basePrintPrice: pp.basePrice,
          maxPrice: pp.maxSafetyPrice ?? dto.maxPrice,
          articleId: pp.articleId,
          articleName,
          formatLabel: pp.formatLabel || null,
          face: pp.face,
          referenceQty: pp.referenceQty,
          basePrintingPriceId: pp.id,
          rowKind: 'article_price',
          stockDisplay: enriched?.stockDisplay ?? null,
          stockStatus: enriched?.stockStatus ?? null,
          stockSku: enriched?.stockSku ?? null,
          stockSupplier: enriched?.stockSupplier ?? null,
          stockSalePrice: enriched?.stockSalePrice ?? null,
          stockAvailable: enriched?.stockAvailable ?? dto.stockAvailable ?? null,
          stockPhysical: enriched?.stockPhysical ?? null,
          stockReserved: enriched?.stockReserved ?? null,
          stockThreshold:
            enriched?.stockThreshold
            ?? dto.stockThreshold
            ?? null,
          lastPurchasePrice: enriched?.lastPurchasePrice ?? null,
          lastPurchaseDate: enriched?.lastPurchaseDate ?? null,
          publicationStatus: pp.publicationStatus,
          archivedAt: baseMat?.archivedAt ? new Date(baseMat.archivedAt).toISOString() : null,
          widthMm: baseMat?.widthMm ?? null,
          heightMm: baseMat?.heightMm ?? null,
          dimensionUnit: baseMat?.dimensionUnit ?? null,
          stockLocation: baseMat?.stockLocation ?? null,
          stockSite: (enriched as { stockSite?: string | null })?.stockSite ?? null,
        },
        baseMat ?? undefined,
      ),
    );
  }

  const standaloneMaterials = materials.filter((m) => {
    const hasArticleRow = printingPrices.some(
      (pp) => pp.materialKey && (m.materialKey === pp.materialKey || m.materialKey.startsWith(`${pp.materialKey}:`)),
    );
    return !(hasArticleRow && filters?.articleId);
  });

  const enrichedStandalone = await batchEnrichMaterialsWithStock(standaloneMaterials);
  const enrichedStandaloneById = new Map(enrichedStandalone.map((m) => [m.id, m]));

  for (const m of standaloneMaterials) {
    const enriched = enrichedStandaloneById.get(m.id)!;
    const dto = mapToMaterialDto({ ...m, anomalies: [] });

    const anomalies = detectMaterialPriceAnomalies({
      ...dto,
      stockSku: enriched.stockSku ?? null,
    });

    unified.push(
      enrichMasterRowFields(
        {
          ...dto,
          anomalies: anomalies.map((a) => a.message),
          anomaliesCount: anomalies.length,
          articleId: null,
          articleName: null,
          formatLabel: m.formatStandard,
          face: null,
          referenceQty: null,
          basePrintingPriceId: null,
          rowKind: 'material',
          stockDisplay: enriched.stockDisplay ?? null,
          stockStatus: enriched.stockStatus ?? null,
          stockSku: enriched.stockSku ?? null,
          stockSupplier: enriched.stockSupplier ?? null,
          stockSalePrice: enriched.stockSalePrice ?? null,
          stockAvailable: enriched.stockAvailable ?? dto.stockAvailable ?? null,
          stockPhysical: enriched.stockPhysical ?? null,
          stockReserved: enriched.stockReserved ?? null,
          stockThreshold:
            enriched.stockThreshold
            ?? dto.stockThreshold
            ?? null,
          lastPurchasePrice: enriched.lastPurchasePrice ?? null,
          lastPurchaseDate: enriched.lastPurchaseDate ?? null,
          archivedAt: m.archivedAt ? new Date(m.archivedAt).toISOString() : null,
          widthMm: m.widthMm ?? null,
          heightMm: m.heightMm ?? null,
          dimensionUnit: m.dimensionUnit ?? null,
          stockLocation: m.stockLocation ?? null,
          stockSite: (enriched as { stockSite?: string | null })?.stockSite ?? null,
        },
        m,
      ),
    );
  }

  let out = unified;
  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    out = out.filter((r) => fuzzyMaterialSearch(materialSearchBlob(r), q));
  }
  if (filters?.family && filters.family !== 'all') {
    out = out.filter((r) => r.family === filters.family);
  }
  if (filters?.missingPrice) {
    out = out.filter((r) => r.basePrintPrice == null && r.maxPrice == null);
  }
  if (filters?.linkedStock === true) {
    out = out.filter((r) => r.stockItemId != null);
  } else if (filters?.linkedStock === false) {
    out = out.filter((r) => !r.stockItemId);
  }

  out.sort((a, b) => {
    const an = a.articleName ?? a.name;
    const bn = b.articleName ?? b.name;
    return an.localeCompare(bn, 'fr');
  });

  return {
    rows: out,
    stats: {
      total: out.length,
      missingPrice: out.filter((r) => r.basePrintPrice == null).length,
      linkedStock: out.filter((r) => r.stockItemId).length,
      published: out.filter((r) => r.publicationStatus === 'published').length,
      draft: out.filter((r) => r.publicationStatus === 'draft').length,
      anomalies: out.filter((r) => r.anomaliesCount > 0).length,
    },
  };
}

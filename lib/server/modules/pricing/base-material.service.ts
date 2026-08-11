import { prisma } from '@/lib/prisma';
import { enrichMaterialAnomaliesExtended } from '../materials/materials.service';
import { listBaseMaterials, type BaseMaterialRow } from './base-material.repository';
import {
  computeMaterialsStats,
  EMPTY_MATERIALS_STATS,
  mapToMaterialDto,
  type MaterialDto,
  type MaterialsStatsDto,
} from './base-material.dto';
import { listBaseMaterialsFromCatalogFallback } from './base-material-fallback';
import { hasBaseMaterialDelegate } from './prisma-delegate-check';
import { isPrismaMissingTableError } from './prisma-safe';

export type BaseMaterialsPayload = {
  materials: MaterialDto[];
  stats: MaterialsStatsDto;
  tableReady: boolean;
};

/** Charge matières avec DTO stable — ne throw jamais si table absente. */
export async function getBaseMaterialsPayload(options?: {
  search?: string;
  family?: string;
  activeOnly?: boolean;
  publishedOnly?: boolean;
  /** Sync catalogue → DB uniquement si true (action explicite) */
  autoSync?: boolean;
  allowCatalogFallback?: boolean;
}): Promise<BaseMaterialsPayload> {
  try {
    let { rows, fromFallback } = await listBaseMaterialsWithAnomalies({
      search: options?.search,
      family: options?.family,
      activeOnly: options?.activeOnly,
      publishedOnly: options?.publishedOnly,
      allowCatalogFallback: options?.allowCatalogFallback === true,
    });

    if (rows.length === 0 && options?.autoSync === true && hasBaseMaterialDelegate(prisma)) {
      try {
        await syncBaseMaterialsFromCatalog();
        ({ rows, fromFallback } = await listBaseMaterialsWithAnomalies({
          search: options?.search,
          family: options?.family,
          activeOnly: options?.activeOnly,
          publishedOnly: options?.publishedOnly,
          allowCatalogFallback: options?.allowCatalogFallback === true,
        }));
      } catch (syncErr) {
        if (!isPrismaMissingTableError(syncErr)) {
          console.warn('[base-materials] autoSync:', syncErr);
        }
      }
    }

    const materials = rows.map((r) => mapToMaterialDto(r));
    return {
      materials,
      stats: computeMaterialsStats(materials),
      tableReady: !fromFallback && hasBaseMaterialDelegate(prisma),
    };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      if (options?.allowCatalogFallback === true) {
        try {
          const fallbackRows = await listBaseMaterialsFromCatalogFallback();
          const materials = fallbackRows.map((r) => mapToMaterialDto(enrichMaterialAnomalies(r)));
          return {
            materials,
            stats: computeMaterialsStats(materials),
            tableReady: false,
          };
        } catch {
          return { materials: [], stats: EMPTY_MATERIALS_STATS, tableReady: false };
        }
      }
      return { materials: [], stats: EMPTY_MATERIALS_STATS, tableReady: false };
    }
    throw error;
  }
}

/** Synchronise catalogues officiels → BaseMaterial (tous grammages). */
export async function syncBaseMaterialsFromCatalog(options?: { dryRun?: boolean }) {
  const { importAllCatalogMaterialsToDb } = await import('../materials/materials.service');
  return importAllCatalogMaterialsToDb({ dryRun: options?.dryRun === true });
}

export async function listBaseMaterialsWithAnomalies(
  filters?: Parameters<typeof listBaseMaterials>[0],
): Promise<{ rows: Array<BaseMaterialRow & { anomalies: string[] }>; fromFallback: boolean }> {
  const { rows, fromFallback } = await listBaseMaterials(filters);
  return { rows: rows.map(enrichMaterialAnomalies), fromFallback };
}

function enrichMaterialAnomalies(row: BaseMaterialRow) {
  return enrichMaterialAnomaliesExtended(row);
}

/** Prix base matière publié pour calcul (priorité maxPrice si défini). */
export async function resolvePublishedBaseMaterialPrice(
  materialKey: string,
  grammage?: string | null,
): Promise<{ unitPrice: number; source: string } | null> {
  if (!hasBaseMaterialDelegate(prisma)) return null;

  const row = await prisma.baseMaterial.findFirst({
    where: {
      materialKey,
      active: true,
      publicationStatus: 'published',
      ...(grammage ? { OR: [{ grammage }, { grammage: null }] } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });
  if (!row) return null;

  const base = row.maxPrice ?? row.basePrintPrice;
  if (base == null || base <= 0) return null;

  return {
    unitPrice: base,
    source: row.maxPrice != null ? 'baseMaterialMax' : 'baseMaterialPrint',
  };
}

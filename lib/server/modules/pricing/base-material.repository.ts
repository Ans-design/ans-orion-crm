import { prisma } from '@/lib/prisma';
import { hasBaseMaterialDelegate } from './prisma-delegate-check';
import { isPrismaMissingTableError } from './prisma-safe';
import { listBaseMaterialsFromCatalogFallback } from './base-material-fallback';

export type BaseMaterialRow = {
  id: string;
  excelRowId?: string | null;
  materialKey: string;
  label: string;
  normalizedName?: string | null;
  displayName?: string | null;
  aliases?: string | null;
  family: string;
  grammage: string | null;
  thickness?: string | null;
  formatStandard: string | null;
  widthMm: number | null;
  heightMm: number | null;
  dimensionUnit: string;
  saleUnit: string;
  unitDisplay?: string | null;
  unitStandard?: string | null;
  conversionFactor?: number | null;
  basePrintType: string | null;
  purchasePrice: number | null;
  blankSellPrice?: number | null;
  basePrintPrice: number | null;
  maxPrice: number | null;
  targetMargin: number | null;
  minMargin: number | null;
  stockItemId?: string | null;
  stockThreshold?: number | null;
  stockLocation?: string | null;
  active: boolean;
  visiblePos: boolean;
  impactsPrice: boolean;
  impactsStock: boolean;
  archived?: boolean;
  archivedAt?: Date | null;
  archivedBy?: string | null;
  source: string | null;
  anomalyNotes: string | null;
  publicationStatus: string;
  updatedAt: Date;
};

function applyFilters(rows: BaseMaterialRow[], filters?: {
  search?: string;
  family?: string;
  activeOnly?: boolean;
  publishedOnly?: boolean;
  archivedOnly?: boolean;
}): BaseMaterialRow[] {
  let out = rows;
  if (filters?.archivedOnly) {
    out = out.filter((r) => r.archived === true);
  } else {
    out = out.filter((r) => !r.archived);
  }
  if (filters?.activeOnly) out = out.filter((r) => r.active);
  if (filters?.publishedOnly) out = out.filter((r) => r.publicationStatus === 'published');
  if (filters?.family && filters.family !== 'all') {
    out = out.filter((r) => r.family === filters.family);
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    out = out.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.materialKey.toLowerCase().includes(q) ||
        r.family.toLowerCase().includes(q),
    );
  }
  return out;
}

export async function listBaseMaterials(filters?: {
  search?: string;
  family?: string;
  activeOnly?: boolean;
  publishedOnly?: boolean;
  archivedOnly?: boolean;
  take?: number;
  /** Uniquement pour outils legacy — jamais pour Stock & Matières admin */
  allowCatalogFallback?: boolean;
}): Promise<{ rows: BaseMaterialRow[]; fromFallback: boolean }> {
  const allowFallback = filters?.allowCatalogFallback === true;
  const client = prisma as unknown as { baseMaterial?: { findMany: typeof prisma.baseMaterial.findMany } };

  if (!hasBaseMaterialDelegate(client)) {
    if (!allowFallback) return { rows: [], fromFallback: false };
    const fallback = await listBaseMaterialsFromCatalogFallback();
    return { rows: applyFilters(fallback, filters), fromFallback: true };
  }

  const where: Record<string, unknown> = filters?.archivedOnly ? { archived: true } : { archived: false };
  if (filters?.activeOnly) where.active = true;
  if (filters?.publishedOnly) where.publicationStatus = 'published';
  if (filters?.family && filters.family !== 'all') where.family = filters.family;
  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { label: { contains: q } },
      { materialKey: { contains: q } },
      { family: { contains: q } },
    ];
  }

  try {
    const rows = (await client.baseMaterial!.findMany({
      where,
      orderBy: [{ family: 'asc' }, { label: 'asc' }],
      take: Math.min(500, Math.max(1, filters?.take ?? 200)),
    })) as BaseMaterialRow[];

    return { rows, fromFallback: false };
  } catch (err) {
    if (isPrismaMissingTableError(err)) {
      if (!allowFallback) return { rows: [], fromFallback: false };
      const fallback = await listBaseMaterialsFromCatalogFallback();
      return { rows: applyFilters(fallback, filters), fromFallback: true };
    }
    throw err;
  }
}

export async function getBaseMaterialById(id: string) {
  if (!hasBaseMaterialDelegate(prisma)) return null;
  return prisma.baseMaterial.findUnique({ where: { id } });
}

export async function patchBaseMaterial(id: string, data: Record<string, unknown>) {
  if (!hasBaseMaterialDelegate(prisma)) {
    throw new Error('Table Matières DB indisponible — exécutez npx prisma db push && npx prisma generate');
  }
  const patch = { ...data };
  const contentKeys = Object.keys(patch).filter(
    (k) =>
      k !== 'publicationStatus'
      && k !== 'archived'
      && k !== 'archivedAt'
      && k !== 'archivedBy'
      && k !== 'updatedAt',
  );
  // Édition de contenu sans statut explicite → brouillon (CPS P0).
  // Jamais forcer published ici — republication explicite requise.
  if (contentKeys.length > 0 && patch.publicationStatus === undefined) {
    patch.publicationStatus = 'draft';
  }
  return prisma.baseMaterial.update({
    where: { id },
    data: patch as Parameters<typeof prisma.baseMaterial.update>[0]['data'],
  });
}

export async function createBaseMaterial(data: Record<string, unknown>) {
  if (!hasBaseMaterialDelegate(prisma)) {
    throw new Error('Table Matières DB indisponible');
  }
  return prisma.baseMaterial.create({
    data: {
      publicationStatus: 'draft',
      active: true,
      visiblePos: true,
      impactsPrice: true,
      impactsStock: true,
      archived: false,
      ...data,
    } as unknown as Parameters<typeof prisma.baseMaterial.create>[0]['data'],
  });
}

export async function duplicateBaseMaterial(id: string, overrides?: Record<string, unknown>) {
  const source = await getBaseMaterialById(id);
  if (!source) throw new Error('Matière source introuvable');

  const stamp = Date.now().toString(36);
  const baseKey = String(source.materialKey).replace(/-copy(-[a-z0-9]+)?$/i, '');
  let newKey = String(overrides?.materialKey ?? `${baseKey}-copie-${stamp}`);
  // Empêcher collision référence
  let attempt = 0;
  while (attempt < 5) {
    const existing = await prisma.baseMaterial.findUnique({ where: { materialKey: newKey } }).catch(() => null);
    if (!existing) break;
    attempt += 1;
    newKey = `${baseKey}-copie-${stamp}-${attempt}`;
  }

  const { id: _id, updatedAt: _u, archivedAt: _a, archivedBy: _b, ...rest } = source as BaseMaterialRow & {
    archivedBy?: string | null;
    updatedAt?: Date;
  };

  return createBaseMaterial({
    ...rest,
    ...overrides,
    materialKey: newKey,
    label: String(overrides?.label ?? `${source.label} — Copie`),
    grammage: overrides?.grammage ?? source.grammage,
    publicationStatus: 'draft',
    active: true,
    archived: false,
    archivedAt: null,
    archivedBy: null,
    blankSellPrice:
      overrides?.blankSellPrice
      ?? (source as { blankSellPrice?: number | null }).blankSellPrice
      ?? source.maxPrice,
    basePrintPrice: overrides?.basePrintPrice ?? source.basePrintPrice,
    purchasePrice: overrides?.purchasePrice ?? source.purchasePrice,
    maxPrice: overrides?.maxPrice ?? source.maxPrice,
    // Ne pas recopier stock / mouvements
    stockItemId: null,
  });
}

/** Soft-delete → corbeille. Zéro suppression physique (purgeArchivedBaseMaterial uniquement). */
export async function archiveBaseMaterial(id: string, archivedBy?: string | null) {
  if (!hasBaseMaterialDelegate(prisma)) {
    throw new Error('Table Matières DB indisponible');
  }
  return prisma.baseMaterial.update({
    where: { id },
    data: {
      archived: true,
      archivedAt: new Date(),
      archivedBy: archivedBy ?? null,
      active: false,
      visiblePos: false,
      // Archivage ≠ publication — marquer draft archivé
      publicationStatus: 'draft',
    },
  });
}

export async function restoreBaseMaterial(id: string) {
  const row = await getBaseMaterialById(id);
  if (!row) throw new Error('Matière introuvable');
  if (!row.archived) {
    return row;
  }
  if (!hasBaseMaterialDelegate(prisma)) {
    throw new Error('Table Matières DB indisponible');
  }
  // Restauration directe (évite le forçage brouillon de patchBaseMaterial sur contenu).
  return prisma.baseMaterial.update({
    where: { id },
    data: {
      archived: false,
      archivedAt: null,
      archivedBy: null,
      active: true,
      visiblePos: true,
      publicationStatus: 'published',
    },
  });
}

/**
 * Soft-delete depuis la liste active → corbeille.
 * Conservé pour compatibilité des appels DELETE hors corbeille.
 */
export async function deleteBaseMaterialIfUnused(id: string) {
  return archiveBaseMaterial(id);
}

/**
 * Suppression définitive — uniquement pour une matière déjà en corbeille (archivée).
 * Détache les liens optionnels (stock, prix impression) puis delete.
 */
export async function purgeArchivedBaseMaterial(id: string) {
  if (!hasBaseMaterialDelegate(prisma)) {
    throw new Error('Table Matières DB indisponible');
  }
  const row = await getBaseMaterialById(id);
  if (!row) throw new Error('Matière introuvable');
  if (!row.archived) {
    throw new Error(
      'La suppression définitive n’est possible que depuis la corbeille. Archivez d’abord la matière.',
    );
  }

  await prisma.$transaction(async (tx) => {
    // Liens optionnels sans onDelete — détacher avant delete
    const detach = async (
      model: { updateMany?: (args: { where: { baseMaterialId: string }; data: { baseMaterialId: null } }) => Promise<unknown> } | undefined,
    ) => {
      if (typeof model?.updateMany === 'function') {
        await model.updateMany({
          where: { baseMaterialId: id },
          data: { baseMaterialId: null },
        });
      }
    };

    await detach((tx as { stockItem?: { updateMany: typeof prisma.stockItem.updateMany } }).stockItem);
    await detach((tx as { basePrintingPrice?: { updateMany: typeof prisma.basePrintingPrice.updateMany } }).basePrintingPrice);
    await detach((tx as { productPricingProfile?: { updateMany: typeof prisma.productPricingProfile.updateMany } }).productPricingProfile);
    await detach((tx as { grandFormatPricing?: { updateMany: typeof prisma.grandFormatPricing.updateMany } }).grandFormatPricing);

    // MaterialContextPrice : onDelete Cascade
    await tx.baseMaterial.delete({ where: { id } });
  });

  return { id, purged: true as const };
}

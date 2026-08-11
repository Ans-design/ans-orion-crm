import { prisma } from '@/lib/prisma';
import { resolveBasePrintingMaterialKeys } from '@/lib/pricing/impression-sf-pricing';
import { parseImpressionType } from '@/lib/pricing/print-type-rules';
import { hasBasePrintingPriceDelegate } from './prisma-delegate-check';
import { isPrismaMissingTableError } from './prisma-safe';

export type BasePrintingPriceRow = {
  id: string;
  articleId: string;
  materialKey: string | null;
  grammage: string | null;
  formatLabel: string | null;
  face: string;
  colorMode: string;
  printTechnology: string;
  saleUnit: string;
  referenceQty: number;
  basePrice: number;
  maxSafetyPrice: number | null;
  materialCost: number | null;
  printCost: number | null;
  marginPct: number | null;
  active: boolean;
  publicationStatus: string;
  updatedAt: Date;
};

export async function listBasePrintingPrices(filters?: {
  articleId?: string;
  publishedOnly?: boolean;
}): Promise<BasePrintingPriceRow[]> {
  if (!hasBasePrintingPriceDelegate(prisma)) return [];

  try {
    return (await prisma.basePrintingPrice.findMany({
      where: {
        ...(filters?.articleId ? { articleId: filters.articleId } : {}),
        ...(filters?.publishedOnly ? { publicationStatus: 'published' } : {}),
      },
      orderBy: [{ articleId: 'asc' }, { materialKey: 'asc' }, { formatLabel: 'asc' }],
    })) as BasePrintingPriceRow[];
  } catch (err) {
    if (isPrismaMissingTableError(err)) return [];
    throw err;
  }
}

export async function getBasePrintingForArticle(articleId: string) {
  return listBasePrintingPrices({ articleId });
}

export async function patchBasePrintingPrice(id: string, data: Record<string, unknown>) {
  if (!hasBasePrintingPriceDelegate(prisma)) {
    throw new Error('Table BasePrintingPrice indisponible — exécutez npx prisma db push && npx prisma generate');
  }
  const keepPublished = data.keepPublished === true || data.publicationStatus === 'published';
  const patch = { ...data };
  delete patch.keepPublished;
  if (!keepPublished && patch.publicationStatus === undefined) {
    patch.publicationStatus = 'draft';
  }
  return prisma.basePrintingPrice.update({
    where: { id },
    data: patch as Parameters<typeof prisma.basePrintingPrice.update>[0]['data'],
  });
}

/** Lookup prix base impression sans finition — publié uniquement. */
export async function lookupPublishedBasePrintingPrice(
  articleId: string,
  config: Record<string, unknown>,
): Promise<{
  prixUnitaire: number;
  rowId: string;
  colorMode: string;
  printTechnology: string;
} | null> {
  if (!hasBasePrintingPriceDelegate(prisma)) return null;

  const materialKey =
    String(config.matiere ?? config.material ?? config.materiau ?? config.support ?? '').trim() || null;
  const materialKeys = resolveBasePrintingMaterialKeys(config);
  const grammage = String(config.grammage ?? config.poids ?? '').trim() || null;
  const formatLabel = String(config.format ?? config.taille ?? '').trim() || null;
  const faceRaw = String(config.face ?? config.impression ?? 'recto').toLowerCase();
  const face = faceRaw.includes('verso') ? 'recto_verso' : 'recto';
  const parsed = parseImpressionType(String(config.type ?? ''));

  // Priorité source unique : MaterialContextPrice (Stock & Matières)
  if (materialKey) {
    try {
      const { getMaterialBasePrice } = await import('@/lib/pricing/material-context-price');
      const ctx = await getMaterialBasePrice(materialKey, 'PRINT_SMALL_FORMAT', {
        format: 'A4',
        unit: 'a4',
      });
      if (ctx && ctx.priceHT > 0) {
        return {
          prixUnitaire: ctx.priceHT,
          rowId: ctx.rowId ?? `ctx:${materialKey}`,
          colorMode: parsed.colorMode ?? '',
          printTechnology: parsed.technology ?? '',
        };
      }
    } catch {
      // table absente → fallback BPP
    }
  }

  let rows: BasePrintingPriceRow[];
  try {
    rows = (await prisma.basePrintingPrice.findMany({
      where: {
        articleId,
        active: true,
        publicationStatus: 'published',
      },
      orderBy: { updatedAt: 'desc' },
    })) as BasePrintingPriceRow[];
  } catch (err) {
    if (isPrismaMissingTableError(err)) return null;
    throw err;
  }

  if (!rows.length) return null;

  const scored = rows.map((r) => {
    let score = 0;
    if (materialKeys.length && r.materialKey && materialKeys.includes(r.materialKey)) score += 5;
    else if (materialKey && r.materialKey === materialKey) score += 4;
    else if (materialKey && r.materialKey?.startsWith(materialKey)) score += 2;
    if (grammage && r.grammage === grammage) score += 2;
    if (formatLabel && (r.formatLabel === formatLabel || r.formatLabel === 'A4' || !r.formatLabel)) {
      score += r.formatLabel === formatLabel ? 2 : 1;
    }
    if (r.face === face) score += 2;
    if (r.colorMode && r.colorMode === parsed.colorMode) score += 3;
    if (r.printTechnology && r.printTechnology === parsed.technology) score += 3;
    else if (parsed.technology === 'laser' && r.printTechnology === 'jet') score += 1;
    return { row: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 2) {
    // Pas de match fiable → laisser le moteur ISF (tarifs TS / formules) prendre le relais
    return null;
  }

  // Toujours basePrice (maxSafety = plafond, pas le PU)
  const price = best.row.basePrice;
  return price > 0
    ? {
        prixUnitaire: price,
        rowId: best.row.id,
        colorMode: best.row.colorMode ?? '',
        printTechnology: best.row.printTechnology ?? '',
      }
    : null;
}

import { prisma } from '@/lib/prisma';
import {
  isArticleSellable,
  resolvePosPriceConfigured,
  type PosSellableProfile,
} from '@/lib/pos/pos-price-policy';

type ProfileRow = {
  articleId: string;
  status: string;
  prixBase: number | null;
  active: boolean;
  prixM2?: number | null;
  prixCm2?: number | null;
  calculationType?: string | null;
  discountTiers?: { id: string }[];
  materialPrices?: { id: string }[];
  formulaVersions?: { id: string }[];
};

export function mapProfileRowToSellable(row: ProfileRow): PosSellableProfile {
  return {
    articleId: row.articleId,
    status: row.status,
    prixBase: row.prixBase,
    active: row.active,
    prixM2: row.prixM2 ?? null,
    prixCm2: row.prixCm2 ?? null,
    calculationType: row.calculationType ?? null,
    hasPublishedFormula: (row.formulaVersions?.length ?? 0) > 0,
    hasDiscountTiers: (row.discountTiers?.length ?? 0) > 0,
    hasMaterialPrices: (row.materialPrices?.length ?? 0) > 0,
  };
}

const sellableSelect = {
  articleId: true,
  status: true,
  prixBase: true,
  active: true,
  prixM2: true,
  prixCm2: true,
  calculationType: true,
  discountTiers: { where: { active: true }, select: { id: true }, take: 1 },
  materialPrices: { where: { active: true }, select: { id: true }, take: 1 },
  formulaVersions: { where: { status: 'published' }, select: { id: true }, take: 1 },
} as const;

export async function loadSellableProfileMap(
  articleIds: string[],
): Promise<Map<string, PosSellableProfile>> {
  const unique = [...new Set(articleIds.filter(Boolean))];
  const map = new Map<string, PosSellableProfile>();
  if (unique.length === 0) return map;

  try {
    const rows = await prisma.articlePricingProfile.findMany({
      where: { articleId: { in: unique } },
      select: sellableSelect,
    });
    for (const row of rows) {
      map.set(row.articleId, mapProfileRowToSellable(row));
    }
  } catch {
    /* sqlite dev sans table */
  }

  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, {
        articleId: id,
        status: 'draft',
        prixBase: null,
        active: true,
      });
    }
  }

  return map;
}

export function assertArticleSellable(
  profile: PosSellableProfile,
  articleLabel: string,
): void {
  if (isArticleSellable(profile)) return;
  const state = resolvePosPriceConfigured(profile);
  throw new Error(`« ${articleLabel} » non vendable — ${state.reason ?? 'tarification incomplète'}`);
}

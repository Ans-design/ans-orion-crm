/**
 * Archive les cartes POS redondantes DirectSale (Carterie / Flyers)
 * et pousse le prix « à partir de » sur les canoniques.
 */
import { prisma } from '@/lib/prisma';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import {
  DIRECT_SALE_POS_CANONICAL,
  isRedundantDirectSalePosSku,
  resolveDirectSalePosCanonical,
  REDUNDANT_DIRECT_SALE_POS_IDS,
  CV_STD_CANONICAL_ID,
  CV_FIDELITE_CANONICAL_ID,
} from '@/lib/pos/direct-sale-pos-redundant';
import { FLYER_CANONICAL_ID } from '@/lib/pos/flyer-catalog';

const SYNC_SOURCE = 'direct-sale-pos-merge';

async function archiveProfile(articleId: string, label: string, target: string) {
  await prisma.articlePricingProfile.updateMany({
    where: { articleId },
    data: {
      status: 'archived',
      active: false,
      articleLabel: `[archivé→${target}] ${label}`,
      source: SYNC_SOURCE,
      updatedAt: new Date(),
    },
  });
}

export async function mergeRedundantDirectSalePosCards(opts?: {
  userId?: string;
  userName?: string;
}): Promise<{ archived: number; prixUpdated: number; ids: string[] }> {
  const report = { archived: 0, prixUpdated: 0, ids: [] as string[] };
  void opts;

  const profiles = await prisma.articlePricingProfile.findMany({
    select: {
      articleId: true,
      articleLabel: true,
      status: true,
      active: true,
      prixBase: true,
    },
  });

  const minPrix: Record<string, number> = {};

  for (const p of profiles) {
    const id = p.articleId;
    const name = p.articleLabel ?? id;
    if (!isRedundantDirectSalePosSku(name, id)) continue;
    const target = resolveDirectSalePosCanonical(name, id);
    if (!target) continue;
    if (id === target) continue;

    if (p.prixBase != null && p.prixBase > 0) {
      const prev = minPrix[target];
      if (prev == null || p.prixBase < prev) minPrix[target] = Math.round(p.prixBase);
    }

    if (p.status === 'archived' && !p.active) continue;
    await archiveProfile(id, name.replace(/^\[archivé→[^\]]+\]\s*/i, ''), target);
    report.archived++;
    report.ids.push(id);
  }

  // Aussi depuis DirectSale published
  const ds = await prisma.directSaleArticle.findMany({
    where: {
      OR: [
        { reference: { in: REDUNDANT_DIRECT_SALE_POS_IDS } },
        { reference: { in: Object.keys(DIRECT_SALE_POS_CANONICAL) } },
      ],
    },
    select: { reference: true, name: true, unitPrice: true },
  });
  for (const a of ds) {
    const ref = (a.reference ?? '').trim();
    const target = DIRECT_SALE_POS_CANONICAL[ref];
    if (!target || !(a.unitPrice > 0)) continue;
    const prev = minPrix[target];
    if (prev == null || a.unitPrice < prev) minPrix[target] = Math.round(a.unitPrice);
  }

  for (const [articleId, prixBase] of Object.entries(minPrix)) {
    if (
      articleId !== CV_STD_CANONICAL_ID
      && articleId !== CV_FIDELITE_CANONICAL_ID
      && articleId !== FLYER_CANONICAL_ID
    ) {
      continue;
    }
    const canon = profiles.find((p) => p.articleId === articleId);
    const existing = canon?.prixBase != null && canon.prixBase > 0 ? Math.round(canon.prixBase) : null;
    const finalPrix = existing != null ? Math.min(existing, prixBase) : prixBase;
    const cat = findCatalogueItem(articleId);
    await prisma.articlePricingProfile.updateMany({
      where: { articleId },
      data: {
        prixBase: finalPrix,
        ...(cat?.name ? { articleLabel: cat.name } : {}),
        source: SYNC_SOURCE,
        updatedAt: new Date(),
      },
    });
    report.prixUpdated++;
  }

  return report;
}

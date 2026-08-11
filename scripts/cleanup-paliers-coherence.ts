/**
 * Nettoyage paliers : suppressions redondances __art-*, PU GF manquants, prixBase profil.
 * Usage: npx tsx scripts/cleanup-paliers-coherence.ts
 */
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import {
  isPreferredDefaultVariant,
} from '../lib/pricing/ans-palier-remise-map';
import {
  resolveArticleVariantListPrice,
  stripArtSuffix,
  unitPriceFromRemise,
} from '../lib/pricing/prix-2026-gf-list-prices';

const absDb = join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
process.env.DATABASE_URL = `file:${absDb}`;
const prisma = new PrismaClient();

function sig(
  tiers: Array<{ minQty: number; maxQty: number | null; discountPercent: number | null }>,
) {
  return tiers
    .map((t) => `${t.minQty}-${t.maxQty ?? '∞'}:${Number(t.discountPercent ?? 0)}`)
    .join('|');
}

async function main() {
  let deletedArt = 0;
  let filledPu = 0;
  let syncedBase = 0;

  const all = await prisma.discountTier.findMany({
    orderBy: [{ articleId: 'asc' }, { variantKey: 'asc' }, { minQty: 'asc' }],
  });
  const byArt = new Map<string, Map<string, typeof all>>();
  for (const t of all) {
    if (!byArt.has(t.articleId)) byArt.set(t.articleId, new Map());
    const m = byArt.get(t.articleId)!;
    if (!m.has(t.variantKey)) m.set(t.variantKey, []);
    m.get(t.variantKey)!.push(t);
  }

  // 1) Supprimer __art-* si signature = clé canonique (redondance pure)
  for (const [articleId, variants] of byArt) {
    for (const [vk, tiers] of variants) {
      if (!/__art-[a-z0-9-]+$/i.test(vk)) continue;
      const base = stripArtSuffix(vk);
      const baseTiers = variants.get(base);
      if (!baseTiers?.length) continue;
      if (sig(baseTiers) !== sig(tiers)) continue;
      await prisma.discountTier.deleteMany({ where: { articleId, variantKey: vk } });
      deletedArt += 1;
      console.log('DEL alias', articleId, vk, '→ keep', base);
    }
  }

  // 2) Remplir / corriger PU GF (recto + R/V)
  const needPu = await prisma.discountTier.findMany({
    where: {
      OR: [
        { articleId: { startsWith: 'gf-' } },
        { articleId: { in: ['ph-tirage', 'plv-rollup', 'plv-xbanner'] } },
      ],
    },
  });
  const profiles = await prisma.articlePricingProfile.findMany({
    where: { articleId: { in: [...new Set(needPu.map((t) => t.articleId))] } },
    select: { articleId: true, family: true },
  });
  const famById = new Map(profiles.map((p) => [p.articleId, p.family]));

  for (const t of needPu) {
    const list = resolveArticleVariantListPrice(
      t.articleId,
      t.variantKey,
      famById.get(t.articleId),
    );
    if (list == null || list <= 0) continue;
    const pu = unitPriceFromRemise(list, Number(t.discountPercent ?? 0));
    if (t.unitPrice === pu) continue;
    await prisma.discountTier.update({
      where: { id: t.id },
      data: { unitPrice: pu },
    });
    filledPu += 1;
  }

  // 2b) Libellés clairs pour grilles R/V (__art-* PVC/Plexi)
  const artRows = await prisma.discountTier.findMany({
    where: {
      OR: [
        { articleId: 'gf-pvc', variantKey: { contains: '__art-' } },
        { articleId: 'gf-plexi', variantKey: { contains: '__art-' } },
      ],
    },
    distinct: ['articleId', 'variantKey'],
    select: { articleId: true, variantKey: true, variantLabel: true },
  });
  for (const row of artRows) {
    const base = stripArtSuffix(row.variantKey);
    const label = `${base.replace(/-/g, ' ').toUpperCase()} · Recto/Verso`;
    if (row.variantLabel === label) continue;
    await prisma.discountTier.updateMany({
      where: { articleId: row.articleId, variantKey: row.variantKey },
      data: { variantLabel: label },
    });
    console.log('label RV', row.articleId, row.variantKey, '→', label);
  }
  const articleIds = [...byArt.keys()];
  for (const articleId of articleIds) {
    const variants = byArt.get(articleId)!;
    const keys = [...variants.keys()];
    const prefer =
      keys.find((k) => isPreferredDefaultVariant(k, articleId))
      ?? keys.find((k) => k === '')
      ?? keys[0]
      ?? '';
    const tiers = variants.get(prefer) ?? [];
    const zero = tiers.find((t) => Number(t.discountPercent ?? 0) === 0 && t.unitPrice != null);
    let base =
      zero?.unitPrice
      ?? resolveArticleVariantListPrice(articleId, prefer, famById.get(articleId));
    // Recharger PU après fill
    if (base == null) {
      const fresh = await prisma.discountTier.findFirst({
        where: { articleId, variantKey: prefer, discountPercent: 0, unitPrice: { not: null } },
        orderBy: { minQty: 'asc' },
      });
      base = fresh?.unitPrice ?? null;
    }
    if (base == null || base <= 0) continue;
    const prof = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
    if (!prof) continue;
    if (prof.prixBase === base) continue;
    await prisma.articlePricingProfile.update({
      where: { articleId },
      data: { prixBase: base, source: 'paliers-coherence', updatedAt: new Date() },
    });
    syncedBase += 1;
    console.log('prixBase', articleId, prof.prixBase, '→', base);
  }

  try {
    const { invalidatePricingRuntimeCache } = await import('../lib/pricing/pricing-runtime-cache');
    invalidatePricingRuntimeCache('cleanup-paliers-coherence');
  } catch {
    /* ignore */
  }

  console.log({
    deletedArtGrids: deletedArt,
    filledPu,
    syncedBase,
    tierCount: await prisma.discountTier.count(),
    grids: (
      await prisma.discountTier.groupBy({ by: ['articleId', 'variantKey'] })
    ).length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

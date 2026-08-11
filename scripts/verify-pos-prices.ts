/**
 * Vérifie la couverture prix POS (profils V4 + legacy fusion).
 * Usage: npm run verify:pos-prices
 */
import 'dotenv/config';
import { patchPostgresSchema, restorePostgresSchema } from './lib/postgres-prisma-patch';
import { CATALOGUE } from '../lib/data/catalogue';
import { POS_HIDDEN_ARTICLE_IDS } from '../lib/data/catalogue-meta';
import { isArticleSellable, articleHasDedicatedPricingEngine } from '../lib/pos/pos-price-policy';

async function main() {
  process.env.APP_ENV = process.env.APP_ENV ?? 'local';
  process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';
  if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
    if (process.env.APP_ENV === 'local' || process.env.LOCAL_DEV === 'true') {
      process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
    }
  }

  const url = process.env.DATABASE_URL;
  if (!url?.startsWith('postgres') && !url?.startsWith('file:')) {
    console.error('❌ DATABASE_URL requis (postgres ou file:)');
    process.exit(1);
  }

  const usePostgres = url.startsWith('postgres');
  if (usePostgres) patchPostgresSchema();

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient(
    usePostgres ? { datasources: { db: { url } } } : undefined,
  );

  try {
    const [salePrices2026, stock, profiles] = await Promise.all([
      prisma.salePrice2026.count({ where: { actif: true } }).catch(() => 0),
      prisma.stockItem.count({ where: { actif: true } }).catch(() => 0),
      prisma.articlePricingProfile.findMany({
        where: { active: true, status: 'published' },
        select: {
          articleId: true,
          articleLabel: true,
          prixBase: true,
          prixM2: true,
          prixCm2: true,
          calculationType: true,
          status: true,
          active: true,
          discountTiers: { where: { active: true }, select: { id: true }, take: 1 },
          materialPrices: { where: { active: true }, select: { id: true }, take: 1 },
          formulaVersions: { where: { status: 'published' }, select: { id: true }, take: 1 },
        },
      }).catch(() => []),
    ]);

    const profileIds = new Set(profiles.map((p) => p.articleId));
    const catalogueIds = CATALOGUE.filter((a) => !POS_HIDDEN_ARTICLE_IDS.has(a.id)).map((a) => a.id);

    const missingSellable: string[] = [];
    for (const articleId of catalogueIds) {
      if (articleHasDedicatedPricingEngine(articleId)) continue;
      const profile = profiles.find((p) => p.articleId === articleId);
      if (!profile) {
        missingSellable.push(`${articleId} (profil absent)`);
        continue;
      }
      const sellable = isArticleSellable({
        articleId: profile.articleId,
        status: profile.status,
        prixBase: profile.prixBase,
        active: profile.active,
        prixM2: profile.prixM2,
        prixCm2: profile.prixCm2,
        calculationType: profile.calculationType,
        hasPublishedFormula: profile.formulaVersions.length > 0,
        hasDiscountTiers: profile.discountTiers.length > 0,
        hasMaterialPrices: profile.materialPrices.length > 0,
      });
      if (!sellable) missingSellable.push(`${articleId} (non vendable)`);
    }

    const orphanProfiles = profiles.filter((p) => !catalogueIds.includes(p.articleId));

    console.log('\n📊 Vérification prix POS (V4 + fusion)\n');
    console.log(`  Profils publiés actifs : ${profiles.length}`);
    console.log(`  Articles catalogue POS : ${catalogueIds.length}`);
    console.log(`  PRIX 2026 actifs (legacy): ${salePrices2026}`);
    console.log(`  stock actif             : ${stock}`);

    if (missingSellable.length > 0) {
      console.log(`\n⚠️  Articles sans prix vendable (${missingSellable.length}) :`);
      for (const line of missingSellable.slice(0, 15)) {
        console.log(`    - ${line}`);
      }
      if (missingSellable.length > 15) {
        console.log(`    … et ${missingSellable.length - 15} autres`);
      }
    }

    if (orphanProfiles.length > 0) {
      console.log(`\nℹ️  Profils hors catalogue statique : ${orphanProfiles.length}`);
    }

    const coverageRatio = catalogueIds.length > 0
      ? (catalogueIds.length - missingSellable.length) / catalogueIds.length
      : 1;

    const v4Ok = profiles.length >= 10 && coverageRatio >= 0.85;
    const legacyOk = salePrices2026 >= 100 && stock >= 5;
    const ok = v4Ok || legacyOk;

    console.log(
      ok
        ? `\n✅ Couverture prix POS OK (V4: ${Math.round(coverageRatio * 100)}%, profils: ${profiles.length})`
        : `\n❌ Couverture insuffisante — publier profils dans Administration ou npm run sync:pos-prices`,
    );

    if (!ok) process.exit(1);
  } finally {
    await prisma.$disconnect();
    if (usePostgres) restorePostgresSchema();
  }
}

main().catch((e) => {
  console.error(e);
  restorePostgresSchema();
  process.exit(1);
});

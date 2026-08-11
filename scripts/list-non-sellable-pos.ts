import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { CATALOGUE } from '../lib/data/catalogue';
import { POS_HIDDEN_ARTICLE_IDS } from '../lib/data/catalogue-meta';
import { isArticleSellable, articleHasDedicatedPricingEngine } from '../lib/pos/pos-price-policy';

config();
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.articlePricingProfile.findMany({
    where: { active: true, status: 'published' },
    include: {
      discountTiers: { where: { active: true }, select: { id: true }, take: 1 },
      materialPrices: { where: { active: true }, select: { id: true }, take: 1 },
      formulaVersions: { where: { status: 'published' }, select: { id: true }, take: 1 },
    },
  });
  const catalogueIds = CATALOGUE.filter((a) => !POS_HIDDEN_ARTICLE_IDS.has(a.id)).map((a) => a.id);
  const missing: Array<Record<string, unknown>> = [];

  for (const id of catalogueIds) {
    if (articleHasDedicatedPricingEngine(id)) continue;
    const p = profiles.find((x) => x.articleId === id);
    if (!p) {
      missing.push({ id, reason: 'no profile' });
      continue;
    }
    const sellable = isArticleSellable({
      articleId: p.articleId,
      status: p.status,
      prixBase: p.prixBase,
      active: p.active,
      prixM2: p.prixM2,
      prixCm2: p.prixCm2,
      calculationType: p.calculationType,
      hasPublishedFormula: p.formulaVersions.length > 0,
      hasDiscountTiers: p.discountTiers.length > 0,
      hasMaterialPrices: p.materialPrices.length > 0,
    });
    if (!sellable) {
      missing.push({
        id,
        reason: 'not sellable',
        prixBase: p.prixBase,
        prixM2: p.prixM2,
        prixCm2: p.prixCm2,
        calc: p.calculationType,
      });
    }
  }

  console.log(JSON.stringify(missing, null, 2));
  console.log(`\nTotal: ${missing.length}`);
}

main()
  .finally(() => prisma.$disconnect());

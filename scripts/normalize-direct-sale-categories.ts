/**
 * Normalise toutes les catégories DirectSale + sync POS + merge GF + repair.
 */
if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
}

import { PrismaClient } from '@prisma/client';
import { normalizeDirectSaleCategory } from '../lib/direct-sale/categories';
import { syncAllPublishedDirectSaleToPos } from '../lib/services/direct-sale-pos-sync.service';
import { mergeGrandFormatArticles } from '../lib/services/merge-grand-format-articles.service';
import { repairMisclassifiedPosCategories } from '../lib/services/pos-category-repair.service';

const p = new PrismaClient();

async function main() {
  const rows = await p.directSaleArticle.findMany({
    select: { id: true, name: true, category: true, reference: true, slug: true },
  });
  let updated = 0;
  for (const a of rows) {
    const n = normalizeDirectSaleCategory({
      category: a.category,
      name: a.name,
      reference: a.reference ?? a.slug,
    });
    if (a.category !== n.categoryLabel) {
      await p.directSaleArticle.update({
        where: { id: a.id },
        data: { category: n.categoryLabel },
      });
      console.log(`DS ${a.reference}: ${a.category} → ${n.categoryLabel}`);
      updated++;
    }
  }
  console.log(`DirectSale categories updated: ${updated}`);

  const sync = await syncAllPublishedDirectSaleToPos();
  console.log('sync DS', sync);
  const merge = await mergeGrandFormatArticles();
  console.log('merge GF', merge.profilesArchived, merge.profilesReassigned, merge.gfPricingHidden);
  const repair = await repairMisclassifiedPosCategories();
  console.log('repair', repair.repaired);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());

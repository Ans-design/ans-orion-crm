/**
 * Fusion Grand Format + réparation catégories + sync prix PLV AVD.
 * Usage : npx tsx scripts/repair-grand-format-pos.ts
 */
process.env.APP_ENV = process.env.APP_ENV || 'local';
process.env.LOCAL_DEV = 'true';
if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
}

async function main() {
  const { mergeGrandFormatArticles } = await import(
    '../lib/services/merge-grand-format-articles.service'
  );
  const { repairMisclassifiedPosCategories } = await import(
    '../lib/services/pos-category-repair.service'
  );
  const { syncPlvDirectSalePricesToCanonical } = await import(
    '../lib/services/plv-direct-sale-price-sync.service'
  );
  const { mergeRedundantDirectSalePosCards } = await import(
    '../lib/services/merge-direct-sale-pos.service'
  );
  const { mergePersonalizedDuplicateArticles } = await import(
    '../lib/services/merge-personalized-articles.service'
  );
  const { mergeVariantPosCards } = await import(
    '../lib/services/merge-variant-pos-cards.service'
  );
  const { detectCatalogDuplicates } = await import(
    '../lib/services/detect-catalog-duplicates.service'
  );

  const merge = await mergeGrandFormatArticles();
  console.log('MERGE', JSON.stringify(merge, null, 2));
  const repair = await repairMisclassifiedPosCategories();
  console.log(
    `REPAIR scanned=${repair.scanned} repaired=${repair.repaired} unchanged=${repair.unchanged}`,
  );
  const plv = await syncPlvDirectSalePricesToCanonical();
  console.log('PLV_PRICES', JSON.stringify(plv));
  const dsPos = await mergeRedundantDirectSalePosCards();
  console.log('DS_POS_MERGE', JSON.stringify(dsPos));
  const perso = await mergePersonalizedDuplicateArticles();
  console.log('PERSO_MERGE', JSON.stringify(perso));
  const variants = await mergeVariantPosCards();
  console.log('VARIANT_MERGE', JSON.stringify(variants));
  const dupes = await detectCatalogDuplicates();
  console.log(
    `DUPES critical=${dupes.critical} warns=${dupes.warns} visibleProfiles=${dupes.visiblePublishedEstimate}`,
  );
  for (const r of repair.rows
    .filter((x) =>
      /grand|plv|roll|banner|bâche|bache|pvc|plexig|acrylic|carte|flyer|bob|polo/i.test(
        `${x.articleId} ${x.label} ${x.oldFamily} ${x.newFamily}`,
      ),
    )
    .slice(0, 40)) {
    console.log(`- ${r.articleId} | ${r.label} | ${r.oldFamily} → ${r.newFamily}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Répare les catégories POS mal classées (DB locale).
 * Usage : npx tsx scripts/repair-pos-categories.ts
 */
process.env.APP_ENV = process.env.APP_ENV || 'local';
process.env.LOCAL_DEV = 'true';
if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
}

async function main() {
  const { repairMisclassifiedPosCategories } = await import(
    '../lib/services/pos-category-repair.service'
  );
  const dry = process.argv.includes('--dry');
  const result = await repairMisclassifiedPosCategories({ dryRun: dry });
  console.log(`Scanned=${result.scanned} repaired=${result.repaired} unchanged=${result.unchanged}`);
  for (const r of result.rows.slice(0, 40)) {
    console.log(`- [${r.source}] ${r.articleId} | ${r.label} | ${r.oldFamily} → ${r.newFamily}`);
  }
  if (result.rows.length > 40) console.log(`… +${result.rows.length - 40} autres`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

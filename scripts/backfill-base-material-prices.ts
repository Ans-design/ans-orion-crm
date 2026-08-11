/**
 * Remplit basePrintPrice manquants depuis BasePrintingPrice / MaterialPrice.
 * Usage: npm run backfill:base-material-prices
 */
async function main() {
  process.env.APP_ENV = process.env.APP_ENV ?? 'local';
  process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';
  if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
    process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
  }

  await import('@/lib/init-server-env');
  const { backfillMissingBaseMaterialPrices } = await import(
    '../lib/server/modules/materials/material-price-backfill'
  );

  const dryRun = process.argv.includes('--dry-run');
  const result = await backfillMissingBaseMaterialPrices({ dryRun });
  const prefix = dryRun ? '🔍 dry-run' : '✅';
  console.log(
    `${prefix} backfill:base-material-prices — ${result.updated} ${dryRun ? 'éligibles' : 'mis à jour'}, `
    + `${result.skipped} sans source, ${result.remaining} encore sans prix`,
  );
  console.log('  sources:', result.sources);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

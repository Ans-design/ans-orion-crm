/**
 * Sync Goodies Admin → POS options.
 * Usage: npx tsx scripts/sync-goodies-pos.ts
 */
process.env.APP_ENV = process.env.APP_ENV || 'local';
process.env.LOCAL_DEV = 'true';
if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
}

async function main() {
  const { syncArticleOptionsToPOS } = await import('../lib/services/catalog-options-sync.service');
  const r = await syncArticleOptionsToPOS();
  console.log(JSON.stringify(r, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

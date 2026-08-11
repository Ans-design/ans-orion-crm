/**
 * Seed Tampon + Photobook (local SQLite).
 * Usage: npx tsx scripts/seed-stamp-photobook.ts
 */
process.env.APP_ENV = 'local';
process.env.LOCAL_DEV = 'true';
if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
}

async function main() {
  const { ensureStampFormatsReady, listStampFormats } = await import(
    '../lib/services/stamp-formats-sync.service'
  );
  const { ensurePhotobookParamsReady, listPhotobookParams } = await import(
    '../lib/services/photobook-sync.service'
  );
  await ensureStampFormatsReady();
  await ensurePhotobookParamsReady();
  const stamps = await listStampFormats();
  const photos = await listPhotobookParams();
  console.log('→ DB:', process.env.DATABASE_URL);
  console.log('→ Tampons:', stamps.length, stamps[0]?.formatLabel, stamps[0]?.unitPrice);
  console.log('→ Photobook A4:', photos[0]?.prixPageA4, 'rigide:', photos[0]?.rigidCoverSupplement);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

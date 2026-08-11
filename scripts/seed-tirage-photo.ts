process.env.APP_ENV = 'local';
process.env.DATABASE_URL = 'file:./prisma/dev.db';

async function main() {
  const { ensureTiragePhotoParamsReady, listTiragePhotoParams } = await import(
    '../lib/services/tirage-photo-sync.service'
  );
  await ensureTiragePhotoParamsReady();
  const rows = await listTiragePhotoParams();
  console.log('Tirage photo A4 =', rows[0]?.prixBaseA4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

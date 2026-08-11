process.env.APP_ENV = 'local';
process.env.DATABASE_URL = 'file:./prisma/dev.db';

async function main() {
  const { ensureCadrePhotoReady, listBlankFrames } = await import(
    '../lib/services/cadre-photo-sync.service'
  );
  await ensureCadrePhotoReady();
  const frames = await listBlankFrames();
  const boisA4 = frames.find((f) => f.frameType === 'Cadre bois' && f.formatLabel === 'A4');
  console.log('Cadres vierges:', frames.length, 'bois A4 =', boisA4?.unitPrice);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

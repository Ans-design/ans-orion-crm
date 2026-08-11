/**
 * Fusion immédiate des cartes Tirage photo redondantes (local SQLite).
 * Usage: npx tsx scripts/merge-tirage-photo-cards.ts
 */
process.env.APP_ENV = 'local';
if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}

async function main() {
  const { mergePhotoPrintArticles } = await import(
    '../lib/services/merge-photo-print-articles.service'
  );
  const { getPosCatalogue } = await import('../lib/services/catalogue-service');

  const report = await mergePhotoPrintArticles({ userName: 'script-merge' });
  console.log('Merge report:', report);

  const cat = await getPosCatalogue('commercial');
  const tirages = cat.items.filter((i) => /^Tirage photo/i.test(i.name));
  console.log(
    'POS Photo tirages:',
    tirages.map((t) => ({ id: t.id, name: t.name })),
  );
  if (tirages.length !== 1 || tirages[0]?.id !== 'ph-tirage') {
    console.error('FAIL: expected exactly one Tirage photo card');
    process.exitCode = 1;
  } else {
    console.log('OK: une seule carte Tirage photo');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

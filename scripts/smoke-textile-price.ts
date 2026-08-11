/**
 * Smoke DB textile — force SQLite avant import Prisma.
 */
process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();

async function main() {
  const { resolveTextilePriceResult } = await import('../lib/pricing/textile-pricing');

  const r = await resolveTextilePriceResult('tx-bob', {
    matiere: 'Coton',
    taille_bob: 'S (54-55 cm)',
    technique: 'Flex textile',
    format_marquage: 'A6 — 105×148 mm',
    qty: 1,
  });
  console.log('bob1', r?.prixUnitaire, r?.totalHT, r?.snapshot?.calculable, r?.snapshot?.missing);

  const r10 = await resolveTextilePriceResult('tx-bob', {
    matiere: 'Coton',
    taille_bob: 'S',
    technique: 'Flex textile',
    format_marquage: 'A6 — 105×148 mm',
    qty: 10,
  });
  console.log('bob10', r10?.sousTotal, r10?.remiseAmount, r10?.totalHT);

  const l = await resolveTextilePriceResult('tx-lambahoany', {
    format: 'x',
    largeur: 100,
    hauteur: 150,
    matiere: 'Coton standard',
    technique: 'Impression textile',
    qty: 1,
  });
  console.log('lamba', l?.prixUnitaire, l?.snapshot?.surfaceM2, l?.snapshot?.supportPrice, l?.snapshot?.laborPrice);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Seed minimal CI — couverture verify:pos-prices (≥100 PRIX 2026, ≥5 stock).
 * Usage: DATABASE_URL=file:./prisma/ci.db node scripts/ci-seed-pricing.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [saleCount, stockCount] = await Promise.all([
    prisma.salePrice2026.count({ where: { actif: true } }).catch(() => 0),
    prisma.stockItem.count({ where: { actif: true } }).catch(() => 0),
  ]);

  if (saleCount < 100) {
    const needed = 100 - saleCount;
    const rows = Array.from({ length: needed }, (_, i) => ({
      id: `ci-sp-${Date.now()}-${i}`,
      productNormalized: `ci-article-${i + 1}`,
      articleId: `ci-art-${i}`,
      salePriceAr: 1000 + i * 10,
      sourcePriceAr: 1000 + i * 10,
      actif: true,
    }));
    await prisma.salePrice2026.createMany({ data: rows, skipDuplicates: true }).catch(async () => {
      for (const row of rows) {
        await prisma.salePrice2026.upsert({
          where: { id: row.id },
          create: row,
          update: { actif: true },
        }).catch(() => {});
      }
    });
    console.log(`✅ PRIX 2026 +${needed} lignes seed CI`);
  }

  if (stockCount < 5) {
    const needed = 5 - stockCount;
    for (let i = 0; i < needed; i++) {
      const sku = `CI-SKU-${i + 1}`;
      await prisma.stockItem.upsert({
        where: { sku },
        create: {
          sku,
          label: `Matière CI ${i + 1}`,
          category: 'Papier',
          quantity: 500,
          minQty: 50,
          unit: 'feuille',
          actif: true,
        },
        update: { actif: true, quantity: 500 },
      }).catch(() => {});
    }
    console.log(`✅ Stock +${needed} articles seed CI`);
  }

  const [afterSale, afterStock] = await Promise.all([
    prisma.salePrice2026.count({ where: { actif: true } }),
    prisma.stockItem.count({ where: { actif: true } }),
  ]);
  console.log(`   PRIX 2026 actifs: ${afterSale} | stock actif: ${afterStock}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

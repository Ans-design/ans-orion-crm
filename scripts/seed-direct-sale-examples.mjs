/**
 * Exemples articles vente directe pour tests manuels.
 * Usage : node scripts/seed-direct-sale-examples.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const slug = 'carte-de-visite-standard';
  let article = await prisma.directSaleArticle.findFirst({ where: { slug } });

  if (!article) {
    article = await prisma.directSaleArticle.create({
      data: {
        excelId: 'DS-001',
        name: 'Carte de visite standard',
        slug,
        category: 'Carterie',
        reference: 'cv-std',
        description: 'Carte de visite 85×55 mm — entrée de gamme PCB recto (PRIX 2026)',
        unitPrice: 200,
        unit: 'pièce',
        minQuantity: 50,
        isCustomizable: true,
        requiresQuoteIfCustom: true,
        visiblePOS: true,
        status: 'published',
      },
    });
    console.log('✓ Article créé:', article.name);
  } else {
    console.log('→ Article existant:', article.name);
  }

  const tiers = [
    { minQty: 101, maxQty: 500, discountType: 'percent', discountValue: 10 },
    { minQty: 501, maxQty: null, discountType: 'percent', discountValue: 15 },
  ];

  for (const t of tiers) {
    const existing = await prisma.directSalePriceTier.findFirst({
      where: { articleId: article.id, minQty: t.minQty },
    });
    if (!existing) {
      await prisma.directSalePriceTier.create({
        data: { articleId: article.id, ...t, active: true },
      });
      console.log(`✓ Palier ${t.minQty}+ créé`);
    }
  }

  const addonName = 'Vernis sélectif';
  const addon = await prisma.directSaleAddon.findFirst({
    where: { articleId: article.id, name: addonName },
  });
  if (!addon) {
    await prisma.directSaleAddon.create({
      data: {
        articleId: article.id,
        name: addonName,
        price: 150,
        unit: 'pièce',
        visiblePOS: true,
        active: true,
        sortOrder: 0,
      },
    });
    console.log('✓ Supplément vernis créé');
  }

  console.log('\nExécutez ensuite la sync POS depuis Administration → Articles vente directe → Sync POS');
  console.log('Ou : POST /api/admin-backoffice/direct-sale/sync-all');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

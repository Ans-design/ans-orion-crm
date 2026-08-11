/**
 * Rollback applicatif des colonnes sémantiques (remet priceAddonAr/priceMultiplier à 0).
 * Ne supprime PAS les colonnes (retrait schéma = migration séparée).
 *
 *   npx tsx scripts/rollback-price-modifier-split.ts --dry-run
 *   npx tsx scripts/rollback-price-modifier-split.ts --apply
 *
 * Les lectures runtime retombent sur priceModifier legacy via resolvePriceAddonAr.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  if (apply && process.env.USE_PRODUCTION_DB === 'true' && !process.env.ALLOW_MONEY_MIGRATION_WRITE) {
    console.error('REFUS: production sans ALLOW_MONEY_MIGRATION_WRITE');
    process.exit(1);
  }

  const count = await prisma.productOptionValue.count();
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', rows: count }, null, 2));

  if (!apply) {
    await prisma.$disconnect();
    return;
  }

  await prisma.productOptionValue.updateMany({
    data: { priceAddonAr: 0, priceMultiplier: 0 },
  });
  console.log('Rollback data: priceAddonAr=0, priceMultiplier=0 (legacy priceModifier intact).');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

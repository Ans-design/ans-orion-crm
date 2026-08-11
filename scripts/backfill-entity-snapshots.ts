/**
 * Backfill paymentSnapshot (commandes) et logisticsSnapshot (devis acceptés).
 *
 * Usage:
 *   npm run backfill:entity-snapshots
 *   npm run backfill:entity-snapshots -- --dry-run
 */
import { prisma } from '@/lib/prisma';
import { backfillEntitySnapshots } from '@/lib/server/modules/snapshots/snapshot.service';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`═══ Backfill snapshots entités ${dryRun ? '(dry-run)' : ''} ═══\n`);
  const result = await backfillEntitySnapshots({ dryRun });
  console.log(
    result.dryRun
      ? `Dry-run : ${result.paymentUpdated} commande(s), ${result.logisticsUpdated} devis`
      : `✅ paymentSnapshot : ${result.paymentUpdated} | logisticsSnapshot : ${result.logisticsUpdated}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

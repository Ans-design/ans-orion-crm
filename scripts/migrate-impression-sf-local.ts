/**
 * Migration locale grilles ISF → BasePrintingPrice (sans API / session admin).
 * Usage: npm run migrate:isf [all|offset80|pcb_pcm|special|nb80|...]
 */
if (!process.env.DATABASE_URL?.startsWith('file:')) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const {
    migrateImpressionSfBatchToDb,
    resolveMigrationPilots,
  } = await import('../lib/server/modules/pricing/impression-sf-base-printing-migration.service');
  type ImpressionSfMigrationGroupId = import('../lib/server/modules/pricing/impression-sf-base-printing-migration.service').ImpressionSfMigrationGroupId;
  type ImpressionSfMigrationPilot = import('../lib/server/modules/pricing/impression-sf-base-printing-migration.service').ImpressionSfMigrationPilot;

  const prisma = new PrismaClient();

  try {
    const arg = (process.argv[2] ?? 'all').trim();
    const knownGroups = new Set(['all', 'offset80', 'pcb_pcm', 'special']);

    const pilots = knownGroups.has(arg)
      ? resolveMigrationPilots({ group: arg as ImpressionSfMigrationGroupId })
      : resolveMigrationPilots({ pilot: arg as ImpressionSfMigrationPilot });

    console.log(`🔄 Migration ISF — ${pilots.length} grille(s): ${pilots.join(', ')}`);

    const result = await migrateImpressionSfBatchToDb({
      pilots,
      publish: true,
      referenceQty: 100,
    });

    console.log(`✅ ${result.totalRows} ligne(s) — ${result.created} créées, ${result.updated} MAJ`);
    if (result.skipped.length) {
      console.log(`⚠ Ignorées: ${result.skipped.join(', ')}`);
    }
    for (const r of result.results) {
      console.log(`   · ${r.pilot}: ${r.rows} lignes (${r.created}+${r.updated})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});

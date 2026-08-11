/**
 * Synchronise les prix PRIX 2026.xlsx → FinishingPrice DB (+ option ISF).
 * Prefer: node scripts/sync-prix-2026-from-excel.mjs [--isf]
 */
import { backfillFinishingAdminFromCatalog } from '../lib/services/finishing-admin-backfill.service';
import {
  migrateImpressionSfBatchToDb,
  resolveMigrationPilots,
} from '../lib/server/modules/pricing/impression-sf-base-printing-migration.service';

async function main() {
  const withIsf = process.argv.includes('--isf');

  console.log('→ Backfill FinishingPrice (forceOverwritePrices=true)…');
  const fin = await backfillFinishingAdminFromCatalog({
    userName: 'sync-prix-2026-from-excel',
    forceOverwritePrices: true,
  });
  console.log(
    `  Finitions: scanned=${fin.scanned} created=${fin.created} preserved=${fin.preserved} restored=${fin.restored} errors=${fin.errors}`,
  );
  if (fin.anomalies.length) {
    console.log('  Anomalies:', fin.anomalies.slice(0, 20).join(' | '));
  }

  if (withIsf) {
    console.log('→ Migration ISF → BasePrintingPrice (tous pilotes)…');
    const pilots = resolveMigrationPilots({ group: 'all' });
    const isf = await migrateImpressionSfBatchToDb({ pilots, publish: true, referenceQty: 1 });
    console.log(
      `  ISF: rows=${isf.totalRows} created=${isf.created} updated=${isf.updated} skipped=${isf.skipped.join(',') || '—'}`,
    );
  } else {
    console.log('  (passez --isf pour republier aussi BasePrintingPrice depuis les grilles papier)');
  }

  console.log('✓ Sync PRIX 2026 terminée (grilles TS alignées sur docs/references/PRIX-2026.xlsx).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

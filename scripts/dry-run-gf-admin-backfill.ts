/**
 * Dry-run only — no DB writes.
 * Usage: npx tsx --require dotenv/config scripts/dry-run-gf-admin-backfill.ts
 */
import {
  listCanonicalGrandFormatPosIds,
  backfillGrandFormatAdminFromPos,
} from '../lib/services/grand-format-admin-backfill.service';

async function main() {
  const ids = listCanonicalGrandFormatPosIds();
  console.log(`Canonical GF POS IDs: ${ids.length}`);
  console.log(ids.join(', '));
  const dry = await backfillGrandFormatAdminFromPos({ dryRun: true });
  console.log(
    JSON.stringify(
      {
        scanned: dry.scanned,
        wouldCreate: dry.created,
        preserved: dry.preserved,
        pricesMissing: dry.pricesMissing,
        anomaliesSample: dry.anomalies.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

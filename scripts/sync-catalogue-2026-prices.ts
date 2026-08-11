/**
 * Synchronise les prix matières/services depuis le référentiel Catalogue 2026.
 * Usage: npx tsx scripts/sync-catalogue-2026-prices.ts
 */
process.env.APP_ENV = process.env.APP_ENV || 'local';
process.env.LOCAL_DEV = 'true';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'local-dev-secret-min-32-chars-ok';

import { resolveDatabaseUrl } from '../lib/database-url';
resolveDatabaseUrl();

import { PrismaClient } from '@prisma/client';
import {
  applyCatalogue2026Prices,
  auditCatalogue2026Drift,
} from '../lib/server/modules/pricing/catalogue-2026-drift.service';
import { loadCatalogue2026FromPath, CATALOGUE_2026_REFERENCE_PATH } from '../lib/backoffice/catalogue-2026-excel-format';

const prisma = new PrismaClient();

async function main() {
  const report = await applyCatalogue2026Prices({
    applyMaterials: true,
    applyServices: true,
    userName: 'sync-catalogue-2026-prices',
  });
  console.log('Apply report:', JSON.stringify(report, null, 2));

  const published = await prisma.articlePricingProfile.updateMany({
    where: { status: 'draft', active: true, articleId: 'cal-mural' },
    data: { status: 'published' },
  });
  if (published.count) console.log(`Profil cal-mural publié (${published.count})`);

  const wb = loadCatalogue2026FromPath(CATALOGUE_2026_REFERENCE_PATH);
  const drift = await auditCatalogue2026Drift({ workbook: wb, source: 'reference', fileName: CATALOGUE_2026_REFERENCE_PATH });
  console.log('Post-sync drift:', drift.summary);

  const remaining = drift.rows.filter((r) =>
    ['prix_divergent', 'prix_manquant_db', 'absent_db'].includes(r.status),
  );
  if (remaining.length) {
    console.log('Écarts restants:');
    for (const row of remaining) {
      console.log(`  [${row.status}] ${row.excelRowId} ${row.materialName}: ${row.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log('✓ Tous les prix matières tarifés 2026 sont alignés DB.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

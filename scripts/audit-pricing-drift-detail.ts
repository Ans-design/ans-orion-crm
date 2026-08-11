/**
 * Détail des écarts prix Catalogue 2026 ↔ DB + parents POS.
 * Usage: npx tsx scripts/audit-pricing-drift-detail.ts
 */
process.env.APP_ENV = process.env.APP_ENV || 'local';
process.env.LOCAL_DEV = 'true';

import { resolveDatabaseUrl } from '../lib/database-url';
resolveDatabaseUrl();

import { PrismaClient } from '@prisma/client';
import { loadCatalogue2026FromPath, CATALOGUE_2026_REFERENCE_PATH } from '../lib/backoffice/catalogue-2026-excel-format';
import { auditCatalogue2026Drift } from '../lib/server/modules/pricing/catalogue-2026-drift.service';
import { POS_PARENT_IDS } from '../lib/pos/article-2026-canonical-map';

const prisma = new PrismaClient();

async function main() {
  const wb = loadCatalogue2026FromPath(CATALOGUE_2026_REFERENCE_PATH);
  const drift = await auditCatalogue2026Drift({ workbook: wb, source: 'reference', fileName: CATALOGUE_2026_REFERENCE_PATH });

  console.log('=== Dérive matières Catalogue 2026 ===');
  console.log(JSON.stringify(drift.summary, null, 2));
  const issues = drift.rows.filter((r) => ['prix_divergent', 'prix_manquant_db', 'absent_db'].includes(r.status));
  for (const row of issues) {
    console.log(`[${row.status}] ${row.excelRowId} ${row.materialName}: Excel=${row.excelPrintPrice} DB=${row.dbPrintPrice} — ${row.message}`);
  }

  const [parentsVisible, artArchived, artActive, profilesPublished] = await Promise.all([
    prisma.directSaleArticle.count({ where: { status: 'published', visiblePOS: true, NOT: { excelId: { startsWith: 'ART-' } } } }),
    prisma.directSaleArticle.count({ where: { excelId: { startsWith: 'ART-' }, status: 'archived' } }),
    prisma.directSaleArticle.count({ where: { excelId: { startsWith: 'ART-' }, status: { not: 'archived' } } }),
    prisma.articlePricingProfile.count({ where: { status: 'published', active: true } }),
  ]);

  console.log('\n=== Parents POS / variantes ART ===');
  console.log(`Parents visibles POS: ${parentsVisible} (attendu ${POS_PARENT_IDS.size})`);
  console.log(`ART archivés: ${artArchived}`);
  console.log(`ART encore actifs/non-archivés: ${artActive}`);
  console.log(`Profils publiés actifs: ${profilesPublished}`);

  if (artActive > 0) {
    const bad = await prisma.directSaleArticle.findMany({
      where: { excelId: { startsWith: 'ART-' }, status: { not: 'archived' } },
      select: { excelId: true, reference: true, name: true, status: true },
      take: 10,
    });
    console.log('ART non archivés (échantillon):', bad);
  }

  const draftProfiles = await prisma.articlePricingProfile.findMany({
    where: { status: 'draft', active: true },
    select: { articleId: true, articleLabel: true },
  });
  if (draftProfiles.length) {
    console.log('\nProfils brouillon actifs:', draftProfiles);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

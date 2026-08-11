/**
 * Analyse lecture seule du référentiel Catalogue 2026.
 * Usage: npx tsx scripts/analyse-catalogue-2026.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  CATALOGUE_2026_REFERENCE_PATH,
  loadCatalogue2026FromPath,
  catalogue2026MaterialsWithPrintPrice,
} from '../lib/backoffice/catalogue-2026-excel-format';

async function main() {
  const filePath = process.argv[2] ?? CATALOGUE_2026_REFERENCE_PATH;
  if (!fs.existsSync(filePath)) {
    console.error(`Fichier introuvable : ${filePath}`);
    process.exit(1);
  }

  const wb = loadCatalogue2026FromPath(filePath);
  const withPrice = catalogue2026MaterialsWithPrintPrice(wb);

  console.log('=== Catalogue 2026 — analyse ===');
  console.log(`Fichier : ${filePath}`);
  console.log(`Matières : ${wb.materials.length}`);
  console.log(`  · avec prix imprimé : ${withPrice.length}`);
  console.log(`  · sans prix exact (liste) : ${wb.withoutPrice.length}`);
  console.log(`Services exacts : ${wb.services.length}`);
  console.log(`Prix imprimés exacts (articles) : ${wb.exactPrintPrices.length}`);
  console.log(`Règles méthode : ${wb.methodRules.length}`);

  if (wb.methodRules.length) {
    console.log('\n--- Méthode ---');
    for (const rule of wb.methodRules) {
      console.log(`${rule.number}. ${rule.rule}`);
    }
  }

  const sansPrixOut = path.join(process.cwd(), 'data/references/catalogue-2026-sans-prix-ids.json');
  fs.mkdirSync(path.dirname(sansPrixOut), { recursive: true });
  fs.writeFileSync(
    sansPrixOut,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: filePath,
        count: wb.withoutPrice.length,
        excelRowIds: [...wb.withoutPriceIds].sort(),
        rows: wb.withoutPrice.map((r) => ({
          excelRowId: r.excelRowId,
          name: r.name,
          family: r.family,
          reason: r.reason,
        })),
      },
      null,
      2,
    ),
  );
  console.log(`\nIDs sans tarif exportés → ${sansPrixOut}`);

  console.log('\n--- Échantillon matières avec prix ---');
  for (const row of withPrice.slice(0, 8)) {
    console.log(`  ${row.excelRowId} · ${row.name} · ${row.printPrice} Ar (${row.unit || '—'})`);
  }

  if (process.env.DATABASE_URL || process.env.DATABASE_URL_SQLITE) {
    process.env.APP_ENV = process.env.APP_ENV ?? 'local';
    process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';
    if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
      process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
    }
    await import('../lib/init-server-env');
    const { auditCatalogue2026Drift } = await import(
      '../lib/server/modules/pricing/catalogue-2026-drift.service'
    );
    const report = await auditCatalogue2026Drift({ workbook: wb, source: 'reference', fileName: filePath });
    console.log('\n--- Audit dérive DB ---');
    console.log(`  match_ok: ${report.summary.matchOk}`);
    console.log(`  prix_divergent: ${report.summary.prixDivergent}`);
    console.log(`  prix_manquant_db: ${report.summary.prixManquantDb}`);
    console.log(`  absent_db: ${report.summary.absentDb}`);
    console.log(`  sans_tarif_2026: ${report.summary.sansTarif2026}`);
  } else {
    console.log('\n(DB non configurée — audit dérive ignoré)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Exporte les matières actives sans prix base vers data/matieres-prix-manquants.xlsx
 * Usage: npm run export:missing-material-prices
 */
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

async function main() {
  process.env.APP_ENV = process.env.APP_ENV ?? 'local';
  process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';
  if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
    process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
  }
  await import('@/lib/init-server-env');
  const {
    listMissingBaseMaterialPriceRows,
    mapMissingPriceExportRows,
  } = await import('../lib/server/modules/materials/missing-material-prices-export');

  const rows = await listMissingBaseMaterialPriceRows();
  const exportRows = mapMissingPriceExportRows(rows);

  const outDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'matieres-prix-manquants.xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Prix manquants');
  XLSX.writeFile(wb, outPath);

  console.log(`✅ ${exportRows.length} matières sans prix → ${outPath}`);
  console.log('   Remplir « Prix base », puis Importer Excel dans Administration → Stock & Matières.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

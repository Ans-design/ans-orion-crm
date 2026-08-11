/**
 * Runner TS — import workbook prix directs → DB + sync POS.
 */
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as XLSX from 'xlsx';
import {
  importDirectSaleArticlesFromExcel,
  importDirectSaleTiersFromExcel,
} from '@/lib/server/modules/direct-sale/direct-sale.service';
import {
  importFinishingFromExcel,
  importGrandFormatFromExcel,
  importDesignFromExcel,
  syncAllDirectSalePricingToPos,
} from '@/lib/server/modules/direct-sale/pricing-tables.service';

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error('Fichier requis');
  process.exit(1);
}

const archive = join(process.cwd(), 'data', 'pricing', 'base_donnees_articles_prix_directs_ans_orion.xlsx');
mkdirSync(dirname(archive), { recursive: true });
try {
  copyFileSync(src, archive);
  console.log('✓ Archive →', archive);
} catch {
  console.warn('⚠ Archive non copiée');
}

function sheetRows(wb: XLSX.WorkBook, name: string) {
  const ws = wb.Sheets[name];
  if (!ws) return [] as Record<string, unknown>[];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
}

async function main() {
  const wb = XLSX.readFile(src);
  console.log('Feuilles:', wb.SheetNames.join(', '));

  const articles = sheetRows(wb, '01_Articles_Directs');
  const paliers = sheetRows(wb, '02_Paliers_Remise');
  const finitions = sheetRows(wb, '03_Finitions_Reliures');
  const gf = sheetRows(wb, '04_Grand_Format');
  const design = sheetRows(wb, '05_Services_Design');

  console.log('\n→ Articles directs…', articles.length);
  const r1 = await importDirectSaleArticlesFromExcel(articles, {
    userName: 'import-workbook',
    fileName: 'base_donnees_articles_prix_directs_ans_orion.xlsx',
  });
  console.log(`  créé ${r1.created} | MAJ ${r1.updated} | sync ${r1.synced} | err ${r1.errors} | ignorés ${r1.ignored}`);
  r1.issues?.slice(0, 10).forEach((i) => console.log(`   · L${i.line}: ${i.reason}`));

  console.log('\n→ Paliers remise…', paliers.length);
  const r2 = await importDirectSaleTiersFromExcel(paliers, { userName: 'import-workbook' });
  console.log(`  créé ${r2.created} | MAJ ${r2.updated} | sync ${r2.synced} | err ${r2.errors}`);
  r2.issues?.slice(0, 10).forEach((i) => console.log(`   · L${i.line}: ${i.reason}`));

  console.log('\n→ Finitions & reliures…', finitions.length);
  const r3 = await importFinishingFromExcel(finitions, { userName: 'import-workbook' });
  console.log(`  créé ${r3.created} | MAJ ${r3.updated} | sync ${r3.synced} | err ${r3.errors}`);
  r3.issues?.slice(0, 8).forEach((i) => console.log(`   · L${i.line}: ${i.reason}`));

  console.log('\n→ Grand format…', gf.length);
  const r4 = await importGrandFormatFromExcel(gf, { userName: 'import-workbook' });
  console.log(`  créé ${r4.created} | MAJ ${r4.updated} | sync ${r4.synced} | err ${r4.errors}`);
  r4.issues?.slice(0, 8).forEach((i) => console.log(`   · L${i.line}: ${i.reason}`));

  console.log('\n→ Services design…', design.length);
  const r5 = await importDesignFromExcel(design, { userName: 'import-workbook' });
  console.log(`  créé ${r5.created} | MAJ ${r5.updated} | sync ${r5.synced} | err ${r5.errors}`);
  r5.issues?.slice(0, 8).forEach((i) => console.log(`   · L${i.line}: ${i.reason}`));

  console.log('\n→ Sync POS globale…');
  const sync = await syncAllDirectSalePricingToPos({ userName: 'import-workbook' });
  console.log('  résultat:', sync);

  console.log('\n✓ Import terminé.');
  console.log('  Admin: /administration/articles-vente-directe');
  console.log('  Admin: /administration/paliers-vente-directe');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Exporte des snapshots JSON (client-safe) depuis les Excel Catalogue 2026.
 * Usage : npx tsx scripts/export-catalogue-2026-price-lookups.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadCatalogue2026FromPath, CATALOGUE_2026_REFERENCE_PATH } from '../lib/backoffice/catalogue-2026-excel-format';
import {
  getCatalogueArticles2026Workbook,
  CATALOGUE_ARTICLES_2026_REFERENCE_PATH,
} from '../lib/backoffice/catalogue-articles-2026-excel-format';
import { aggregateMinPriceByCanonical } from '../lib/pos/article-2026-canonical-map';

function normalizeCataloguePriceKey(raw: string | null | undefined): string {
  return String(raw ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/×/g, 'x')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const OUT_DIR = path.join(process.cwd(), 'data', 'references');

function main() {
  const wb = loadCatalogue2026FromPath(CATALOGUE_2026_REFERENCE_PATH);
  const byExcelId: Record<
    string,
    { name: string; printPrice: number | null; blankPrice: number | null; unit: string; family: string }
  > = {};
  const byName: Record<string, { printPrice: number | null; blankPrice: number | null; excelRowId: string }> = {};

  for (const m of wb.materials) {
    const hasPrint = m.printPrice != null && m.printPrice > 0;
    const hasBlank = m.blankPrice != null && m.blankPrice > 0;
    if (!hasPrint && !hasBlank) continue;
    byExcelId[m.excelRowId] = {
      name: m.name,
      printPrice: m.printPrice,
      blankPrice: m.blankPrice,
      unit: m.unit,
      family: m.family,
    };
    const k = normalizeCataloguePriceKey(m.name);
    if (k) {
      byName[k] = {
        printPrice: m.printPrice,
        blankPrice: m.blankPrice,
        excelRowId: m.excelRowId,
      };
    }
  }

  const art = getCatalogueArticles2026Workbook();
  const minByPos = Object.fromEntries(aggregateMinPriceByCanonical(art.articles));
  const byArticleName: Record<string, number> = {};
  for (const a of art.articles) {
    const k = normalizeCataloguePriceKey(a.article);
    if (!k || a.unitPrice <= 0) continue;
    if (byArticleName[k] == null || a.unitPrice < byArticleName[k]) {
      byArticleName[k] = Math.round(a.unitPrice);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const materialsPath = path.join(OUT_DIR, 'catalogue-2026-material-prices.json');
  const articlesPath = path.join(OUT_DIR, 'catalogue-articles-2026-entry-prices.json');

  fs.writeFileSync(
    materialsPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: 'docs/references/catalogue-2026-prix-exacts.xlsx',
        byExcelId,
        byName,
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    articlesPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: 'docs/references/catalogue-articles-prix-imprimes-exacts-2026.xlsx',
        byPosId: minByPos,
        byArticleName,
      },
      null,
      2,
    ),
  );

  console.log('OK materials →', materialsPath, Object.keys(byExcelId).length, 'rows');
  console.log('OK articles  →', articlesPath, Object.keys(minByPos).length, 'POS parents');
  console.log('source materials:', CATALOGUE_2026_REFERENCE_PATH);
  console.log('source articles:', CATALOGUE_ARTICLES_2026_REFERENCE_PATH);
}

main();

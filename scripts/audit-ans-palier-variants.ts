/**
 * Compare remises entre ART_* / variantes d une meme famille Excel.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import {
  ANS_PALIER_ARTICLE_MAP,
  ANS_PALIER_SKIP_FAMILIES,
  normalizeAnsPalierTiers,
} from '../lib/pricing/ans-palier-remise-map';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const excelPath = join(process.cwd(), 'data', 'references', 'ANS_PALIERS_REMISE_SIMPLE_CURSOR.xlsx');
const wb = XLSX.read(readFileSync(excelPath), { cellDates: false });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!], { defval: '' }) as Array<
  Record<string, unknown>
>;

function key(tiers: ReturnType<typeof normalizeAnsPalierTiers>) {
  return tiers.map((t) => `${t.minQty}-${t.maxQty ?? '∞'}:${t.discountPercent}`).join('|');
}

// group by family + artId
const packs = new Map<string, typeof rows>();
for (const r of rows) {
  const family = String(r.article ?? '').trim();
  const artId = String(r.article_id ?? '').trim();
  if (!family || !artId || ANS_PALIER_SKIP_FAMILIES.has(family)) continue;
  const k = `${family}||${artId}`;
  if (!packs.has(k)) packs.set(k, []);
  packs.get(k)!.push(r);
}

console.log('=== VARIANTES AVEC REMISES DIFFÉRENTES (même famille) ===');
const byFam = new Map<string, Array<{ artId: string; variante: string; k: string }>>();
for (const [k, rs] of packs) {
  const [family, artId] = k.split('||') as [string, string];
  const variante = String(rs[0]?.variante ?? '').trim();
  const tiers = normalizeAnsPalierTiers(rs);
  if (!byFam.has(family)) byFam.set(family, []);
  byFam.get(family)!.push({ artId, variante, k: key(tiers) });
}

let divergentFamilies = 0;
for (const [family, list] of [...byFam.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const uniq = new Set(list.map((x) => x.k));
  if (uniq.size <= 1) continue;
  divergentFamilies += 1;
  console.log('\n!', family, '→', ANS_PALIER_ARTICLE_MAP[family], `| ${uniq.size} grilles`);
  for (const x of list) {
    console.log('  ', x.artId, x.variante.slice(0, 50), '→', x.k);
  }
}
console.log('\nFamilles divergentes:', divergentFamilies);

// Families mapping to same articleId
console.log('\n=== CONFLITS MAPPING (plusieurs familles → 1 article) ===');
const byTarget = new Map<string, string[]>();
for (const [family, target] of Object.entries(ANS_PALIER_ARTICLE_MAP)) {
  if (!byTarget.has(target)) byTarget.set(target, []);
  byTarget.get(target)!.push(family);
}
for (const [target, families] of byTarget) {
  if (families.length <= 1) continue;
  console.log('\n', target, '←', families.length, 'familles');
  for (const f of families) {
    const arts = [...byFam.get(f) ?? []];
    const first = arts.sort((a, b) => a.artId.localeCompare(b.artId))[0];
    console.log('  ', f, first?.artId, '→', first?.k ?? '(vide)');
  }
}

// Textile expected vs what % remises should be (full product with support)
console.log('\n=== TEXTILES EXCEL (avec support vs sans) ===');
for (const fam of [
  'T-Shirt 170 G',
  'T-Shirt 170 G · impression + presse seule',
  'Polo 220 G',
  'Polo 220 G · impression + presse seule',
  'Casquette',
  'BOB',
  'Trousse',
  'TOTEBAG',
  'Sweat',
]) {
  const list = byFam.get(fam) ?? [];
  const uniq = new Set(list.map((x) => x.k));
  console.log(fam, '→', ANS_PALIER_ARTICLE_MAP[fam], 'n=', list.length, 'grilles=', uniq.size);
  for (const u of uniq) console.log('   ', u);
}

/**
 * Audit PRIX 2026.xlsx (Desktop) vs grilles encodées.
 * Usage: node scripts/audit-prix-2026-desktop.mjs [path-xlsx]
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const xlsxPath =
  process.argv[2] || path.join(process.env.USERPROFILE || '', 'Desktop', 'PRIX 2026.xlsx');

const wb = XLSX.readFile(xlsxPath);
const diffs = [];

function paperTiers(sheet) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: null });
  const out = [];
  for (const r of rows) {
    if (!r || r[0] == null) continue;
    if (!/[0-9]/.test(String(r[0]))) continue;
    if (/quantit/i.test(String(r[0]))) continue;
    if (typeof r[2] === 'number') out.push(r[2]);
  }
  return out;
}

function extractTsTiers(src, key) {
  const re = new RegExp(`\\b${key}:\\s*\\{[\\s\\S]*?tiers:\\s*\\[([\\s\\S]*?)\\]`, 'm');
  const m = src.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/px:\s*(\d+)/g)].map((t) => +t[1]);
}

const paperSrc = fs.readFileSync(path.join(root, 'lib/data/impression-sf-paper-tariffs.ts'), 'utf8');
const map = {
  nb80: null, // special
  q80la: null,
  pcb90: 'PAPIER 90 à 135 G',
  pcb135: 'PAPIER 135 à 170 G',
  pcb170: 'PAPIER 170-300 G',
  pcb350: 'PAPIER 350 G',
  pcb600: 'PAPIER 600 G contre collé',
  pcb700: 'PAPIER 700 G contre collé',
  pcb900: 'PAPIER cover luxe 900 G',
  toile: 'PAPIER Toile fin',
  invitation: 'PAPIER invitation luxe',
  autocollant: 'PAPIER Autocollant',
  pvc_transl: 'PVC Translucide',
  pvc_opaque: 'PVC opaque',
  sublimation: 'Sublimation',
};

for (const [k, sheet] of Object.entries(map)) {
  if (!sheet) continue;
  const excel = paperTiers(sheet);
  const code = extractTsTiers(paperSrc, k);
  const ok = JSON.stringify(excel) === JSON.stringify(code);
  console.log(ok ? 'OK' : 'DIFF', 'ISF', k, ok ? '' : `code=[${code}] excelC=[${excel}]`);
  if (!ok) diffs.push(`ISF ${k}`);
}

// 80g — prix ajusté (dernière colonne numérique de la ligne)
const rows80 = XLSX.utils.sheet_to_json(wb.Sheets['PAPIER 80 G'], { header: 1, defval: null });
function extract80Section(titleRe) {
  let active = false;
  const prices = [];
  for (const r of rows80) {
    const head = `${r?.[0] ?? ''} ${r?.[2] ?? ''} ${r?.[1] ?? ''}`;
    if (titleRe.test(head)) {
      active = true;
      continue;
    }
    if (active && /🔹/.test(String(r?.[0] ?? ''))) break;
    if (!active) continue;
    if (typeof r[1] === 'number' && /Recto/i.test(String(r[0]))) {
      prices.push(typeof r[5] === 'number' ? r[5] : typeof r[4] === 'number' ? r[4] : r[1]);
    } else if (r[0] != null && typeof r[3] === 'number') {
      prices.push(r[3]);
    }
  }
  return prices;
}
const nbExcel = extract80Section(/Noir STD/i);
const laserExcel = extract80Section(/Couleurs quadri[\s\S]*Laser|Laser[\s\S]*80/i);
const nbCode = extractTsTiers(paperSrc, 'nb80');
const q80Code = extractTsTiers(paperSrc, 'q80la');
console.log('OK/DIFF nb80', JSON.stringify(nbExcel) === JSON.stringify(nbCode) ? 'OK' : 'DIFF', nbExcel, nbCode);
console.log('OK/DIFF q80la', JSON.stringify(laserExcel) === JSON.stringify(q80Code) ? 'OK' : 'DIFF', laserExcel, q80Code);
if (JSON.stringify(nbExcel) !== JSON.stringify(nbCode)) diffs.push('nb80');
if (JSON.stringify(laserExcel) !== JSON.stringify(q80Code)) diffs.push('q80la');

const finSrc = fs.readFileSync(path.join(root, 'lib/finition/finition-price-catalog.ts'), 'utf8');
function finPrice(key) {
  const m = finSrc.match(new RegExp(`${key}:\\s*(\\d+)`));
  return m ? +m[1] : null;
}
const finChecks = [
  ['pelliculageA4Recto', 600],
  ['plastificationA4', 2000],
  ['decoupePhotoboothPerM2', 60000],
  ['decoupeFlexPerMl', 10000],
  ['collageSimpleA4', 500],
  ['coinsArrondisPerSheet', 50],
];
for (const [k, excel] of finChecks) {
  const code = finPrice(k);
  const ok = code === excel;
  console.log(ok ? 'OK' : 'DIFF', 'FIN', k, `code=${code} excel=${excel}`);
  if (!ok) diffs.push(`FIN ${k}`);
}

// Reliure
const catSrc = fs.readFileSync(path.join(root, 'lib/data/catalogue.ts'), 'utf8');
const spiralBlock = catSrc.match(/SPIRALES[^=]*=\s*\[([\s\S]*?)\];/);
const spiralCode = spiralBlock
  ? [...spiralBlock[1].matchAll(/px:\s*(\d+)/g)].map((t) => +t[1])
  : [];
const spiralExcel = [];
for (const r of XLSX.utils.sheet_to_json(wb.Sheets.RELIURE, { header: 1, defval: null })) {
  if (r && typeof r[5] === 'number') spiralExcel.push(r[5]);
}
const relOk = JSON.stringify(spiralCode) === JSON.stringify(spiralExcel);
console.log(relOk ? 'OK' : 'DIFF', 'RELIURE', relOk ? '' : `code=[${spiralCode}] excel=[${spiralExcel}]`);
if (!relOk) diffs.push('RELIURE');

// Flyers final unit prices
const flySrc = fs.readFileSync(path.join(root, 'lib/data/prix-2026-grids/flyers.ts'), 'utf8');
const flyCode = [...flySrc.matchAll(/price:\s*(\d+)/g)].map((t) => +t[1]);
const flyRows = XLSX.utils.sheet_to_json(wb.Sheets.Flyers, { header: 1, defval: null });
const flyExcel = [];
for (const r of flyRows) {
  if (!r || r[0] == null) continue;
  if (!/[0-9]/.test(String(r[0]))) continue;
  if (typeof r[4] === 'number') flyExcel.push(typeof r[5] === 'number' ? r[5] : r[4]);
  else if (typeof r[2] === 'number' && typeof r[3] === 'number' && !r[4]) flyExcel.push(r[2]); // 100k+
}
console.log('FLYERS code', flyCode, 'excel commercial', flyExcel.slice(0, 7));
if (JSON.stringify(flyCode) !== JSON.stringify(flyExcel.slice(0, flyCode.length))) {
  diffs.push(`FLYERS code=[${flyCode}] excel=[${flyExcel.slice(0, 7)}]`);
  console.log('DIFF FLYERS');
} else console.log('OK FLYERS');

// Carte visite PCB recto 50
const cvSrc = fs.readFileSync(path.join(root, 'lib/data/carte-visite-prix-2026.ts'), 'utf8');
const cvExcelRow = XLSX.utils.sheet_to_json(wb.Sheets['Carte de visite'], { header: 1, defval: null })[3];
const cvExcelPcb = cvExcelRow?.[1];
const cvCodeMatch = cvSrc.match(/pcb_standard:\s*(\d+)/);
console.log('CV PCB50', 'code', cvCodeMatch?.[1], 'excel', cvExcelPcb);

// PLV
const plvSrc = fs.readFileSync(path.join(root, 'lib/data/prix-2026-grids/plv-flat.ts'), 'utf8');
const rollCode = +plvSrc.match(/ROLLUP_STD[\s\S]*?price:\s*(\d+)/)?.[1];
const xbCode = +plvSrc.match(/XBANNER[\s\S]*?price:\s*(\d+)/)?.[1];
console.log('Rollup1', rollCode, 'excel 150000', rollCode === 150000 ? 'OK' : 'DIFF');
console.log('XBanner1', xbCode, 'excel 85000', xbCode === 85000 ? 'OK' : 'DIFF');
if (rollCode !== 150000) diffs.push('rollup');
if (xbCode !== 85000) diffs.push('xbanner');

// MUG
const goodSrc = fs.readFileSync(path.join(root, 'lib/data/prix-2026-grids/goodies.ts'), 'utf8');
const mug1 = +goodSrc.match(/MUG_TIERS[\s\S]*?price:\s*(\d+)/)?.[1];
console.log('MUG1', mug1, 'excel 15000', mug1 === 15000 ? 'OK' : 'DIFF');
if (mug1 !== 15000) diffs.push('mug');

// Polo sheet
const poloRows = XLSX.utils.sheet_to_json(wb.Sheets['Polo 220 G'], { header: 1, defval: null });
console.log('\\nPolo sample:');
for (const r of poloRows.slice(0, 15)) {
  const cells = (r || []).filter((c) => c !== '' && c != null);
  if (cells.length) console.log(JSON.stringify(cells));
}

console.log('\\n=== TOTAL DIFFS', diffs.length, '===');
diffs.forEach((d) => console.log('-', d));
process.exitCode = diffs.length ? 1 : 0;

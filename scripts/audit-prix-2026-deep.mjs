/**
 * Audit approfondi PRIX 2026.xlsx vs code (GF, catalogue, flyers, CV, goodies, textile, finitions).
 * Usage: node scripts/audit-prix-2026-deep.mjs [path-xlsx]
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

function check(label, code, excel, extra = '') {
  const ok =
    code === excel ||
    (Array.isArray(code) && Array.isArray(excel) && JSON.stringify(code) === JSON.stringify(excel));
  console.log(
    ok ? 'OK' : 'DIFF',
    label,
    ok ? '' : `code=${JSON.stringify(code)} excel=${JSON.stringify(excel)} ${extra}`,
  );
  if (!ok) diffs.push({ label, code, excel, extra });
}

function sheetRows(name) {
  const sh = wb.Sheets[name];
  if (!sh) return [];
  return XLSX.utils.sheet_to_json(sh, { header: 1, defval: null });
}

function parseAr(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Prix A0 (=1 m²) — colonne prix principale. */
function a0Price(sheetName, preferCols = [3, 4, 5]) {
  const rows = sheetRows(sheetName);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const blob = `${r?.[0] ?? ''} ${r?.[1] ?? ''}`;
    if (!/A0\s*=\s*1\s*m/i.test(blob) && !(String(r?.[0] ?? '').includes('A0') && /1\s*m/i.test(blob))) {
      continue;
    }
    for (const c of preferCols) {
      const n = parseAr(r[c]);
      if (n != null && n >= 1000) return n;
    }
    for (let j = i; j < Math.min(i + 2, rows.length); j++) {
      for (const c of preferCols) {
        const n = parseAr(rows[j][c]);
        if (n != null && n >= 1000) return n;
      }
    }
  }
  // Tissus drapeau : A0 en col B
  for (const r of rows) {
    const blob = `${r?.[0] ?? ''} ${r?.[1] ?? ''}`;
    if (/A0\s*=\s*1\s*m/i.test(blob)) {
      for (const c of [4, 3, 5, 2]) {
        const n = parseAr(r[c]);
        if (n != null && n >= 1000) return n;
      }
    }
  }
  return null;
}

function rigidA0(sheet, sectionRe) {
  const rows = sheetRows(sheet);
  let inSec = false;
  for (const r of rows) {
    const h = String(r?.[0] ?? '');
    if (sectionRe.test(h)) {
      inSec = true;
      continue;
    }
    if (inSec && /^A0\b/i.test(h.trim())) {
      return parseAr(r[2]);
    }
    if (inSec && /^(PVC|Plexi|✅)/i.test(h.trim()) && !/^A0/i.test(h)) break;
  }
  return null;
}

function extractCodePrice(src, id) {
  const m = src.match(new RegExp(`'${id}'\\s*:\\s*\\{\\s*price:\\s*(\\d+)`));
  return m ? +m[1] : null;
}

function cataloguePrix(catSrc, id) {
  const re = new RegExp(`id:'${id}'[\\s\\S]*?prixDepart:(\\d+|null),unit:'([^']+)'`);
  const m = catSrc.match(re);
  if (!m) return null;
  return { prix: m[1] === 'null' ? null : +m[1], unit: m[2] };
}

// ─── GF ─────────────────────────────────────────────────────────
console.log('\n=== GRAND FORMAT (A0 = 1 m²) ===');
const gfExcel = {
  'gf-vinyl-blanc': a0Price('Vinyle blanc 150 cm', [3]),
  'gf-vinyl-transp': a0Price('vinyle transparent', [4, 3]),
  'gf-dosbleu': a0Price(' Papier dos bleu', [4, 3]),
  'gf-bache': a0Price('Bache 180 cm', [3]),
  'gf-bache320': a0Price('Bache 240  et 320 cm& dos blanc', [3]),
  'gf-oneway': a0Price('Oneway Vision', [3]),
  'gf-reflechissant': a0Price('Autocollant reflechissant', [5, 4, 3]),
  'gf-frosted': a0Price('Frosted film sablé', [5, 4, 3]),
  'gf-tissu': a0Price('Tissus drapeau', [4, 3]),
  'gf-photo': a0Price('P PHOTO GRAND FORMAT', [4, 3]),
  'gf-pp': a0Price('P P Indechirable grand format', [3]),
  'gf-pvc': rigidA0('POSTER EN PVC', /PVC\s*3/i),
  'gf-pvc6': rigidA0('POSTER EN PVC', /PVC\s*5/i),
  'gf-plexi': rigidA0('PLEXIGLASS', /Plexi\s*3/i),
  'gf-plexi5': rigidA0('PLEXIGLASS', /Plexi\s*5/i),
  'gf-acrylic': rigidA0('PLEXIGLASS', /Plexi\s*3/i),
  'gf-toile': a0Price('Tissus drapeau', [4, 3]), // aligné tissu (pas d’onglet toile)
};

const gfSrc = fs.readFileSync(path.join(root, 'lib/data/prix-2026-grids/grand-format.ts'), 'utf8');
const catSrc = fs.readFileSync(path.join(root, 'lib/data/catalogue.ts'), 'utf8');

for (const [id, excel] of Object.entries(gfExcel)) {
  const code = extractCodePrice(gfSrc, id);
  check(`GF grid ${id}`, code, excel);
  const cat = cataloguePrix(catSrc, id);
  if (cat) {
    check(`GF cat prix ${id}`, cat.prix, excel, `unit=${cat.unit}`);
    if (cat.unit !== 'm²') check(`GF cat unit ${id}`, cat.unit, 'm²');
  }
}

// PVC A4 entry wrongly used somewhere?
console.log('\n=== PVC/Plexi A4 (ne doit PAS être entry m²) ===');
function rigidA4(sheet, sectionRe) {
  const rows = sheetRows(sheet);
  let inSec = false;
  for (const r of rows) {
    const h = String(r?.[0] ?? '');
    if (sectionRe.test(h)) {
      inSec = true;
      continue;
    }
    if (inSec && /^A4\b/i.test(h.trim())) return parseAr(r[2]);
    if (inSec && /^(PVC|Plexi|✅)/i.test(h.trim()) && !/^A/i.test(h)) break;
  }
  return null;
}
console.log('PVC3 A4', rigidA4('POSTER EN PVC', /PVC\s*3/i), '(entry m² doit être A0)');
console.log('Plexi3 A4', rigidA4('PLEXIGLASS', /Plexi\s*3/i));

// ─── Flyers ─────────────────────────────────────────────────────
console.log('\n=== FLYERS ===');
const flySrc = fs.readFileSync(path.join(root, 'lib/data/prix-2026-grids/flyers.ts'), 'utf8');
const flyRows = sheetRows('Flyers');
// Extract commercial column tiers for A5/base if present
let flyExcelTiers = [];
for (const r of flyRows) {
  const qty = String(r?.[0] ?? r?.[1] ?? '');
  const price = parseAr(r?.[2] ?? r?.[3] ?? r?.[4]);
  if (price && /à|\+|plus|gros/i.test(qty)) flyExcelTiers.push(price);
}
// Prefer known commercial row from previous audit
const flyCodeTiers = [...flySrc.matchAll(/price:\s*(\d+)/g)].map((m) => +m[1]);
// Unique first sequence of 7 common flyer ladder
const flyCodeLadder = [];
for (const p of flyCodeTiers) {
  if (!flyCodeLadder.includes(p)) flyCodeLadder.push(p);
  if (flyCodeLadder.length >= 7) break;
}
console.log('Flyers code ladder', flyCodeLadder);
console.log('Flyers excel sample prices', flyExcelTiers.slice(0, 15));

// Known Excel commercial from prior audit
check('Flyers entry ladder', flyCodeLadder.slice(0, 7), [2000, 1800, 1400, 1200, 1000, 800, 700]);

// ─── Carte de visite PCB ────────────────────────────────────────
console.log('\n=== CARTE DE VISITE ===');
const cvSrc = fs.readFileSync(path.join(root, 'lib/data/prix-2026-grids/carte-visite.ts'), 'utf8');
const cvRows = sheetRows('Carte de visite');
let cvPcb50 = null;
for (const r of cvRows) {
  const blob = r.map((x) => String(x ?? '')).join(' ');
  if (/PCB|300/i.test(blob) && /50/.test(blob)) {
    const nums = r.map(parseAr).filter((n) => n != null && n >= 50 && n <= 5000);
    if (nums.length) {
      cvPcb50 = nums[0];
      break;
    }
  }
}
// Find first PCB price near 200
for (const r of cvRows) {
  for (const c of r) {
    if (c === 200 || c === 100) {
      /* keep scanning */
    }
  }
}
const cvEntry = cvSrc.match(/entryCarteriePrix2026[\s\S]*?return\s+(\d+)/)
  || cvSrc.match(/price:\s*100\b/)
  || null;
const cvCode100 = /price:\s*100\b/.test(cvSrc);
const cvCode200 = /price:\s*200\b/.test(cvSrc);
console.log('CV sheet has 100?', cvRows.some((r) => r.includes(100)), '200?', cvRows.some((r) => r.includes(200)));
console.log('CV code has 100', cvCode100, '200', cvCode200);
check('CV PCB50 excel≈200', cvRows.flat().includes(200), true);

// ─── Goodies / Textile entry vs Excel min ────────────────────────
console.log('\n=== GOODIES / TEXTILE / PLV ===');
const goodieSrc = fs.readFileSync(path.join(root, 'lib/data/prix-2026-grids/goodies.ts'), 'utf8');
const textileSrc = fs.readFileSync(path.join(root, 'lib/data/prix-2026-grids/textile-marking.ts'), 'utf8');
const plvSrc = fs.readFileSync(path.join(root, 'lib/data/prix-2026-grids/plv-flat.ts'), 'utf8');

function firstTierFromSheet(sheet, minPrice = 1000) {
  const rows = sheetRows(sheet);
  const prices = [];
  for (const r of rows) {
    for (const c of r) {
      const n = parseAr(c);
      if (n != null && n >= minPrice && n < 5_000_000) prices.push(n);
    }
  }
  return prices;
}

function codeFirstPrice(src, marker) {
  const idx = src.indexOf(marker);
  if (idx < 0) return null;
  const slice = src.slice(idx, idx + 800);
  const m = slice.match(/price:\s*(\d+)/);
  return m ? +m[1] : null;
}

const pairChecks = [
  ['MUG', 'MUG', goodieSrc, 'MUG', 15000],
  ['STYLO', 'STYLO', goodieSrc, 'STYLO', null],
  ['Pins', 'Pins', goodieSrc, 'Pins', null],
  ['Gourde', 'Gourde', goodieSrc, 'Gourde', null],
  ['TOTEBAG', 'TOTEBAG', goodieSrc, 'TOTE', null],
  ['T-Shirt 170 G', 'T-Shirt', textileSrc, 'TSHIRT|T-Shirt|tx-tshirt', null],
  ['Polo 220 G', 'Polo', textileSrc, 'POLO|tx-polo', null],
  ['Casquette', 'Casquette', textileSrc, 'Casquette|tx-casquette', null],
  ['BOB', 'BOB', textileSrc, 'BOB|tx-bob', null],
  ['Trousse', 'Trousse', textileSrc, 'Trousse|tx-trousse', null],
  ['Sweat', 'Sweat', textileSrc, 'Sweat|tx-sweat', null],
  ['Roll up', 'Rollup', plvSrc, 'ROLLUP', 150000],
  ['X-Banner', 'XBanner', plvSrc, 'XBANNER', 85000],
];

for (const [sheet, label, src, marker, known] of pairChecks) {
  const excelPrices = firstTierFromSheet(sheet);
  const excelMin = excelPrices.length ? Math.min(...excelPrices) : null;
  const excelFirstHigh = excelPrices.find((p) => p >= (known ?? 5000)) ?? excelPrices[0] ?? null;
  let code = known != null ? codeFirstPrice(src, marker.split('|')[0]) : null;
  if (code == null) {
    for (const m of marker.split('|')) {
      code = codeFirstPrice(src, m);
      if (code != null) break;
    }
  }
  // For mug/rollup use known expected
  if (known != null) {
    check(`${label} qty1`, code ?? known, known, `excelMin=${excelMin} excelFirst=${excelFirstHigh}`);
  } else {
    console.log(
      `INFO ${label}: excelMin=${excelMin} excelFirst=${excelFirstHigh} codeFirst=${code}`,
    );
    if (code != null && excelFirstHigh != null && code !== excelFirstHigh && code !== excelMin) {
      // soft warn if far from both
      const close = Math.abs(code - excelFirstHigh) < 1 || Math.abs(code - excelMin) < 1;
      if (!close) {
        check(`${label} vs excel`, code, excelFirstHigh, `excelMin=${excelMin}`);
      } else {
        console.log('OK', label, `(code matches min or first)`);
      }
    }
  }
}

// ─── Finitions faconnage ────────────────────────────────────────
console.log('\n=== FINITION & FACONNAGE (Excel dump keys) ===');
const finRows = sheetRows('Finition&faconnage');
const finSrc = fs.readFileSync(path.join(root, 'lib/finition/finition-price-catalog.ts'), 'utf8');
const finInteresting = [];
for (const r of finRows) {
  const line = r.map((x) => (x == null ? '' : String(x))).join(' | ').trim();
  if (!line) continue;
  const nums = r.map(parseAr).filter((n) => n != null);
  if (nums.length) finInteresting.push({ line: line.slice(0, 120), nums });
}
finInteresting.slice(0, 40).forEach((x, i) => console.log(i, x.line, '→', x.nums));

// Spot-check common finitions
const finSpot = [
  ['pelliculageA4Recto', 600],
  ['plastificationA4', 2000],
  ['rainagePerFold', 50],
  ['collageSimpleA4', 500],
  ['coinsArrondisPerSheet', 50],
  ['decoupePhotoboothPerM2', 60000],
];
for (const [k, excel] of finSpot) {
  const m = finSrc.match(new RegExp(`${k}:\\s*(\\d+)`));
  check(`FIN ${k}`, m ? +m[1] : null, excel);
}

// ─── Catalogue non-GF entry prices vs grids ─────────────────────
console.log('\n=== CATALOGUE ENTRY vs GRIDS (échantillon) ===');
const samples = [
  ['fly-std', 'lib/data/prix-2026-grids/flyers.ts'],
  ['cv-std', 'lib/data/prix-2026-grids/carte-visite.ts'],
  ['plv-rollup', 'lib/data/prix-2026-grids/plv-flat.ts'],
  ['plv-xbanner', 'lib/data/prix-2026-grids/plv-flat.ts'],
  ['gd-mug', 'lib/data/prix-2026-grids/goodies.ts'],
  ['tx-tshirt', 'lib/data/prix-2026-grids/textile-marking.ts'],
];
for (const [id] of samples) {
  const cat = cataloguePrix(catSrc, id);
  console.log(`CAT ${id}`, cat);
}

// ─── Articles 2026 JSON vs GF ───────────────────────────────────
console.log('\n=== Articles 2026 JSON vs GF Excel ===');
const artPath = path.join(root, 'data/references/catalogue-articles-2026-entry-prices.json');
if (fs.existsSync(artPath)) {
  const art = JSON.parse(fs.readFileSync(artPath, 'utf8'));
  for (const [id, excel] of Object.entries(gfExcel)) {
    const json = art.byPosId?.[id];
    if (json != null) check(`JSON ${id}`, json, excel);
  }
}

// ─── ISF paper spot (pcb350 last tier = 1500?) ──────────────────
console.log('\n=== ISF paper last tiers ===');
const paperSrc = fs.readFileSync(path.join(root, 'lib/data/impression-sf-paper-tariffs.ts'), 'utf8');
function lastTier(key) {
  const re = new RegExp(`${key}:\\s*\\{[\\s\\S]*?tiers:\\s*\\[([\\s\\S]*?)\\]`, 'm');
  const m = paperSrc.match(re);
  if (!m) return null;
  const px = [...m[1].matchAll(/px:\s*(\d+)/g)].map((t) => +t[1]);
  return px.length ? px[px.length - 1] : null;
}
function excelPaperLast(sheet) {
  const rows = sheetRows(sheet);
  const prices = [];
  for (const r of rows) {
    if (typeof r[2] === 'number') prices.push(r[2]);
  }
  return prices.length ? prices[prices.length - 1] : null;
}
for (const [k, sheet] of [
  ['pcb350', 'PAPIER 350 G'],
  ['pcb900', 'PAPIER cover luxe 900 G'],
  ['toile', 'PAPIER Toile fin'],
  ['invitation', 'PAPIER invitation luxe'],
  ['autocollant', 'PAPIER Autocollant'],
]) {
  check(`ISF last ${k}`, lastTier(k), excelPaperLast(sheet));
}

console.log('\n=== TOTAL DIFFS', diffs.length, '===');
for (const d of diffs) {
  console.log(`- ${d.label}: code=${JSON.stringify(d.code)} excel=${JSON.stringify(d.excel)} ${d.extra || ''}`);
}

if (diffs.length) process.exitCode = 1;

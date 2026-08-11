/**
 * Dump + compare textile/goodies/CV/flyers Excel vs encoded grids.
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wb = XLSX.readFile(path.join(process.env.USERPROFILE, 'Desktop', 'PRIX 2026.xlsx'));

function dump(name, n = 40) {
  console.log('\n====', name);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
  let shown = 0;
  for (let i = 0; i < rows.length && shown < n; i++) {
    const r = rows[i];
    if (!r.some((x) => x !== '' && x != null)) continue;
    console.log(String(i).padStart(2), JSON.stringify(r).slice(0, 240));
    shown++;
  }
}

[
  'T-Shirt 170 G',
  'Polo 220 G',
  'Casquette',
  'BOB',
  'Trousse',
  'MUG',
  'TOTEBAG',
  'STYLO',
  'Pins',
  'Gourde',
  'Sweat',
  'Carte de visite',
  'Flyers',
  'TIRAGE PHOTO',
  'Pelliculage',
  'Plastification',
].forEach((s) => dump(s));

// Compare known tiers programmatically
console.log('\n==== STRUCTURED COMPARE ====');

function tiersFromSheet(sheet, opts = {}) {
  // Find rows with qty label + price number
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });
  const out = [];
  for (const r of rows) {
    const cells = r.map((c) => c);
    const nums = cells
      .map((c, i) => ({ i, n: typeof c === 'number' ? c : null }))
      .filter((x) => x.n != null && x.n >= (opts.min ?? 200) && x.n < 5e6);
    if (!nums.length) continue;
    const label = cells.find((c) => typeof c === 'string' && /à|\+|Face|A5|A4|qty|Quant/i.test(c));
    out.push({ label: label || cells[0], prices: nums.map((x) => x.n) });
  }
  return out;
}

for (const s of ['T-Shirt 170 G', 'Polo 220 G', 'MUG', 'STYLO', 'Pins', 'Gourde', 'Sweat', 'Casquette', 'BOB', 'Trousse', 'TOTEBAG']) {
  console.log('\n--', s);
  tiersFromSheet(s).slice(0, 12).forEach((t) => console.log(' ', JSON.stringify(t)));
}

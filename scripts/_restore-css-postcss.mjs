/**
 * Valide CSS via postcss ; restaure depuis Cursor History si parse échoue
 * ou si le fichier commence en milieu de règle.
 */
import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

const ROOT = process.cwd();
const HISTORY = path.join(process.env.APPDATA || '', 'Cursor', 'User', 'History');
const SKIP = new Set(['node_modules', '.next', '.next-e2e', '.git', 'playwright-report', 'test-results', 'archives']);

function walk(d, acc = []) {
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(n.name)) continue;
    const p = path.join(d, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (/\.css$/.test(n.name)) acc.push(p);
  }
  return acc;
}

function startsBroken(text) {
  const first = (text.split(/\n/).find((l) => l.trim()) || '').trim();
  if (!first) return true;
  // Comment ouvert sans /*
  if (first.startsWith('* ') && !text.trimStart().startsWith('/*')) return true;
  if (/^(--|@apply|from\s|to\s|animation:|border:|transform:|box-shadow:|transition:|margin:|gap:|color:|\}|background)/.test(first)) {
    return true;
  }
  return false;
}

async function canParse(text) {
  if (startsBroken(text)) return false;
  try {
    await postcss([]).process(text, { from: undefined });
    return true;
  } catch {
    return false;
  }
}

function loadHistoryIndex() {
  const map = new Map();
  if (!fs.existsSync(HISTORY)) return map;
  for (const dirName of fs.readdirSync(HISTORY)) {
    const dir = path.join(HISTORY, dirName);
    const entriesPath = path.join(dir, 'entries.json');
    if (!fs.existsSync(entriesPath)) continue;
    let entries;
    try {
      entries = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
    } catch {
      continue;
    }
    const resource = String(entries.resource || '');
    const m = resource.match(/file:\/\/\/(.+)/);
    if (!m) continue;
    let filePath = decodeURIComponent(m[1].replace(/\+/g, ' '));
    filePath = filePath.replace(/^\/([a-zA-Z]):\//, '$1:/');
    filePath = path.normalize(filePath);
    const list = (entries.entries || []).map((e) => ({ id: e.id, ts: e.timestamp || 0 }));
    const key = filePath.toLowerCase();
    if (!map.has(key) || list.length > (map.get(key)?.entries.length || 0)) {
      map.set(key, { dir, entries: list });
    }
  }
  return map;
}

async function bestHistory(hist) {
  let best = null;
  for (const e of hist.entries) {
    const p = path.join(hist.dir, e.id);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    if (!(await canParse(text))) continue;
    if (!best || text.length > best.text.length || (text.length === best.text.length && e.ts > best.ts)) {
      best = { text, ts: e.ts, id: e.id, len: text.length };
    }
  }
  return best;
}

const histIndex = loadHistoryIndex();
const broken = [];
for (const p of walk(ROOT)) {
  const text = fs.readFileSync(p, 'utf8');
  if (!(await canParse(text))) broken.push(p);
}

console.log('corrupt css (postcss)', broken.length);
let restored = 0;
let missing = 0;
const report = [];
for (const p of broken) {
  const hist = histIndex.get(path.resolve(p).toLowerCase());
  const best = hist ? await bestHistory(hist) : null;
  if (!best) {
    missing++;
    report.push({ file: path.relative(ROOT, p), status: 'MISSING', len: fs.statSync(p).size });
    console.log('MISSING', path.relative(ROOT, p), fs.statSync(p).size);
    continue;
  }
  fs.writeFileSync(p, best.text, 'utf8');
  restored++;
  report.push({ file: path.relative(ROOT, p), status: 'RESTORED', from: best.id, len: best.len });
  console.log('RESTORED', path.relative(ROOT, p), best.len);
}

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(
  'reports/CSS_CORRUPTION_RESTORE.json',
  JSON.stringify({ broken: broken.length, restored, missing, report }, null, 2),
);
console.log(JSON.stringify({ broken: broken.length, restored, missing }));

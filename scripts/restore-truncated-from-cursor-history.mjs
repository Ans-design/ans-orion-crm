/**
 * Restaure les fichiers tronqués (contenu démarrant en milieu de bloc)
 * depuis Cursor User History.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const HISTORY = path.join(process.env.APPDATA || '', 'Cursor', 'User', 'History');

function walk(d, acc = []) {
  if (!fs.existsSync(d)) return acc;
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', '.next', '.next-e2e', '.git', 'playwright-report', 'test-results', 'archives'].includes(n.name)) continue;
    const p = path.join(d, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|mjs|json)$/.test(n.name)) acc.push(p);
  }
  return acc;
}

function isMidTruncated(text) {
  const t = text.replace(/^\uFEFF/, '');
  if (!t.trim()) return true;
  // Démarre avec indentation significative = troncature
  if (/^[ \t]{2,}\S/.test(t)) return true;
  // Démarre par un fragment courant
  if (/^(try \{|await |const \{|return |},\s*$)/m.test(t.split('\n')[0] || '')) return true;
  return false;
}

function looksComplete(text) {
  if (isMidTruncated(text)) return false;
  const trim = text.trim();
  if (trim.length < 40) return false;
  // Doit avoir import/export ou module.exports ou {
  if (!/^(import |export |const |function |\/\*|module\.exports|\{)/m.test(trim)) return false;
  return true;
}

function loadHistoryIndex() {
  /** @type {Map<string, {dir:string, entries:{id:string,ts:number}[]}>>} */
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
    // Windows file:///c%3A/...
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

function bestHistoryContent(hist) {
  let best = null;
  for (const e of hist.entries) {
    const p = path.join(hist.dir, e.id);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    if (!looksComplete(text)) continue;
    if (!best || text.length > best.text.length || (text.length === best.text.length && e.ts > best.ts)) {
      best = { text, ts: e.ts, id: e.id, len: text.length };
    }
  }
  return best;
}

const histIndex = loadHistoryIndex();
const corrupted = [];
for (const p of walk(ROOT)) {
  const text = fs.readFileSync(p, 'utf8');
  if (isMidTruncated(text)) corrupted.push(p);
}

console.log(`Corrupted mid-truncated: ${corrupted.length}`);
let restored = 0;
let missing = 0;
const report = [];

for (const p of corrupted) {
  const abs = path.resolve(p);
  const hist = histIndex.get(abs.toLowerCase());
  if (!hist) {
    missing++;
    report.push({ file: path.relative(ROOT, p), status: 'NO_HISTORY', len: fs.statSync(p).size });
    continue;
  }
  const best = bestHistoryContent(hist);
  if (!best) {
    missing++;
    report.push({ file: path.relative(ROOT, p), status: 'NO_GOOD_VERSION', len: fs.statSync(p).size });
    continue;
  }
  fs.writeFileSync(p, best.text, 'utf8');
  restored++;
  report.push({ file: path.relative(ROOT, p), status: 'RESTORED', from: best.id, len: best.len });
  console.log('RESTORED', path.relative(ROOT, p), '->', best.len);
}

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(
  'reports/FILE_CORRUPTION_RESTORE.json',
  JSON.stringify({ corrupted: corrupted.length, restored, missing, report }, null, 2),
);
console.log(JSON.stringify({ corrupted: corrupted.length, restored, missing }, null, 2));

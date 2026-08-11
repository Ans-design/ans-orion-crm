import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const HISTORY = path.join(process.env.APPDATA || '', 'Cursor', 'User', 'History');

function walk(d, acc = []) {
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', '.next', '.next-e2e', '.git', 'playwright-report', 'test-results', 'archives'].includes(n.name)) continue;
    const p = path.join(d, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|mjs)$/.test(n.name)) acc.push(p);
  }
  return acc;
}

function braceBalance(t) {
  let n = 0;
  let inS = false;
  let inD = false;
  let inT = false;
  let esc = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === '\\' && (inS || inD || inT)) {
      esc = true;
      continue;
    }
    if (!inD && !inT && c === "'") {
      inS = !inS;
      continue;
    }
    if (!inS && !inT && c === '"') {
      inD = !inD;
      continue;
    }
    if (!inS && !inD && c === '`') {
      inT = !inT;
      continue;
    }
    if (inS || inD || inT) continue;
    if (c === '{') n++;
    else if (c === '}') n--;
  }
  return n;
}

function isCorrupt(text) {
  if (!text.trim()) return true;
  if (/^[ \t]{2,}\S/.test(text)) return true;
  const bal = braceBalance(text);
  if (bal !== 0) return true;
  const trim = text.trim();
  if (/[,{(]$/.test(trim)) return true;
  return false;
}

function looksComplete(text) {
  if (isCorrupt(text)) return false;
  if (text.trim().length < 40) return false;
  return /^(import |export |const |function |\/\*|module\.exports|\{|'use )/m.test(text.trim());
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
  if (isCorrupt(text)) corrupted.push({ p, len: text.length, bal: braceBalance(text) });
}

console.log('corrupt count', corrupted.length);
let restored = 0;
let missing = 0;
const report = [];
for (const { p, len, bal } of corrupted) {
  const abs = path.resolve(p);
  const hist = histIndex.get(abs.toLowerCase());
  const best = hist ? bestHistoryContent(hist) : null;
  if (!best) {
    missing++;
    report.push({ file: path.relative(ROOT, p), status: 'MISSING', len, bal });
    console.log('MISSING', path.relative(ROOT, p), 'len', len, 'bal', bal);
    continue;
  }
  fs.writeFileSync(p, best.text, 'utf8');
  restored++;
  report.push({ file: path.relative(ROOT, p), status: 'RESTORED', from: best.id, len: best.len, was: len });
  console.log('RESTORED', path.relative(ROOT, p), best.len, '(was', len + ')');
}

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(
  'reports/FILE_CORRUPTION_RESTORE.json',
  JSON.stringify({ corrupted: corrupted.length, restored, missing, report }, null, 2),
);
console.log(JSON.stringify({ corrupted: corrupted.length, restored, missing }, null, 2));

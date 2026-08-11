/**
 * Détecte fichiers TS réellement tronqués (débute en milieu de bloc / parse esbuild fail).
 * Restaure depuis Cursor History si disponible.
 */
import fs from 'fs';
import path from 'path';
import { transformSync } from 'esbuild';

const ROOT = process.cwd();
const HISTORY = path.join(process.env.APPDATA || '', 'Cursor', 'User', 'History');
const SKIP = new Set(['node_modules', '.next', '.next-e2e', '.git', 'playwright-report', 'test-results', 'archives', 'dist']);

function walk(d, acc = []) {
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(n.name)) continue;
    const p = path.join(d, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|mjs)$/.test(n.name)) acc.push(p);
  }
  return acc;
}

function startsMidBlock(text) {
  const t = text.replace(/^\uFEFF/, '');
  if (!t.trim()) return true;
  // Indented first non-empty line → often truncation
  const first = t.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
  if (/^[ \t]{2,}\S/.test(first) && !first.trimStart().startsWith('*') && !first.trimStart().startsWith('//')) {
    return true;
  }
  return false;
}

function canParse(file, text) {
  const loader = file.endsWith('.tsx') ? 'tsx' : file.endsWith('.ts') ? 'ts' : file.endsWith('.mjs') ? 'js' : 'js';
  try {
    transformSync(text, { loader, format: 'esm', target: 'es2020' });
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

function bestHistoryContent(hist) {
  let best = null;
  for (const e of hist.entries) {
    const p = path.join(hist.dir, e.id);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    if (startsMidBlock(text)) continue;
    if (!canParse(p, text)) continue;
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
  const mid = startsMidBlock(text);
  const ok = mid ? false : canParse(p, text);
  if (!ok) broken.push({ p, len: text.length, mid, reason: mid ? 'mid-block' : 'parse-fail' });
}

console.log('broken', broken.length);
let restored = 0;
let missing = 0;
const report = [];
for (const { p, len, reason } of broken) {
  const abs = path.resolve(p);
  const hist = histIndex.get(abs.toLowerCase());
  const best = hist ? bestHistoryContent(hist) : null;
  if (!best) {
    missing++;
    report.push({ file: path.relative(ROOT, p), status: 'MISSING', len, reason });
    console.log('MISSING', path.relative(ROOT, p), reason, 'len', len);
    continue;
  }
  fs.writeFileSync(p, best.text, 'utf8');
  restored++;
  report.push({ file: path.relative(ROOT, p), status: 'RESTORED', from: best.id, len: best.len, was: len, reason });
  console.log('RESTORED', path.relative(ROOT, p), best.len, '(was', len + ')', reason);
}

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(
  'reports/FILE_CORRUPTION_PARSE_RESTORE.json',
  JSON.stringify({ broken: broken.length, restored, missing, report }, null, 2),
);
console.log(JSON.stringify({ broken: broken.length, restored, missing }, null, 2));

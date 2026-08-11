/**
 * Restaure pages/layouts app sans `export default` depuis Cursor History.
 */
import fs from 'fs';
import path from 'path';
import { transformSync } from 'esbuild';

const ROOT = process.cwd();
const HISTORY = path.join(process.env.APPDATA || '', 'Cursor', 'User', 'History');
const SKIP = new Set(['node_modules', '.next', '.next-e2e', '.git', 'playwright-report', 'test-results', 'archives']);

function walk(d, acc = []) {
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(n.name)) continue;
    const p = path.join(d, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (/page\.tsx$|layout\.tsx$|loading\.tsx$|error\.tsx$|template\.tsx$|providers\.tsx$/.test(n.name)) acc.push(p);
  }
  return acc;
}

function canParse(file, text) {
  try {
    transformSync(text, { loader: 'tsx', format: 'esm', target: 'es2020' });
    return true;
  } catch {
    return false;
  }
}

function hasDefault(text) {
  return /export\s+default\b/.test(text) || /export\s+\{\s*default\s*\}/.test(text);
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
    if (!hasDefault(text)) continue;
    if (!canParse(p, text)) continue;
    if (!best || text.length > best.text.length || (text.length === best.text.length && e.ts > best.ts)) {
      best = { text, ts: e.ts, id: e.id, len: text.length };
    }
  }
  return best;
}

const histIndex = loadHistoryIndex();
const broken = [];
for (const p of walk(path.join(ROOT, 'app'))) {
  const text = fs.readFileSync(p, 'utf8');
  if (!hasDefault(text)) broken.push(p);
}

console.log('pages/layouts without default:', broken.length);
let restored = 0;
let missing = 0;
for (const p of broken) {
  const hist = histIndex.get(path.resolve(p).toLowerCase());
  const best = hist ? bestHistoryContent(hist) : null;
  if (!best) {
    missing++;
    console.log('MISSING', path.relative(ROOT, p), fs.statSync(p).size);
    continue;
  }
  fs.writeFileSync(p, best.text, 'utf8');
  restored++;
  console.log('RESTORED', path.relative(ROOT, p), best.len);
}
console.log(JSON.stringify({ broken: broken.length, restored, missing }));

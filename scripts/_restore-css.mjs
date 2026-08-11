import fs from 'fs';
import path from 'path';

const SKIP = new Set(['node_modules', '.next', '.next-e2e', '.git', 'playwright-report', 'test-results', 'archives']);
const HISTORY = path.join(process.env.APPDATA || '', 'Cursor', 'User', 'History');
const ROOT = process.cwd();

function walk(d, acc = []) {
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(n.name)) continue;
    const p = path.join(d, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (/\.css$/.test(n.name)) acc.push(p);
  }
  return acc;
}

function braceBal(t) {
  let n = 0;
  let inS = false;
  let inD = false;
  let esc = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === '\\' && (inS || inD)) {
      esc = true;
      continue;
    }
    if (!inD && c === "'") {
      inS = !inS;
      continue;
    }
    if (!inS && c === '"') {
      inD = !inD;
      continue;
    }
    if (inS || inD) continue;
    if (c === '{') n++;
    else if (c === '}') n--;
  }
  return n;
}

function isCorrupt(text) {
  if (!text.trim()) return 'empty';
  const first = (text.split(/\n/).find((l) => l.trim()) || '').trim();
  if (
    /^(--|@apply|from\s|to\s|animation:|border:|transform:|box-shadow:|\}|color:)/.test(first)
    && !first.startsWith('@import')
    && !first.startsWith('@tailwind')
    && !first.startsWith('/*')
  ) {
    return 'mid-start';
  }
  const b = braceBal(text);
  if (b !== 0) return `bal=${b}`;
  return null;
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

function bestHistory(hist) {
  let best = null;
  for (const e of hist.entries) {
    const p = path.join(hist.dir, e.id);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    if (isCorrupt(text)) continue;
    if (!best || text.length > best.text.length || (text.length === best.text.length && e.ts > best.ts)) {
      best = { text, ts: e.ts, id: e.id, len: text.length };
    }
  }
  return best;
}

const histIndex = loadHistoryIndex();
const broken = [];
for (const p of walk(ROOT)) {
  const reason = isCorrupt(fs.readFileSync(p, 'utf8'));
  if (reason) broken.push({ p, reason, len: fs.statSync(p).size });
}

console.log('corrupt css', broken.length);
let restored = 0;
let missing = 0;
for (const { p, reason, len } of broken) {
  const hist = histIndex.get(path.resolve(p).toLowerCase());
  const best = hist ? bestHistory(hist) : null;
  if (!best) {
    missing++;
    console.log('MISSING', path.relative(ROOT, p), reason, len);
    continue;
  }
  fs.writeFileSync(p, best.text, 'utf8');
  restored++;
  console.log('RESTORED', path.relative(ROOT, p), best.len, '(was', len + ')', reason);
}
console.log(JSON.stringify({ broken: broken.length, restored, missing }));

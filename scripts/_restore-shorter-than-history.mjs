/**
 * Restaure tout fichier du projet (ts/tsx/js/mjs/css) dont l’historique Cursor
 * a une version nettement plus longue ET parseable.
 */
import fs from 'fs';
import path from 'path';
import { transformSync } from 'esbuild';
import postcss from 'postcss';

const ROOT = process.cwd();
const HISTORY = path.join(process.env.APPDATA || '', 'Cursor', 'User', 'History');
const MARKER = '2em-export-complet-UNIQUE';
const MIN_GAIN = 80; // octets

function canParseTs(file, text) {
  const first = (text.split(/\n/).find((l) => l.trim()) || '');
  if (/^[ \t]{2,}\S/.test(first) && !first.trimStart().startsWith('*') && !first.trimStart().startsWith('//')) {
    return false;
  }
  // Hook truncations: const X then indented body without function
  if (/^const \w+.*=.*\n[ \t]{2,}const /.test(text.replace(/^\uFEFF/, '').trimStart())) {
    // possible but allow if has export
  }
  if (text.includes('window.') && !text.includes("'use client'") && !text.includes('"use client"') && /hooks[\\/]/.test(file)) {
    // client hook without use client and using window at top level — still parseable
  }
  try {
    const loader = file.endsWith('.tsx') ? 'tsx' : file.endsWith('.ts') ? 'ts' : 'js';
    transformSync(text, { loader, format: 'esm', target: 'es2020' });
    return true;
  } catch {
    return false;
  }
}

async function canParseCss(text) {
  const first = (text.split(/\n/).find((l) => l.trim()) || '').trim();
  if (/^(--|@apply|display:|padding:|margin:|box-|transition:|\}|\* )/.test(first) && !first.startsWith('/*')) return false;
  try {
    await postcss([]).process(text, { from: undefined });
    return true;
  } catch {
    return false;
  }
}

const map = new Map();
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
  if (!resource.includes(MARKER)) continue;
  if (!/\.(ts|tsx|js|mjs|css)$/.test(resource)) continue;
  const m = resource.match(/file:\/\/\/(.+)/);
  if (!m) continue;
  let filePath = decodeURIComponent(m[1].replace(/\+/g, ' '));
  filePath = filePath.replace(/^\/([a-zA-Z]):\//, '$1:/');
  filePath = path.normalize(filePath);
  const list = (entries.entries || []).map((e) => ({ id: e.id, ts: e.timestamp || 0 }));
  const key = filePath.toLowerCase();
  if (!map.has(key) || list.length > map.get(key).entries.length) {
    map.set(key, { dir, filePath, entries: list });
  }
}

let restored = 0;
let checked = 0;
for (const [, hist] of map) {
  const diskPath = hist.filePath;
  if (!fs.existsSync(diskPath)) continue;
  checked++;
  const disk = fs.readFileSync(diskPath, 'utf8');
  const isCss = diskPath.endsWith('.css');

  let best = null;
  for (const e of hist.entries) {
    const p = path.join(hist.dir, e.id);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    const ok = isCss ? await canParseCss(text) : canParseTs(diskPath, text);
    if (!ok) continue;
    if (!best || text.length > best.len || (text.length === best.len && e.ts > best.ts)) {
      best = { text, id: e.id, len: text.length, ts: e.ts };
    }
  }
  if (!best) continue;

  const diskOk = isCss ? await canParseCss(disk) : canParseTs(diskPath, disk);
  // Heuristic: truncated client hooks — very short relative to best
  const suspiciouslyShort = best.len > disk.length + MIN_GAIN;
  const looksTruncatedHook =
    /hooks[\\/]/.test(diskPath)
    && disk.length < 200
    && best.len > 500;

  if ((!diskOk && best) || looksTruncatedHook || (suspiciouslyShort && best.len > disk.length * 1.15)) {
    // Don't overwrite with older shorter if disk is longer and ok — already handled
    if (diskOk && !looksTruncatedHook && best.len <= disk.length + MIN_GAIN) continue;
    if (diskOk && best.len <= disk.length) continue;
    fs.writeFileSync(diskPath, best.text, 'utf8');
    restored++;
    console.log('RESTORED', path.relative(ROOT, diskPath), best.len, '(was', disk.length + ')');
  }
}

console.log(JSON.stringify({ checked, restored, tracked: map.size }));

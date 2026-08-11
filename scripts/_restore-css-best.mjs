/**
 * Pour chaque CSS du projet ayant un historique Cursor,
 * restaure la version la plus longue qui parse avec postcss
 * SI la version disque est plus courte OU ne parse pas.
 */
import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

const ROOT = process.cwd();
const HISTORY = path.join(process.env.APPDATA || '', 'Cursor', 'User', 'History');
const marker = '2em-export-complet-UNIQUE';

function startsBroken(text) {
  const first = (text.split(/\n/).find((l) => l.trim()) || '').trim();
  if (!first) return true;
  if (first.startsWith('* ') && !text.trimStart().startsWith('/*')) return true;
  if (/^(--|@apply|from\s|to\s|animation:|border:|transform:|box-shadow:|transition:|margin:|gap:|color:|\}|background|box-sizing|padding:)/.test(first)) {
    return true;
  }
  // Orphan closing brace near start without open
  if (text.trimStart().startsWith('}')) return true;
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
  if (!resource.includes(marker) || !resource.endsWith('.css')) continue;
  const m = resource.match(/file:\/\/\/(.+)/);
  if (!m) continue;
  let filePath = decodeURIComponent(m[1].replace(/\+/g, ' '));
  filePath = filePath.replace(/^\/([a-zA-Z]):\//, '$1:/');
  filePath = path.normalize(filePath);
  const list = (entries.entries || []).map((e) => ({ id: e.id, ts: e.timestamp || 0 }));
  map.set(filePath.toLowerCase(), { dir, filePath, entries: list });
}

let restored = 0;
let skipped = 0;
let missing = 0;
for (const [, hist] of map) {
  const diskPath = hist.filePath;
  if (!fs.existsSync(diskPath)) {
    missing++;
    continue;
  }
  const disk = fs.readFileSync(diskPath, 'utf8');
  const diskOk = await canParse(disk);

  let best = null;
  for (const e of hist.entries) {
    const p = path.join(hist.dir, e.id);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    if (!(await canParse(text))) continue;
    if (!best || text.length > best.text.length || (text.length === best.text.length && e.ts > best.ts)) {
      best = { text, id: e.id, len: text.length, ts: e.ts };
    }
  }

  if (!best) {
    if (!diskOk) console.log('NO_GOOD_HISTORY', path.relative(ROOT, diskPath), disk.length);
    continue;
  }

  if (!diskOk || best.len > disk.length + 50) {
    fs.writeFileSync(diskPath, best.text, 'utf8');
    restored++;
    console.log('RESTORED', path.relative(ROOT, diskPath), best.len, '(was', disk.length + ')', diskOk ? 'shorter' : 'broken');
  } else {
    skipped++;
  }
}

console.log(JSON.stringify({ restored, skipped, missing, tracked: map.size }));

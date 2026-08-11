import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const HISTORY = path.join(process.env.APPDATA || '', 'Cursor', 'User', 'History');
const reportPath = path.join(ROOT, 'reports', 'FILE_CORRUPTION_RESTORE.json');
const j = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const missing = j.report.filter((r) => r.status === 'MISSING');

const map = new Map();
for (const dirName of fs.readdirSync(HISTORY)) {
  const dir = path.join(HISTORY, dirName);
  const ep = path.join(dir, 'entries.json');
  if (!fs.existsSync(ep)) continue;
  let e;
  try {
    e = JSON.parse(fs.readFileSync(ep, 'utf8'));
  } catch {
    continue;
  }
  const m = String(e.resource || '').match(/file:\/\/\/(.+)/);
  if (!m) continue;
  let fp = decodeURIComponent(m[1]);
  fp = fp.replace(/^\/([a-zA-Z]):\//, '$1:/');
  fp = path.normalize(fp);
  map.set(fp.toLowerCase(), { dir, entries: e.entries || [] });
}

let restored = 0;
for (const item of missing) {
  const abs = path.resolve(ROOT, item.file);
  const hist = map.get(abs.toLowerCase());
  if (!hist) continue;
  let best = null;
  for (const ent of hist.entries) {
    const p = path.join(hist.dir, ent.id);
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, 'utf8');
    if (/^[ \t]{2,}\S/.test(t)) continue;
    if (t.trim().length < 80) continue;
    if (!best || t.length > best.len) best = { t, len: t.length, id: ent.id };
  }
  const currentLen = fs.existsSync(abs) ? fs.statSync(abs).size : 0;
  if (best && best.len > currentLen) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, best.t);
    restored++;
    console.log('RESTORED', item.file, best.len, '(was', currentLen + ')');
  }
}
console.log('extra restored', restored);

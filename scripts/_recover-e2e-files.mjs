const fs = require('fs');
const path = require('path');

const root = path.join(
  process.env.USERPROFILE,
  '.cursor/projects/c-Users-ans-Desktop-2em-export-complet-UNIQUE/agent-transcripts',
);

function walk(d, acc = []) {
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, n.name);
    if (n.isDirectory()) walk(p, acc);
    else if (n.name.endsWith('.jsonl')) acc.push(p);
  }
  return acc;
}

let bestAuth = null;
let bestPw = null;

for (const f of walk(root)) {
  const lines = fs.readFileSync(f, 'utf8').split(/\n/);
  for (const line of lines) {
    if (!line.includes('auth.ts') && !line.includes('playwright.config.ts')) continue;
    if (!line.includes('"Write"')) continue;
    let j;
    try {
      j = JSON.parse(line);
    } catch {
      continue;
    }
    for (const u of j.message?.content || []) {
      if (u.name !== 'Write') continue;
      const p = String(u.input?.path || '').replace(/\\/g, '/');
      const c = String(u.input?.contents || '');
      if (p.endsWith('e2e/helpers/auth.ts') && c.length > 2000) {
        if (!bestAuth || c.length > bestAuth.contents.length) {
          bestAuth = { file: f, contents: c, len: c.length };
        }
      }
      if (p.endsWith('playwright.config.ts') && c.length > 500) {
        if (!bestPw || c.length > bestPw.contents.length) {
          bestPw = { file: f, contents: c, len: c.length };
        }
      }
    }
  }
}

console.log('auth', bestAuth && { len: bestAuth.len, from: bestAuth.file });
console.log('pw', bestPw && { len: bestPw.len, from: bestPw.file });
if (bestAuth) fs.writeFileSync('e2e/helpers/_recovered-auth.ts', bestAuth.contents);
if (bestPw) fs.writeFileSync('playwright.config.recovered.ts', bestPw.contents);

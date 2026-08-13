/**
 * Seed nouveaux logins équipe ANS (GRA02, FAC02, QUAL01, GRA03, COM02, …)
 * + maj ORION_V29_PASSWORDS_JSON local.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const NEW_KEYS = ['GRA02', 'FAC02', 'QUAL01', 'GRA03', 'COM02', 'FAC03', 'FAC04', 'ACC02', 'CM02'];

function derived(m) {
  return `${m}!Orion26`;
}

function parseEnv(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    vars[line.slice(0, i)] = v;
  }
  return vars;
}

function upsertJsonPasswords(filePath) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const m = content.match(/^ORION_V29_PASSWORDS_JSON=(.*)$/m);
  let map = {};
  if (m) {
    try {
      let raw = m[1].trim();
      if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
        raw = raw.slice(1, -1);
      }
      map = JSON.parse(raw);
    } catch {
      map = {};
    }
  }
  for (const k of NEW_KEYS) {
    if (!map[k] || String(map[k]).length < 8) map[k] = derived(k);
  }
  // keep existing keys
  const line = `ORION_V29_PASSWORDS_JSON=${JSON.stringify(map)}`;
  if (/^ORION_V29_PASSWORDS_JSON=/m.test(content)) {
    content = content.replace(/^ORION_V29_PASSWORDS_JSON=.*$/m, line);
  } else {
    content = `${content.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(filePath, content);
  return map;
}

const map = upsertJsonPasswords(path.join(ROOT, '.env.local'));
console.log('Passwords ready for', NEW_KEYS.join(', '));

execSync('npx tsx scripts/seed-v29-local.ts', {
  stdio: 'inherit',
  env: {
    ...process.env,
    ORION_V29_PASSWORDS_JSON: JSON.stringify(map),
    APP_ENV: 'local',
    LOCAL_DEV: 'true',
  },
});

console.log('\nNouveaux comptes (email ou matricule) :');
const labels = {
  GRA02: 'Mendrika — Graphiste',
  FAC02: 'Tojo — Façonnage',
  QUAL01: 'Alain — Contrôle qualité',
  GRA03: 'Tsiory — Graphiste',
  COM02: 'Nancia — Commercial',
  FAC03: 'Tojo N. — Façonnage',
  FAC04: 'Santatra — Façonnage',
  ACC02: 'Fanasa — Accueil',
  CM02: 'Fytia — CM',
};
for (const k of NEW_KEYS) {
  console.log(`  ${k}\t${labels[k] || k}\t${map[k]}`);
}

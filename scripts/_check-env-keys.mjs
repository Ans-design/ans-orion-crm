import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: false });

const t = fs.readFileSync('.env.local', 'utf8');
const lines = t.split(/\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));
console.log('lineCount', lines.length);
console.log(
  'keys',
  lines
    .map((l) => l.split('=')[0].trim())
    .join(', '),
);

const interesting = [
  'SEED_ADMIN_PASSWORD',
  'E2E_PASSWORD',
  'DEMO_ADMIN_PASSWORD',
  'DEMO_PASSWORD',
  'SEED_DEMO_PASSWORD',
  'E2E_ADMIN_PASSWORD',
  'ORION_V29_PASSWORDS_JSON',
  'LOCAL_ADMIN_PASSWORD',
];
for (const k of interesting) {
  const v = process.env[k];
  console.log(k, v ? `SET(${v.length})` : 'MISSING');
}

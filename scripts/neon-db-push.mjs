/**
 * prisma db push sur Neon — patch temporaire PostgreSQL comme hostinger-prisma-generate.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const backup = fs.readFileSync(schemaPath, 'utf8');

function parseEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val) vars[m[1]] = val;
  }
  return vars;
}

function loadNeonUrl() {
  const merged = {};
  for (const file of ['deploy/hostinger/database.bundled.env', '.env.vercel.production', '.env']) {
    Object.assign(merged, parseEnvFile(path.join(process.cwd(), file)));
  }
  const url =
    merged.DATABASE_URL_UNPOOLED ||
    merged.POSTGRES_URL_NON_POOLING ||
    merged.POSTGRES_PRISMA_URL ||
    merged.POSTGRES_URL ||
    merged.DATABASE_URL;
  if (!url?.startsWith('postgres')) {
    console.error('❌ URL PostgreSQL introuvable');
    process.exit(1);
  }
  process.env.DATABASE_URL = url;
  process.env.USE_PRODUCTION_DB = 'true';
}

function patchForPostgres(content) {
  return content.replace('provider = "sqlite"', 'provider = "postgresql"');
}

if (process.env.ALLOW_NEON_DB_PUSH !== 'true') {
  console.error('❌ Refusé : neon db push --accept-data-loss nécessite ALLOW_NEON_DB_PUSH=true');
  console.error('   Préférer migrate deploy : npm run db:migrate:neon');
  console.error('   Jetable uniquement après backup restaurable.');
  process.exit(1);
}

loadNeonUrl();
fs.writeFileSync(schemaPath, patchForPostgres(backup));
console.log('prisma db push → Neon PostgreSQL (ALLOW_NEON_DB_PUSH=true)');

try {
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, USE_PRODUCTION_DB: 'true', DEMO_MODE: 'false' },
  });
} finally {
  fs.writeFileSync(schemaPath, backup);
}

/**
 * prisma generate pour Hostinger — PostgreSQL pooler obligatoire.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadPostgresFromEnvFiles } from './postgres-env.mjs';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const backup = fs.readFileSync(schemaPath, 'utf8');

const ENV_FILES = [
  '.env',
  '.env.vercel.production',
  'deploy/hostinger/database.bundled.env',
  'deploy/hostinger/orion.env',
];

function loadBundledDbEnv() {
  const pooled = loadPostgresFromEnvFiles(ENV_FILES);
  if (pooled) {
    process.env.DATABASE_URL = pooled;
    process.env.USE_PRODUCTION_DB = 'true';
  }
}

function patchForHostinger(content) {
  return content
    .replace('provider = "sqlite"', 'provider = "postgresql"')
    .replace(
      /binaryTargets\s*=\s*\[[^\]]*\]/,
      'binaryTargets = ["native", "debian-openssl-3.0.x", "rhel-openssl-3.0.x"]',
    );
}

loadBundledDbEnv();

fs.writeFileSync(schemaPath, patchForHostinger(backup));
console.log('Prisma generate → PostgreSQL (Hostinger)');
if (process.env.DATABASE_URL?.startsWith('postgres')) {
  const host = process.env.DATABASE_URL.includes('-pooler') ? 'pooler' : 'direct';
  console.log(`DATABASE_URL: PostgreSQL (${host})`);
} else {
  console.warn('⚠ DATABASE_URL Postgres absent — client généré pour PostgreSQL quand même');
}

try {
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: { ...process.env, USE_PRODUCTION_DB: 'true', DEMO_MODE: 'false' },
  });
} finally {
  fs.writeFileSync(schemaPath, backup);
}

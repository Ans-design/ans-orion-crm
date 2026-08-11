/**
 * postinstall — SQLite en dev local, PostgreSQL pooler si prod / Hostinger / Neon.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadPostgresFromEnvFiles } from './postgres-env.mjs';

const ENV_FILES = [
  'deploy/hostinger/database.bundled.env',
  '.env.vercel.production',
  'deploy/hostinger/orion.env',
];

function loadBundledDbUrl() {
  if (process.env.DATABASE_URL?.startsWith('postgres')) return;
  const pooled = loadPostgresFromEnvFiles(ENV_FILES);
  if (pooled) {
    process.env.DATABASE_URL = pooled;
    process.env.USE_PRODUCTION_DB = 'true';
  }
}

loadBundledDbUrl();

const usePostgres =
  process.env.USE_PRODUCTION_DB === 'true' ||
  process.env.DATABASE_URL?.startsWith('postgres') ||
  process.env.HOSTINGER === 'true' ||
  process.env.CI === 'true' ||
  fs.existsSync(path.join(process.cwd(), 'deploy/hostinger/database.bundled.env'));

if (usePostgres) {
  execSync('node scripts/hostinger-prisma-generate.mjs', { stdio: 'inherit' });
} else {
  execSync('npx prisma generate', { stdio: 'inherit' });
}

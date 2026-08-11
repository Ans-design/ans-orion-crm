/**
 * Au démarrage Hostinger — garantit client Prisma PostgreSQL + URL pooler Neon.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadPostgresFromEnvFiles } from './postgres-env.mjs';

const ENV_FILES = [
  'deploy/hostinger/database.bundled.env',
  '.env.vercel.production',
  'deploy/hostinger/orion.env',
  '.env',
];

function loadBundledDbUrl() {
  if (process.env.DATABASE_URL?.startsWith('postgres')) {
    const pooled = loadPostgresFromEnvFiles(ENV_FILES);
    if (pooled) process.env.DATABASE_URL = pooled;
    return true;
  }
  const pooled = loadPostgresFromEnvFiles(ENV_FILES);
  if (pooled) {
    process.env.DATABASE_URL = pooled;
    process.env.USE_PRODUCTION_DB = 'true';
    return true;
  }
  return false;
}

const isProd =
  process.env.USE_PRODUCTION_DB === 'true' ||
  process.env.NODE_ENV === 'production' ||
  process.env.HOSTINGER === 'true' ||
  Boolean(process.env.HOSTINGER_SITE_URL?.trim()) ||
  fs.existsSync(path.join(process.cwd(), 'deploy', 'hostinger', 'database.bundled.env'));

if (isProd) {
  process.env.HOSTINGER = 'true';
  process.env.USE_PRODUCTION_DB = 'true';
}

const hasPostgres = loadBundledDbUrl();

if (isProd && !hasPostgres && !process.env.DATABASE_URL?.startsWith('postgres')) {
  console.error('[prestart] FAIL: Hostinger/production exige DATABASE_URL PostgreSQL.');
  console.error('[prestart] Configurez DATABASE_URL (ou deploy/hostinger/*.env) avant démarrage.');
  process.exit(1);
}

const prismaClient = path.join(process.cwd(), 'node_modules', '.prisma', 'client', 'index.js');

if (isProd && hasPostgres) {
  const needsGenerate =
    process.env.FORCE_PRISMA_GENERATE === '1' || !fs.existsSync(prismaClient);
  if (needsGenerate) {
    console.log('[prestart] PostgreSQL pooler — prisma generate Hostinger');
    try {
      execSync('node scripts/hostinger-prisma-generate.mjs', {
        stdio: 'inherit',
        env: { ...process.env, USE_PRODUCTION_DB: 'true', DEMO_MODE: 'false', HOSTINGER: 'true' },
        timeout: 120_000,
      });
    } catch (err) {
      if (fs.existsSync(prismaClient)) {
        console.warn('[prestart] prisma generate échoué — client existant, démarrage quand même');
      } else {
        console.error('[prestart] prisma generate requis et absent:', err?.message || err);
        process.exit(1);
      }
    }
  } else {
    console.log('[prestart] Prisma client OK — skip generate');
  }
}

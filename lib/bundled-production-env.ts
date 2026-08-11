import fs from 'fs';
import path from 'path';
import { normalizePostgresUrl, pickPostgresUrl } from '@/lib/postgres-url';
import { isLocalAppEnv } from '@/lib/local-dev';

/** Fichiers env prod — Vercel / Neon uniquement (Hostinger opt-in via HOSTINGER=true). */
const PROD_ENV_FILES = [
  '.env',
  '.env.vercel.production',
  ...(process.env.HOSTINGER === 'true'
    ? ['deploy/hostinger/orion.env', 'deploy/hostinger/database.bundled.env']
    : []),
];

const VERCEL_DEFAULTS: Record<string, string> = {
  USE_PRODUCTION_DB: 'true',
  AUTH_TRUST_HOST: 'true',
  DEMO_MODE: 'false',
  DISABLE_QUICK_LOGIN: 'true',
  ALLOW_PUBLIC_SIGNUP: 'false',
  ALLOW_V29_AUTH: 'false',
};

/** Charge / complète Neon + secrets prod (Vercel self-hosted Node uniquement). */
export function loadBundledProductionEnv(): void {
  if (process.env.VERCEL === '1') return;
  if (process.env.ANS_LOCAL_SQLITE_SEED === '1') return;
  // Dev local : ne jamais injecter Neon/Hostinger depuis les fichiers bundlés
  if (isLocalAppEnv() || process.env.LOCAL_DEV === 'true' || process.env.DISABLE_HOSTINGER_DEPLOY === 'true') {
    return;
  }

  const currentDbEarly = process.env.DATABASE_URL?.trim();
  // CI GitHub / démo SQLite explicite — ne jamais écraser par Neon bundlé
  if (currentDbEarly?.startsWith('file:') && (process.env.DEMO_MODE === 'true' || process.env.CI === 'true')) {
    return;
  }

  const bundled = readMergedEnvFiles();
  const isProd = process.env.NODE_ENV === 'production';

  // Hostinger / prod Node : pooler Neon en priorité (évite "connection slots reserved")
  const postgresUrl = pickPostgresUrl(
    {
      POSTGRES_PRISMA_URL: bundled.POSTGRES_PRISMA_URL,
      POSTGRES_URL: bundled.POSTGRES_URL,
      DATABASE_URL: bundled.DATABASE_URL,
      POSTGRES_URL_NON_POOLING: bundled.POSTGRES_URL_NON_POOLING,
      DATABASE_URL_UNPOOLED: bundled.DATABASE_URL_UNPOOLED,
    },
    false,
  );

  const currentDb = process.env.DATABASE_URL?.trim();

  const forceBundledDb =
    Boolean(postgresUrl) &&
    (isProd ||
      process.env.USE_PRODUCTION_DB === 'true' ||
      !currentDb?.startsWith('postgres') ||
      currentDb.startsWith('file:'));

  if (forceBundledDb && postgresUrl) {
    process.env.DATABASE_URL = postgresUrl;
    if (bundled.POSTGRES_PRISMA_URL) process.env.POSTGRES_PRISMA_URL = bundled.POSTGRES_PRISMA_URL;
    if (bundled.POSTGRES_URL) process.env.POSTGRES_URL = bundled.POSTGRES_URL;
    if (bundled.POSTGRES_URL_NON_POOLING) {
      process.env.POSTGRES_URL_NON_POOLING = bundled.POSTGRES_URL_NON_POOLING;
      process.env.DATABASE_URL_UNPOOLED = bundled.POSTGRES_URL_NON_POOLING;
    }
  } else if (currentDb?.startsWith('postgres')) {
    process.env.DATABASE_URL = normalizePostgresUrl(currentDb);
  }

  if (!isProd && !process.env.DATABASE_URL?.startsWith('postgres') && !currentDb?.startsWith('file:')) return;

  for (const [key, fallback] of Object.entries(VERCEL_DEFAULTS)) {
    if (!process.env[key]?.trim()) {
      process.env[key] = bundled[key] || fallback;
    }
  }

  const secret = bundled.NEXTAUTH_SECRET?.trim() || bundled.AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) {
    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
      process.env.NEXTAUTH_SECRET = secret;
    }
    if (!process.env.AUTH_SECRET?.trim()) {
      process.env.AUTH_SECRET = secret;
    }
  }
}

function readMergedEnvFiles(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const file of PROD_ENV_FILES) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    Object.assign(merged, parseEnvFile(full));
  }
  return merged;
}

function parseEnvFile(filePath: string): Record<string, string> {
  const vars: Record<string, string> = {};
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

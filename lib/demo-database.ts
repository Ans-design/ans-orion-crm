import fs from 'fs';
import os from 'os';
import path from 'path';
import { isLocalAppEnv } from '@/lib/local-dev';

const TMP_DB = path.join(os.tmpdir(), 'ans-orion-demo.db');

function seedPath(): string {
  return path.join(process.cwd(), 'prisma', 'demo.db');
}

/** Active la base démo embarquée (Vercel sans Neon, ou DEMO_MODE explicite). */
export function shouldUseDemoDatabase(): boolean {
  // Dev local : toujours respecter DATABASE_URL (.env.local → dev.db)
  if (isLocalAppEnv() || process.env.LOCAL_DEV === 'true') return false;
  if (process.env.USE_PRODUCTION_DB === 'true') return false;
  if (process.env.DATABASE_URL?.trim().startsWith('postgres')) return false;
  if (process.env.DEMO_MODE === 'true') return true;
  if (process.env.VERCEL && process.env.USE_PRODUCTION_DB !== 'true') return true;
  if (process.env.VERCEL && !process.env.DATABASE_URL?.startsWith('postgres')) return true;
  return false;
}

/** Copie demo.db seed → /tmp (writable sur Vercel serverless) */
export function prepareDemoDatabase(): string | null {
  if (!shouldUseDemoDatabase()) return null;

  if (process.env.VERCEL && process.env.USE_PRODUCTION_DB !== 'true') {
    process.env.DEMO_MODE = 'true';
  }

  const seed = seedPath();
  const useTmp = Boolean(process.env.VERCEL) || process.env.DEMO_FORCE_TMP === 'true';

  if (useTmp) {
    try {
      const needsCopy =
        !fs.existsSync(TMP_DB) ||
        (fs.existsSync(seed) && fs.statSync(TMP_DB).size < 1024);

      if (needsCopy && fs.existsSync(seed)) {
        fs.copyFileSync(seed, TMP_DB);
      }

      if (fs.existsSync(TMP_DB)) {
        const url = `file:${TMP_DB.replace(/\\/g, '/')}`;
        process.env.DATABASE_URL = url;
        return url;
      }
    } catch (err) {
      console.error('[demo-db] prepare failed:', err);
    }
  }

  if (fs.existsSync(seed)) {
    const url = `file:${seed.replace(/\\/g, '/')}`;
    process.env.DATABASE_URL = url;
    return url;
  }

  const localDev = path.join(process.cwd(), 'prisma', 'dev.db');
  if (fs.existsSync(localDev)) {
    const url = `file:${localDev.replace(/\\/g, '/')}`;
    process.env.DATABASE_URL = url;
    return url;
  }

  return process.env.DATABASE_URL ?? null;
}

/** @deprecated use prepareDemoDatabase */
export function resolveDemoDatabaseUrl(): string | null {
  return prepareDemoDatabase();
}

export function isDemoMode(): boolean {
  return shouldUseDemoDatabase();
}

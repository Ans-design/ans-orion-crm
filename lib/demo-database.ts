import fs from 'fs';
import os from 'os';
import path from 'path';
import { isLocalAppEnv } from '@/lib/local-dev';

/** Un fichier /tmp par déploiement Vercel — évite un SQLite périmé (colonnes pause/delay absentes). */
export function demoTmpDbPath(deployId = process.env.VERCEL_DEPLOYMENT_ID || 'local'): string {
  const safe = String(deployId).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64) || 'local';
  return path.join(os.tmpdir(), `ans-orion-demo.${safe}.db`);
}

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
      const tmp = demoTmpDbPath();
      const seedExists = fs.existsSync(seed);
      const tmpOk = fs.existsSync(tmp) && fs.statSync(tmp).size >= 1024;
      if (seedExists && !tmpOk) {
        fs.copyFileSync(seed, tmp);
      }
      if (fs.existsSync(tmp)) {
        const url = `file:${tmp.replace(/\\/g, '/')}`;
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

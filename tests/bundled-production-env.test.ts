import { describe, expect, it, afterEach, vi } from 'vitest';
import { loadBundledProductionEnv } from '@/lib/bundled-production-env';

describe('bundled-production-env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ne charge pas Neon si ANS_LOCAL_SQLITE_SEED=1 (local/E2E)', () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('LOCAL_DEV', '');
    vi.stubEnv('DISABLE_HOSTINGER_DEPLOY', '');
    vi.stubEnv('ANS_LOCAL_SQLITE_SEED', '1');
    vi.stubEnv('DEMO_MODE', '');
    vi.stubEnv('CI', '');
    vi.stubEnv('DATABASE_URL', 'file:./dev.db');
    vi.stubEnv('NODE_ENV', 'production');

    loadBundledProductionEnv();

    expect(process.env.DATABASE_URL).toBe('file:./dev.db');
  });

  it('ne charge pas Neon si APP_ENV=local même en NODE_ENV=production', () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('APP_ENV', 'local');
    vi.stubEnv('LOCAL_DEV', 'true');
    vi.stubEnv('DISABLE_HOSTINGER_DEPLOY', '');
    vi.stubEnv('ANS_LOCAL_SQLITE_SEED', '');
    vi.stubEnv('DATABASE_URL', 'file:./dev.db');
    vi.stubEnv('NODE_ENV', 'production');

    loadBundledProductionEnv();

    expect(process.env.DATABASE_URL).toBe('file:./dev.db');
  });

  it('force Neon bundlé en production même si hPanel a un autre Postgres', () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('LOCAL_DEV', '');
    vi.stubEnv('DISABLE_HOSTINGER_DEPLOY', '');
    vi.stubEnv('ANS_LOCAL_SQLITE_SEED', '');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgresql://custom@host/db');
    vi.stubEnv('USE_PRODUCTION_DB', '');
    vi.stubEnv('ALLOW_V29_AUTH', '');

    loadBundledProductionEnv();

    expect(process.env.DATABASE_URL?.startsWith('postgres')).toBe(true);
    expect(process.env.DATABASE_URL).not.toBe('postgresql://custom@host/db');
    expect(process.env.USE_PRODUCTION_DB).toBe('true');
    expect(process.env.AUTH_TRUST_HOST).toBe('true');
    expect(['true', 'false']).toContain(process.env.ALLOW_V29_AUTH);
  });
});

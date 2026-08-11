import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { resolveDatabaseUrl, isPostgresDatabase } from '@/lib/database-url';
import { normalizePostgresUrl } from '@/lib/postgres-url';

describe('database-url', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('conserve DATABASE_URL postgres existante', () => {
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('LOCAL_DEV', '');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@host/db');
    expect(resolveDatabaseUrl()).toBe(normalizePostgresUrl('postgresql://user:pass@host/db'));
  });

  it('fallback POSTGRES_PRISMA_URL si DATABASE_URL absente', () => {
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('LOCAL_DEV', '');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_PRISMA_URL', 'postgresql://neon/db');
    const expected = normalizePostgresUrl('postgresql://neon/db');
    expect(resolveDatabaseUrl()).toBe(expected);
    expect(process.env.DATABASE_URL).toBe(expected);
  });

  it('Vercel sans USE_PRODUCTION_DB active le mode démo', () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('USE_PRODUCTION_DB', '');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_PRISMA_URL', 'postgresql://neon/db');
    expect(resolveDatabaseUrl()).toBeUndefined();
    expect(process.env.DEMO_MODE).toBe('true');
  });

  it('conserve sqlite locale (chemin absolu canonique)', () => {
    vi.stubEnv('APP_ENV', 'local');
    vi.stubEnv('LOCAL_DEV', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DATABASE_URL', 'file:./dev.db');
    const resolved = resolveDatabaseUrl();
    expect(resolved).toMatch(/^file:.*\/prisma\/dev\.db$/);
    expect(isPostgresDatabase()).toBe(false);
  });

  it('canonise e2e.db vers prisma/e2e.db (pas prisma/prisma/e2e.db)', () => {
    vi.stubEnv('APP_ENV', 'local');
    vi.stubEnv('LOCAL_DEV', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('E2E_MODE', 'true');
    vi.stubEnv('DATABASE_URL', 'file:./prisma/e2e.db');
    const resolved = resolveDatabaseUrl();
    expect(resolved).toMatch(/^file:.*\/prisma\/e2e\.db$/);
    expect(resolved).not.toMatch(/prisma\/prisma\/e2e\.db/);
  });
});

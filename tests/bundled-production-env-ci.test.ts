import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('bundled-production-env — garde SQLite CI/démo', () => {
  const orig = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...orig };
  });

  afterEach(() => {
    process.env = orig;
  });

  it('ne remplace pas DATABASE_URL file: quand DEMO_MODE=true', async () => {
    process.env.DATABASE_URL = 'file:./prisma/ci.db';
    process.env.DEMO_MODE = 'true';
    delete process.env.APP_ENV;

    const { loadBundledProductionEnv } = await import('@/lib/bundled-production-env');
    loadBundledProductionEnv();

    expect(process.env.DATABASE_URL).toBe('file:./prisma/ci.db');
  });

  it('ne remplace pas DATABASE_URL file: quand CI=true', async () => {
    process.env.DATABASE_URL = 'file:./prisma/ci.db';
    process.env.CI = 'true';
    delete process.env.DEMO_MODE;

    const { loadBundledProductionEnv } = await import('@/lib/bundled-production-env');
    loadBundledProductionEnv();

    expect(process.env.DATABASE_URL).toBe('file:./prisma/ci.db');
  });
});

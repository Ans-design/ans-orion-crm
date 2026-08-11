import { describe, expect, it, afterEach, vi } from 'vitest';
import { getNextAuthSecret, DEMO_VERCEL_SECRET } from '@/lib/auth-secret';

const backup = { ...process.env };

describe('SEC-002 auth secret startup', () => {
  afterEach(() => {
    process.env = { ...backup };
    vi.unstubAllEnvs();
  });

  it('refuse placeholder connu en production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXTAUTH_SECRET = DEMO_VERCEL_SECRET;
    delete process.env.APP_ENV;
    delete process.env.LOCAL_DEV;
    delete process.env.DATABASE_URL;
    expect(() => getNextAuthSecret()).toThrow(/NEXTAUTH_SECRET/);
  });

  it('accepte secret fort', () => {
    process.env.NEXTAUTH_SECRET = 'a'.repeat(40);
    expect(getNextAuthSecret().length).toBeGreaterThanOrEqual(32);
  });
});

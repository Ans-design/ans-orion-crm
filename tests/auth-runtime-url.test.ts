import { describe, expect, it, afterEach, vi } from 'vitest';
import { ensureAuthRuntimeEnv } from '@/lib/auth-runtime-url';

describe('auth-runtime-url', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('aligne NEXTAUTH_URL sur preview Vercel sans forcer DEMO_MODE', () => {
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'nextjsspace-test-ans-design.vercel.app';
    process.env.NEXTAUTH_URL = 'https://orion.ansdesign.mg';
    process.env.USE_PRODUCTION_DB = 'false';
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.DEMO_MODE;
    delete process.env.ALLOW_DEMO_LOGIN;

    ensureAuthRuntimeEnv();

    expect(process.env.NEXTAUTH_URL).toBe('https://nextjsspace-test-ans-design.vercel.app');
    expect(process.env.DEMO_MODE).toBeUndefined();
    expect(process.env.AUTH_TRUST_HOST).toBe('true');
  });

  it('ne remplace pas NEXTAUTH_URL en production', () => {
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_URL = 'nextjsspace-abc.vercel.app';
    process.env.NEXTAUTH_URL = 'https://orion.ansdesign.mg';

    ensureAuthRuntimeEnv();

    expect(process.env.NEXTAUTH_URL).toBe('https://orion.ansdesign.mg');
  });

  it('aligne AUTH_SECRET et AUTH_TRUST_HOST en local', () => {
    delete process.env.VERCEL;
    process.env.LOCAL_DEV = 'true';
    process.env.APP_ENV = 'local';
    vi.stubEnv('NODE_ENV', 'development');
    process.env.PORT = '3020';
    process.env.HOST = '127.0.0.1';
    process.env.NEXTAUTH_SECRET = 'local-test-secret-minimum-32-characters';
    process.env.AUTH_SECRET = 'identique-a-NEXTAUTH_SECRET';

    ensureAuthRuntimeEnv();

    expect(process.env.AUTH_TRUST_HOST).toBe('true');
    expect(process.env.AUTH_SECRET).toBe('local-test-secret-minimum-32-characters');
  });
});

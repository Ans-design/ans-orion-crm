import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { getNextAuthSecret, DEMO_VERCEL_SECRET } from '@/lib/auth-secret';
import { isDemoLoginFeaturesEnabled, isProductionDeploy } from '@/lib/auth-environment';
import { isSecureAuthCookie } from '@/lib/auth-cookies';
import { isLocalAuthEnabled } from '@/lib/local-auth';
import { hasPermission, isDemoBlockedRoute } from '@/lib/auth/permissions';
import { MIDDLEWARE_INCLUDES_API, MIDDLEWARE_MATCHER } from '@/lib/middleware-matcher';
import { ensureAuthRuntimeEnv } from '@/lib/auth-runtime-url';

const envBackup = { ...process.env };

describe('Lot 2 auth security hardening', () => {
  beforeEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllEnvs();
  });

  it('middleware matcher includes API (SEC-001)', () => {
    expect(MIDDLEWARE_INCLUDES_API).toBe(true);
    expect(MIDDLEWARE_MATCHER[0]).not.toMatch(/\(\?!api\|/);
  });

  it('middleware.ts expose un matcher littéral (pas de spread)', () => {
    const src = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8');
    expect(src).toMatch(/matcher:\s*\[\s*'\/\(\(\?!_next/);
    expect(src).not.toMatch(/matcher:\s*\[\.\.\./);
  });

  it('refuse fallback secret when USE_PRODUCTION_DB (SEC-002)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.APP_ENV;
    delete process.env.LOCAL_DEV;
    delete process.env.DEMO_MODE;
    delete process.env.E2E_MODE;
    process.env.USE_PRODUCTION_DB = 'true';
    expect(() => getNextAuthSecret()).toThrow(/NEXTAUTH_SECRET/);
  });

  it('ensureAuthRuntimeEnv n’injecte pas le secret démo hors local', () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.APP_ENV;
    delete process.env.LOCAL_DEV;
    delete process.env.DEMO_MODE;
    delete process.env.E2E_MODE;
    process.env.USE_PRODUCTION_DB = 'true';
    process.env.HOSTINGER = 'true';
    ensureAuthRuntimeEnv();
    expect(process.env.NEXTAUTH_SECRET).toBeUndefined();
    expect(() => getNextAuthSecret()).toThrow(/NEXTAUTH_SECRET/);
  });

  it('allows local derived secret only outside hardened runtime (SEC-002)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('APP_ENV', 'local');
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.USE_PRODUCTION_DB;
    delete process.env.HOSTINGER;
    delete process.env.HOSTINGER_SITE_URL;
    delete process.env.VERCEL_ENV;
    const secret = getNextAuthSecret();
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(secret).not.toBe(DEMO_VERCEL_SECRET);
    expect(secret).toMatch(/ans-orion-local/);
  });

  it('Vercel alone does not enable demo login (SEC-003)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.VERCEL = '1';
    delete process.env.DEMO_MODE;
    delete process.env.ALLOW_DEMO_LOGIN;
    delete process.env.E2E_MODE;
    delete process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS;
    expect(isDemoLoginFeaturesEnabled()).toBe(false);
  });

  it('E2E_MODE cannot disable production deploy on Hostinger', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.HOSTINGER = 'true';
    process.env.USE_PRODUCTION_DB = 'true';
    process.env.E2E_MODE = 'true';
    expect(isProductionDeploy()).toBe(true);
  });

  it('E2E_MODE does not force insecure cookies on production deploy', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.USE_PRODUCTION_DB = 'true';
    process.env.HOSTINGER = 'true';
    process.env.E2E_MODE = 'true';
    process.env.NEXTAUTH_URL = 'https://orion.example.com';
    expect(isSecureAuthCookie()).toBe(true);
  });

  it('LOCAL_AUTH disabled when USE_PRODUCTION_DB', () => {
    process.env.LOCAL_AUTH_ENABLED = 'true';
    process.env.USE_PRODUCTION_DB = 'true';
    expect(isLocalAuthEnabled()).toBe(false);
  });

  it('demo cannot write paiements / stock / production (SEC-004)', () => {
    expect(hasPermission('demo', 'paiements:write')).toBe(false);
    expect(hasPermission('demo', 'production:write')).toBe(false);
    expect(hasPermission('demo', 'factures:write')).toBe(false);
    expect(hasPermission('demo', 'commandes:write')).toBe(false);
    expect(hasPermission('demo', 'clients:write')).toBe(true);
    expect(hasPermission('demo', 'pos:use')).toBe(true);
  });

  it('demo blocked on sensitive API mutations', () => {
    expect(isDemoBlockedRoute('/api/paiements', 'POST', 'demo')).toBe(true);
    expect(isDemoBlockedRoute('/api/stock/x', 'PATCH', 'demo')).toBe(true);
    expect(isDemoBlockedRoute('/api/admin-backoffice/pricing', 'POST', 'demo')).toBe(true);
    expect(isDemoBlockedRoute('/api/commandes', 'POST', 'demo')).toBe(true);
    expect(isDemoBlockedRoute('/api/paiements', 'GET', 'demo')).toBe(false);
  });
});

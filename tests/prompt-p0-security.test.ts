import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { matchDevAccount, getDevAccounts } from '@/lib/dev-accounts';
import {
  getLocalAdminCredentials,
  isLocalAuthEnabled,
  matchLocalAdminAuth,
} from '@/lib/local-auth';
import { isDemoLoginFeaturesEnabled, isProductionDeploy } from '@/lib/auth-environment';
import { getOrionV29Accounts, matchOrionV29Account } from '@/lib/orion-v29-accounts';

const envBackup = { ...process.env };

describe('Prompt P0 — secrets & démo fail-closed', () => {
  beforeEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllEnvs();
  });

  it('aucun littéral johndoe123 / Demo2026! / adm2026 dans sources auth', () => {
    const files = [
      'lib/dev-accounts.ts',
      'lib/local-auth.ts',
      'lib/orion-v29-accounts.ts',
      'app/api/setup-db/route.ts',
    ];
    for (const rel of files) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      expect(src).not.toMatch(/johndoe123/);
      expect(src).not.toMatch(/Demo2026!/);
      expect(src).not.toMatch(/password:\s*'adm2026'/);
      expect(src).not.toMatch(/password:\s*'ans2026'/);
    }
  });

  it('sans DEMO_*_PASSWORD → aucun compte démo', () => {
    delete process.env.DEMO_ADMIN_PASSWORD;
    delete process.env.DEMO_PASSWORD;
    delete process.env.E2E_PASSWORD;
    delete process.env.DEMO_ADMIN_EMAIL;
    delete process.env.DEMO_EMAIL;
    expect(getDevAccounts()).toHaveLength(0);
    expect(matchDevAccount('john@doe.com', 'johndoe123')).toBeNull();
  });

  it('sans LOCAL_ADMIN_PASSWORD → pas de connexion locale ADM01', () => {
    vi.stubEnv('NODE_ENV', 'development');
    process.env.LOCAL_AUTH_ENABLED = 'true';
    delete process.env.USE_PRODUCTION_DB;
    delete process.env.HOSTINGER;
    delete process.env.LOCAL_ADMIN_PASSWORD;
    process.env.LOCAL_ADMIN_LOGIN = 'ADM01';
    expect(getLocalAdminCredentials()).toBeNull();
    expect(matchLocalAdminAuth('ADM01', 'ADM01')).toBeNull();
  });

  it('production Hostinger refuse DEMO_MODE features', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.HOSTINGER = 'true';
    process.env.USE_PRODUCTION_DB = 'true';
    process.env.DEMO_MODE = 'true';
    expect(isProductionDeploy()).toBe(true);
    expect(isDemoLoginFeaturesEnabled()).toBe(false);
    expect(isLocalAuthEnabled()).toBe(false);
  });

  it('Vercel production refuse démo même si DEMO_MODE=true', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.VERCEL_ENV = 'production';
    delete process.env.HOSTINGER;
    delete process.env.USE_PRODUCTION_DB;
    process.env.DEMO_MODE = 'true';
    expect(isProductionDeploy()).toBe(true);
    expect(isDemoLoginFeaturesEnabled()).toBe(false);
  });

  it('sans ORION_V29_PASSWORDS_JSON → aucun compte v29 authentifiable', () => {
    delete process.env.ORION_V29_PASSWORDS_JSON;
    expect(getOrionV29Accounts()).toHaveLength(0);
    expect(matchOrionV29Account('ADM01', 'adm2026')).toBeNull();
  });

  it('setup-db source : 404 production + hors PUBLIC_API_EXACT', () => {
    const route = readFileSync(join(process.cwd(), 'app/api/setup-db/route.ts'), 'utf8');
    const mw = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8');
    expect(route).toMatch(/status:\s*404/);
    expect(route).toMatch(/isProductionDeploy/);
    expect(route).toMatch(/export async function GET/);
    expect(mw).not.toMatch(/PUBLIC_API_EXACT = new Set\(\['\/api\/setup-db'/);
    expect(mw).toMatch(/pathname === '\/api\/setup-db'/);
  });

  it('middleware ne liste plus setup-db dans PUBLIC_API_EXACT', () => {
    const mw = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8');
    const routes = readFileSync(join(process.cwd(), 'lib/auth/public-api-routes.ts'), 'utf8');
    expect(mw).not.toMatch(/PUBLIC_API_EXACT = new Set\(\['\/api\/setup-db'/);
    expect(routes).toMatch(/\/api\/auth\/setup-status/);
    expect(routes).not.toMatch(/\/api\/setup-db/);
    expect(mw).toMatch(/pathname === '\/api\/setup-db'/);
  });
});

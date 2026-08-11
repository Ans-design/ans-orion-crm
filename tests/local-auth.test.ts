import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  matchLocalAdminAuth,
  parseLoginCredentials,
  normalizeLoginIdentifier,
  getLocalAdminCredentials,
} from '@/lib/local-auth';

describe('local-auth', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv('APP_ENV', 'local');
    vi.stubEnv('LOCAL_AUTH_ENABLED', 'true');
    delete process.env.USE_PRODUCTION_DB;
    delete process.env.HOSTINGER;
    delete process.env.HOSTINGER_SITE_URL;
    // SEC : plus de ADM01 hardcodé — credentials env obligatoires (password ≥ 8).
    vi.stubEnv('LOCAL_ADMIN_LOGIN', 'ADM01');
    vi.stubEnv('LOCAL_ADMIN_PASSWORD', 'LocalAdmin8');
  });

  it('parseLoginCredentials — clés multiples', () => {
    expect(parseLoginCredentials({ login: 'ADM01', motDePasse: 'ADM01' })).toEqual({
      identifier: 'ADM01',
      password: 'ADM01',
    });
    expect(parseLoginCredentials({ identifier: 'a@b.com', password: 'x' })).toEqual({
      identifier: 'a@b.com',
      password: 'x',
    });
  });

  it('matchLocalAdminAuth avec credentials env', () => {
    const user = matchLocalAdminAuth('ADM01', 'LocalAdmin8');
    expect(user?.role).toBe('admin');
    expect(user?.matricule).toBe('ADM01');
  });

  it('refuse mauvais mot de passe', () => {
    expect(matchLocalAdminAuth('ADM01', 'wrong')).toBeNull();
  });

  it('refuse identifiant sans mot de passe (porte fermée)', () => {
    expect(matchLocalAdminAuth('ADM01')).toBeNull();
  });

  it('désactivé si LOCAL_AUTH_ENABLED=false', () => {
    vi.stubEnv('LOCAL_AUTH_ENABLED', 'false');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    expect(matchLocalAdminAuth('ADM01', 'LocalAdmin8')).toBeNull();
  });

  it('credentials configurables (password ≥ 8)', () => {
    vi.stubEnv('LOCAL_ADMIN_LOGIN', 'dev01');
    vi.stubEnv('LOCAL_ADMIN_PASSWORD', 'dev01pass');
    expect(getLocalAdminCredentials()).toEqual({ login: 'DEV01', password: 'dev01pass' });
    expect(matchLocalAdminAuth('DEV01', 'dev01pass')?.id).toBe('local-admin');
  });

  it('refuse password trop court', () => {
    vi.stubEnv('LOCAL_ADMIN_LOGIN', 'DEV01');
    vi.stubEnv('LOCAL_ADMIN_PASSWORD', 'short');
    expect(getLocalAdminCredentials()).toBeNull();
  });

  it('normalizeLoginIdentifier', () => {
    expect(normalizeLoginIdentifier('adm01')).toBe('ADM01');
    expect(normalizeLoginIdentifier('John@Doe.com')).toBe('john@doe.com');
  });
});

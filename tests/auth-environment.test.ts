import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  getLoginSecurityFlags,
  isProductionDeploy,
  isPublicSignupEnabled,
  isQuickLoginEnabled,
  isV29MatriculeAuthEnabled,
} from '@/lib/auth-environment';

const envBackup = { ...process.env };

function prodHostinger() {
  vi.stubEnv('NODE_ENV', 'production');
  process.env.HOSTINGER = 'true';
  process.env.USE_PRODUCTION_DB = 'true';
  process.env.DEMO_MODE = 'false';
  delete process.env.E2E_MODE;
  delete process.env.ALLOW_QUICK_LOGIN;
  delete process.env.ALLOW_PUBLIC_SIGNUP;
  delete process.env.ALLOW_V29_AUTH;
}

describe('auth-environment production', () => {
  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllEnvs();
  });

  it('isProductionDeploy sur Hostinger Postgres', () => {
    prodHostinger();
    expect(isProductionDeploy()).toBe(true);
  });

  it('désactive quick login, signup public et v29 en prod Hostinger', () => {
    prodHostinger();
    expect(isQuickLoginEnabled()).toBe(false);
    expect(isPublicSignupEnabled()).toBe(false);
    expect(isV29MatriculeAuthEnabled()).toBe(false);
    const flags = getLoginSecurityFlags(false);
    expect(flags.showQuickLogin).toBe(false);
    expect(flags.allowSignup).toBe(false);
    expect(flags.productionHardened).toBe(true);
  });

  it('refuse signup public en prod même avec ALLOW_PUBLIC_SIGNUP (AUTH-001)', () => {
    prodHostinger();
    process.env.ALLOW_PUBLIC_SIGNUP = 'true';
    expect(isPublicSignupEnabled()).toBe(false);
  });

  it('NODE_ENV=production seul active le durcissement', () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.HOSTINGER;
    delete process.env.USE_PRODUCTION_DB;
    delete process.env.VERCEL_ENV;
    delete process.env.APP_ENV;
    delete process.env.LOCAL_DEV;
    expect(isProductionDeploy()).toBe(true);
    expect(isQuickLoginEnabled()).toBe(false);
  });

  it('bootstrap needsSetup ouvre signup', () => {
    prodHostinger();
    expect(getLoginSecurityFlags(true).allowSignup).toBe(true);
  });
});

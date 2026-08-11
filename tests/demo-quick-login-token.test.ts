import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_QUICK_LOGIN_TOKEN, getDemoQuickLoginToken } from '@/lib/auth-constants';

describe('getDemoQuickLoginToken', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('retourne la sentinelle en contexte local', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('APP_ENV', 'local');
    vi.stubEnv('DEMO_QUICK_LOGIN_TOKEN', '');
    expect(getDemoQuickLoginToken()).toBe(DEMO_QUICK_LOGIN_TOKEN);
  });

  it('fail-closed hors local/E2E sans env', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'staging');
    vi.stubEnv('LOCAL_DEV', '');
    vi.stubEnv('E2E_MODE', '');
    vi.stubEnv('ALLOW_INSECURE_LOCAL', '');
    vi.stubEnv('DEMO_QUICK_LOGIN_TOKEN', '');
    expect(getDemoQuickLoginToken()).toBe('');
  });

  it('honore DEMO_QUICK_LOGIN_TOKEN env même hors local', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('DEMO_QUICK_LOGIN_TOKEN', 'custom-sentinel-only');
    expect(getDemoQuickLoginToken()).toBe('custom-sentinel-only');
  });
});

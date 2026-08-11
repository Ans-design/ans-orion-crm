import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  isLocalAppEnv,
  isHostingerDeployBlocked,
  isDevPreviewEnabled,
  localAppUrl,
} from '@/lib/local-dev';

describe('local-dev', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('détecte le mode local', () => {
    process.env.APP_ENV = 'local';
    expect(isLocalAppEnv()).toBe(true);
    expect(isHostingerDeployBlocked()).toBe(true);
  });

  it('autorise deploy si ALLOW_HOSTINGER_DEPLOY', () => {
    process.env.APP_ENV = 'local';
    process.env.ALLOW_HOSTINGER_DEPLOY = 'true';
    expect(isHostingerDeployBlocked()).toBe(false);
  });

  it('dev-preview actif en local', () => {
    process.env.APP_ENV = 'local';
    expect(isDevPreviewEnabled()).toBe(true);
  });

  it('URL locale par défaut', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    expect(localAppUrl()).toBe('http://localhost:3000');
  });
});

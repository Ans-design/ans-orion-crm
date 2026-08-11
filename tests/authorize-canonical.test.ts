import { describe, expect, it } from 'vitest';
import { authorize, authorizeAny } from '@/lib/auth/authorize';
import { isPublicApiPath } from '@/lib/auth/public-api-routes';

describe('PERM-001 authorize', () => {
  it('refuse subject manquant', () => {
    expect(authorize(null, 'clients:read').allowed).toBe(false);
  });

  it('deny user override gagne', () => {
    const d = authorize(
      {
        userId: 'u1',
        role: 'admin',
        denyPermissions: ['pos:view_margin'],
      },
      'pos:view_margin',
    );
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('user_deny_override');
  });

  it('commercial n’a pas view_margin', () => {
    expect(
      authorize({ userId: 'u1', role: 'commercial' }, 'pos:view_margin').allowed,
    ).toBe(false);
  });

  it('authorizeAny', () => {
    const d = authorizeAny({ userId: 'u1', role: 'commercial' }, [
      'pos:view_margin',
      'clients:read',
    ]);
    expect(d.allowed).toBe(true);
    expect(d.permission).toBe('clients:read');
  });

  it('authorizeAny respecte deny override (PERM-001)', () => {
    const d = authorizeAny(
      {
        userId: 'u1',
        role: 'admin',
        denyPermissions: ['bat:read', 'production:read'],
      },
      ['bat:read', 'production:read'],
    );
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('none_granted');
  });
});

describe('AUTH-004 public api allowlist', () => {
  it('session publique, admin privée', () => {
    expect(isPublicApiPath('/api/auth/session')).toBe(true);
    expect(isPublicApiPath('/api/health')).toBe(true);
    expect(isPublicApiPath('/api/clients')).toBe(false);
    expect(isPublicApiPath('/api/auth/unknown-admin')).toBe(false);
  });
});

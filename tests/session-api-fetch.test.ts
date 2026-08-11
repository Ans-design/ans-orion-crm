import { describe, expect, it } from 'vitest';
import { handleApiUnauthorized, isSecondaryApiRoute } from '@/lib/session-api-fetch';

describe('session-api-fetch', () => {
  it('isSecondaryApiRoute détecte les APIs non critiques', () => {
    expect(isSecondaryApiRoute('/api/nav/badges')).toBe(true);
    expect(isSecondaryApiRoute('/api/rh/late-arrival')).toBe(true);
    expect(isSecondaryApiRoute('/api/auth/session')).toBe(true);
    expect(isSecondaryApiRoute('/api/commandes/abc')).toBe(false);
  });

  it('handleApiUnauthorized est no-op côté serveur (pas de window)', () => {
    expect(handleApiUnauthorized(401, '/api/nav/badges')).toBe(false);
    expect(handleApiUnauthorized(200, '/api/nav/badges')).toBe(false);
  });

  it('ignore les routes auth NextAuth', () => {
    expect(handleApiUnauthorized(401, '/api/auth/session')).toBe(false);
  });
});

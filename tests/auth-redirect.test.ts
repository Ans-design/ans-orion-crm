import { describe, expect, it } from 'vitest';
import { resolvePostLoginPath } from '@/lib/auth-redirect';

describe('auth-redirect', () => {
  it('redirige / vers /dashboard', () => {
    expect(resolvePostLoginPath('/')).toBe('/dashboard');
    expect(resolvePostLoginPath(null)).toBe('/dashboard');
  });

  it('conserve chemins internes valides', () => {
    expect(resolvePostLoginPath('/panier')).toBe('/panier');
    expect(resolvePostLoginPath('/commandes')).toBe('/commandes');
  });

  it('bloque open-redirect', () => {
    expect(resolvePostLoginPath('//evil.com')).toBe('/dashboard');
    expect(resolvePostLoginPath('/login')).toBe('/dashboard');
  });
});

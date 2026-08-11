import { describe, expect, it } from 'vitest';
import { canAccessPage, getPageAccessRoles, getUnauthorizedPageRedirect } from '@/lib/page-access';

describe('page-access', () => {
  it('admin accède à tout', () => {
    expect(canAccessPage('admin', '/rh/paie')).toBe(true);
    expect(canAccessPage('admin', '/finance/fiscalite')).toBe(true);
  });

  it('bloque RH paie pour commercial', () => {
    expect(canAccessPage('commercial', '/rh/paie')).toBe(false);
    expect(getPageAccessRoles('/rh/paie')).toContain('admin');
  });

  it('bloque fiscalité pour production', () => {
    expect(canAccessPage('production', '/finance/fiscalite')).toBe(false);
  });

  it('autorise rapports performance pour production', () => {
    expect(canAccessPage('production', '/rapports/performance')).toBe(true);
  });

  it('laisse passer les routes sans règle', () => {
    expect(canAccessPage('commercial', '/commandes')).toBe(true);
  });

  it('redirige vers non-autorise pour commercial sur RH', () => {
    expect(getUnauthorizedPageRedirect('/rh/paie', 'commercial')).toBe('/non-autorise?from=%2Frh%2Fpaie');
    expect(getUnauthorizedPageRedirect('/dashboard', 'commercial')).toBe('/non-autorise?from=%2Fdashboard');
    expect(getUnauthorizedPageRedirect('/non-autorise', 'commercial')).toBeNull();
  });

  it('bloque production sur factures et paiements', () => {
    expect(canAccessPage('production', '/factures')).toBe(false);
    expect(canAccessPage('production', '/paiements')).toBe(false);
  });

  it('autorise finance sur factures et paiements', () => {
    expect(canAccessPage('finance', '/factures')).toBe(true);
    expect(canAccessPage('finance', '/paiements')).toBe(true);
  });

  it('autorise commercial sur POS', () => {
    expect(canAccessPage('commercial', '/pos')).toBe(true);
    expect(canAccessPage('commercial', '/pos/evt-affiche')).toBe(true);
  });

  it('bloque production sur POS', () => {
    expect(canAccessPage('production', '/pos')).toBe(false);
  });

  it('autorise caisse sur paiements', () => {
    expect(canAccessPage('caisse', '/paiements')).toBe(true);
  });
});

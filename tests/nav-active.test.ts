import { describe, it, expect } from 'vitest';
import { isNavItemActive } from '@/lib/nav-active';

describe('isNavItemActive', () => {
  it('active catalogue sur /pos et /pos/[id]', () => {
    expect(isNavItemActive('/pos', '/pos')).toBe(true);
    expect(isNavItemActive('/pos/fly-std', '/pos')).toBe(true);
    expect(isNavItemActive('/pos/conception', '/pos')).toBe(false);
  });

  it('active conception uniquement sur /pos/conception', () => {
    expect(isNavItemActive('/pos/conception', '/pos/conception')).toBe(true);
    expect(isNavItemActive('/pos', '/pos/conception')).toBe(false);
  });

  it('active devis sur sous-routes', () => {
    expect(isNavItemActive('/devis', '/devis')).toBe(true);
    expect(isNavItemActive('/devis/abc', '/devis')).toBe(true);
  });

  it('active administration vue-ensemble et sante-systeme', () => {
    expect(isNavItemActive('/administration/vue-ensemble', '/administration/vue-ensemble')).toBe(true);
    expect(isNavItemActive('/administration/sante-systeme', '/administration/vue-ensemble')).toBe(true);
    expect(isNavItemActive('/administration/articles', '/administration/articles')).toBe(true);
    expect(isNavItemActive('/administration/vue-ensemble', '/administration/articles')).toBe(false);
  });

  it('active backoffice par onglet query', () => {
    expect(isNavItemActive('/admin/pricing', '/admin/pricing?tab=sante', 'tab=sante')).toBe(true);
    expect(isNavItemActive('/admin/pricing', '/admin/pricing?tab=articles', 'tab=articles')).toBe(true);
    expect(isNavItemActive('/admin/pricing', '/admin/pricing?tab=sante', 'tab=articles')).toBe(false);
    expect(isNavItemActive('/admin/pricing', '/admin/pricing?tab=sante', '')).toBe(true);
  });

  it('active Communication / ANS Talk sur messagerie et aliases', () => {
    expect(isNavItemActive('/messagerie', '/messagerie')).toBe(true);
    expect(isNavItemActive('/messagerie', '/messagerie', 'tab=annonces')).toBe(true);
    expect(isNavItemActive('/ans-talk', '/messagerie')).toBe(true);
    expect(isNavItemActive('/chat', '/messagerie')).toBe(true);
    expect(isNavItemActive('/communication/ans-talk', '/messagerie')).toBe(true);
    expect(isNavItemActive('/equipe/messages', '/messagerie')).toBe(true);
    expect(isNavItemActive('/clients', '/messagerie')).toBe(false);
  });

  it('active Studio onglets + aliases path', () => {
    expect(isNavItemActive('/studio', '/studio?tab=briefs', 'tab=briefs')).toBe(true);
    expect(isNavItemActive('/studio', '/studio?tab=fichiers', 'tab=fichiers')).toBe(true);
    expect(isNavItemActive('/studio', '/studio?tab=briefs', 'tab=fichiers')).toBe(false);
    expect(isNavItemActive('/studio', '/studio/briefs', 'tab=briefs')).toBe(true);
    expect(isNavItemActive('/studio', '/studio/fichiers', 'tab=fichiers')).toBe(true);
    expect(isNavItemActive('/studio', '/studio/prepresse', 'tab=prepresse')).toBe(true);
    expect(isNavItemActive('/studio', '/studio?tab=briefs', '')).toBe(true);
    expect(isNavItemActive('/studio', '/studio')).toBe(false);
    expect(isNavItemActive('/bat', '/studio?tab=briefs')).toBe(false);
  });
});

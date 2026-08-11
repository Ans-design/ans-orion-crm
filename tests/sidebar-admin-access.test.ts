import { describe, expect, it } from 'vitest';
import { canAccessAdministration } from '@/lib/navigation/can-access-administration';
import { buildSidebarUniverses } from '@/lib/navigation/build-sidebar-universes';
import { canAccessPage } from '@/lib/page-access';
import {
  ADMIN_MACRO_MODULES,
  macroHubUrl,
  macroNavBadge,
  sumAuthorizedAdminMacroBadges,
} from '@/lib/administration/admin-macro-modules';
import { COMMERCIAL_FLOW_ORDER } from '@/lib/navigation/sidebar-universes';

describe('canAccessAdministration', () => {
  it('autorise admin et manager', () => {
    expect(canAccessAdministration('admin')).toBe(true);
    expect(canAccessAdministration('manager')).toBe(true);
  });

  it('refuse commercial, production, demo, rôle inconnu et vide', () => {
    expect(canAccessAdministration('commercial')).toBe(false);
    expect(canAccessAdministration('production')).toBe(false);
    expect(canAccessAdministration('demo')).toBe(false);
    expect(canAccessAdministration('inconnu')).toBe(false);
    expect(canAccessAdministration('')).toBe(false);
    expect(canAccessAdministration(null)).toBe(false);
    expect(canAccessAdministration(undefined)).toBe(false);
  });

  it('est aligné sur canAccessPage(/administration)', () => {
    for (const role of ['admin', 'manager', 'commercial', 'production', 'demo', 'caisse']) {
      expect(canAccessAdministration(role)).toBe(canAccessPage(role, '/administration'));
    }
  });
});

describe('buildSidebarUniverses — Administration gate', () => {
  it('admin : univers administration présent avec adminNav', () => {
    const universes = buildSidebarUniverses('admin');
    const admin = universes.find((u) => u.id === 'administration');
    expect(admin).toBeDefined();
    expect(admin?.adminNav).toBe(true);
    expect(admin?.items).toEqual([]);
  });

  it('manager : univers administration présent', () => {
    const universes = buildSidebarUniverses('manager');
    expect(universes.some((u) => u.id === 'administration' && u.adminNav)).toBe(true);
  });

  it('commercial : univers administration absent du tableau', () => {
    const universes = buildSidebarUniverses('commercial');
    expect(universes.find((u) => u.id === 'administration')).toBeUndefined();
    expect(universes.some((u) => u.adminNav)).toBe(false);
  });

  it('production : univers administration absent', () => {
    expect(buildSidebarUniverses('production').some((u) => u.adminNav)).toBe(false);
  });

  it('rôle inconnu : univers administration absent', () => {
    expect(buildSidebarUniverses('').some((u) => u.adminNav)).toBe(false);
    expect(buildSidebarUniverses('ghost-role').some((u) => u.adminNav)).toBe(false);
  });
});

describe('Commercial flow canonique', () => {
  it('définit 6 étapes structurelles', () => {
    expect(COMMERCIAL_FLOW_ORDER).toEqual([
      'clients',
      'pos',
      'panier',
      'devis',
      'commandes',
      'reclamations',
    ]);
  });

  it('commercial voit le flow sans réclamations (profil réel)', () => {
    const commercial = buildSidebarUniverses('commercial').find((u) => u.id === 'commercial');
    expect(commercial).toBeDefined();
    const ids = commercial!.items.map((i) => i.id);
    expect(ids).toContain('clients');
    expect(ids).toContain('commandes');
    expect(ids).not.toContain('reclamations');
    const visibleFlow = ids.filter((id) =>
      (COMMERCIAL_FLOW_ORDER as readonly string[]).includes(id),
    );
    expect(visibleFlow.length).toBe(5);
  });

  it('admin Direction inclut réclamations dans le flow commercial', () => {
    const commercial = buildSidebarUniverses('admin').find((u) => u.id === 'commercial');
    expect(commercial?.items.some((i) => i.id === 'reclamations')).toBe(true);
  });
});

describe('sumAuthorizedAdminMacroBadges', () => {
  it('agrège prix / catalogue / anomalies — sans volume brouillons unpublished', () => {
    const n = sumAuthorizedAdminMacroBadges(
      {
        'pricing-missing': 59,
        'catalogue-incomplete': 3,
        unpublished: 247,
        'anomalies-critical': 1,
      },
      ADMIN_MACRO_MODULES,
    );
    expect(n).toBe(59 + 3 + 1);
  });

  it('retourne 0 si compteurs vides', () => {
    expect(sumAuthorizedAdminMacroBadges({})).toBe(0);
  });

  it('Articles finis = pricing-missing ; Formules = unpublished ; Matières = catalogue-incomplete', () => {
    const counts = {
      'pricing-missing': 59,
      'catalogue-incomplete': 3,
      unpublished: 5,
    };
    expect(macroNavBadge('matieres', counts)).toBe(3);
    expect(macroNavBadge('prix-articles', counts)).toBe(59);
    expect(macroNavBadge('formules', counts)).toBe(5);
    expect(macroNavBadge('overview', counts)).toBe(0);
  });
});

describe('ADMIN_MACRO_MODULES', () => {
  it('expose exactement 7 macros plates', () => {
    expect(ADMIN_MACRO_MODULES.map((m) => m.id)).toEqual([
      'overview',
      'matieres',
      'prix-articles',
      'formules',
      'production',
      'temps',
      'org',
    ]);
  });

  it('macroHubUrl org pointe vers hub canonique roles-permissions', () => {
    expect(macroHubUrl('org')).toBe('/administration/roles-permissions');
  });

  it("inclut modèles d'articles dans Formules", () => {
    const formules = ADMIN_MACRO_MODULES.find((m) => m.id === 'formules');
    expect(formules?.microItems.some((i) => i.id === 'modeles-articles')).toBe(true);
  });
});

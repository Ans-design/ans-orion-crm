import { describe, expect, it } from 'vitest';
import { ORION_V29_PROFILES } from '@/lib/orion-v29-accounts';
import { getHomeRouteForRole, flattenNavItems } from '@/lib/modules';
import { canAccessPage } from '@/lib/page-access';
import { ROLES } from '@/lib/auth/permissions';

describe('chaque employé — home + nav sans page interdite', () => {
  it('FIN01 (finance) atterrit sur son espace, pas le cockpit direction', () => {
    expect(getHomeRouteForRole('finance')).toBe('/workspace/finance');
    expect(canAccessPage('finance', '/workspace/finance')).toBe(true);
  });

  it('chaque profil v29 a une home autorisée', () => {
    for (const p of ORION_V29_PROFILES) {
      const home = getHomeRouteForRole(p.role);
      expect(canAccessPage(p.role, home), `${p.matricule} ${p.role} → ${home}`).toBe(true);
    }
  });

  it('aucun lien de nav n’envoie un rôle vers /non-autorise', () => {
    const roles = [...ROLES];
    for (const role of roles) {
      const items = flattenNavItems(role);
      for (const item of items) {
        expect(canAccessPage(role, item.href), `${role} nav ${item.href}`).toBe(true);
      }
    }
  });
});

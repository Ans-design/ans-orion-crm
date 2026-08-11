import { describe, expect, it } from 'vitest';
import { roleToServiceKeys, TALK_SERVICE_GROUPS, isTalkOrderMemberRole } from '@/lib/messaging/constants';

describe('roleToServiceKeys — pas de liste vide', () => {
  it('demo a accès à tous les services', () => {
    expect(roleToServiceKeys('demo').length).toBe(TALK_SERVICE_GROUPS.length);
  });

  it('user a au moins un service', () => {
    expect(roleToServiceKeys('user').length).toBeGreaterThan(0);
  });

  it('accueil et caisse sont membres commande', () => {
    expect(isTalkOrderMemberRole('accueil')).toBe(true);
    expect(isTalkOrderMemberRole('caisse')).toBe(true);
  });

  it('lecture a une clé service par défaut', () => {
    expect(roleToServiceKeys('lecture').length).toBeGreaterThan(0);
  });
});

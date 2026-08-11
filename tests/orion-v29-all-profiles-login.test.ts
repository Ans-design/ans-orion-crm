import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  ORION_V29_PROFILES,
  getOrionV29Accounts,
  resolveOrionV29QuickLogin,
  matchOrionV29Account,
} from '@/lib/orion-v29-accounts';

const envBackup = { ...process.env };

describe('ORION v29 — tous les profils login', () => {
  beforeEach(() => {
    process.env = { ...envBackup };
  });
  afterEach(() => {
    process.env = { ...envBackup };
    vi.unstubAllEnvs();
  });

  it('catalogue profils couvre les rôles métier (17+)', () => {
    expect(ORION_V29_PROFILES.length).toBeGreaterThanOrEqual(17);
    const mats = new Set(ORION_V29_PROFILES.map((p) => p.matricule));
    for (const m of ['ADM01', 'COM01', 'GRA01', 'OPE01', 'CAISSE01', 'FIN01', 'LEC01']) {
      expect(mats.has(m)).toBe(true);
    }
  });

  it('quick-login résout chaque profil sans ORION_V29_PASSWORDS_JSON', () => {
    delete process.env.ORION_V29_PASSWORDS_JSON;
    expect(getOrionV29Accounts()).toHaveLength(0);
    for (const p of ORION_V29_PROFILES) {
      expect(resolveOrionV29QuickLogin(p.matricule)?.email).toBe(p.email);
      expect(resolveOrionV29QuickLogin(p.email)?.matricule).toBe(p.matricule);
    }
  });

  it('mot de passe : chaque matricule du JSON est authentifiable', () => {
    const map: Record<string, string> = {};
    for (const p of ORION_V29_PROFILES) {
      map[p.matricule] = `${p.matricule}!Orion26`;
    }
    process.env.ORION_V29_PASSWORDS_JSON = JSON.stringify(map);
    expect(getOrionV29Accounts()).toHaveLength(ORION_V29_PROFILES.length);
    for (const p of ORION_V29_PROFILES) {
      expect(matchOrionV29Account(p.matricule, map[p.matricule])?.id).toBe(p.id);
      expect(matchOrionV29Account(p.email, map[p.matricule])?.matricule).toBe(p.matricule);
    }
  });
});

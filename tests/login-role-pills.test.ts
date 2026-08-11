import { describe, expect, it } from 'vitest';
import { getLoginRolePills } from '@/components/auth/login-role-pills';

describe('LoginRolePills — raccourcis v29', () => {
  it('expose 8 pastilles métier avec matricules uniques', () => {
    const pills = getLoginRolePills();
    expect(pills).toHaveLength(8);
    expect(pills.map((p) => p.matricule)).toEqual([
      'DIRECTEUR',
      'ADM01',
      'GRA01',
      'COM01',
      'LOG01',
      'FAC01',
      'CM01',
      'TECH01',
    ]);
    expect(new Set(pills.map((p) => p.short)).size).toBe(8);
  });
});

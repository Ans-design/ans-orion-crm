import { describe, expect, it } from 'vitest';
import {
  gateAccountAccess,
  isEmployeeActive,
  isUserRoleAllowed,
  LOGIN_MESSAGES,
} from '@/lib/login-account-status';

describe('login-account-status', () => {
  it('allows active employee and standard role', () => {
    expect(gateAccountAccess({ userRole: 'commercial', employeeStatut: 'Actif' })).toEqual({ allowed: true });
  });

  it('blocks inactive employee', () => {
    expect(gateAccountAccess({ userRole: 'commercial', employeeStatut: 'Inactif' })).toEqual({
      allowed: false,
      code: 'disabled',
      message: LOGIN_MESSAGES.disabled,
    });
  });

  it('blocks banned user role', () => {
    expect(gateAccountAccess({ userRole: 'blocked', employeeStatut: 'Actif' })).toEqual({
      allowed: false,
      code: 'unauthorized',
      message: LOGIN_MESSAGES.unauthorized,
    });
  });

  it('isEmployeeActive handles accents and case', () => {
    expect(isEmployeeActive('Suspendu')).toBe(false);
    expect(isEmployeeActive('ACTIF')).toBe(true);
  });

  it('isUserRoleAllowed rejects disabled roles', () => {
    expect(isUserRoleAllowed('disabled')).toBe(false);
    expect(isUserRoleAllowed('admin')).toBe(true);
  });
});

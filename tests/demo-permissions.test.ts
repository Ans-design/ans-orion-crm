import { describe, expect, it } from 'vitest';
import { hasPermission, isReadOnlyRole } from '../lib/auth/permissions';

describe('demo permissions', () => {
  it('demo role can write clients/devis but not finance or production', () => {
    expect(hasPermission('demo', 'clients:write')).toBe(true);
    expect(hasPermission('demo', 'devis:write')).toBe(true);
    expect(hasPermission('demo', 'commandes:write')).toBe(false);
    expect(hasPermission('demo', 'paiements:write')).toBe(false);
    expect(hasPermission('demo', 'production:write')).toBe(false);
  });

  it('demo role is not read-only', () => {
    expect(isReadOnlyRole('demo')).toBe(false);
    expect(isReadOnlyRole('lecture')).toBe(true);
  });

  it('admin retains full access', () => {
    expect(hasPermission('admin', 'clients:write')).toBe(true);
    expect(hasPermission('admin', 'users:manage')).toBe(true);
    expect(hasPermission('admin', 'config:import')).toBe(true);
    expect(hasPermission('admin', 'export:run')).toBe(true);
  });
});

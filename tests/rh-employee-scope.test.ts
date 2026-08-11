import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/rh-service', () => ({
  getEmployeeForSession: vi.fn(),
}));

import { getEmployeeForSession } from '@/lib/services/rh-service';
import {
  assertOwnEmployeeOrRhAdmin,
  isRhPrivilegedRole,
  resolveSessionEmployeeId,
} from '@/lib/server/modules/rh/rh-employee-scope';

describe('rh-employee-scope', () => {
  it('isRhPrivilegedRole accepte admin/manager hors démo', () => {
    expect(isRhPrivilegedRole('admin')).toBe(true);
    expect(isRhPrivilegedRole('manager')).toBe(true);
    expect(isRhPrivilegedRole('demo')).toBe(false);
    expect(isRhPrivilegedRole('commercial')).toBe(false);
  });

  it('resolveSessionEmployeeId lit la fiche employé', async () => {
    vi.mocked(getEmployeeForSession).mockResolvedValueOnce({ id: 'emp-1' } as never);
    await expect(resolveSessionEmployeeId('u1', 'ADM01')).resolves.toBe('emp-1');
  });

  it('assertOwnEmployeeOrRhAdmin refuse accès croisé', async () => {
    vi.mocked(getEmployeeForSession).mockResolvedValueOnce({ id: 'emp-self' } as never);
    const denied = await assertOwnEmployeeOrRhAdmin(
      { userId: 'u1', role: 'commercial' },
      'emp-other',
    );
    expect(denied?.status).toBe(403);
  });

  it('assertOwnEmployeeOrRhAdmin autorise admin', async () => {
    const denied = await assertOwnEmployeeOrRhAdmin(
      { userId: 'u1', role: 'admin' },
      'emp-other',
    );
    expect(denied).toBeNull();
  });
});

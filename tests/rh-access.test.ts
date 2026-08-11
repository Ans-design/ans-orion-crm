import { describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/auth-utils', () => ({
  requireAdminOrManager: vi.fn(),
  requireAdmin: vi.fn(),
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
}));

import {
  requireAdminOrManager,
  requireAdmin,
  requireAuth,
  requirePermission,
} from '@/lib/auth-utils';
import { requireRhAdmin, requireRhPayrollWrite, requireRhEmployee } from '@/lib/server/auth/rh-access';

describe('rh-access', () => {
  it('requireRhAdmin bloque le compte démo', async () => {
    vi.mocked(requirePermission).mockResolvedValueOnce({
      role: 'demo',
      userId: 'd1',
      userName: 'Demo',
      session: {} as never,
    });
    const result = await requireRhAdmin();
    expect(result).toHaveProperty('error');
  });

  it('requireRhPayrollWrite refuse manager via requireAdmin', async () => {
    vi.mocked(requirePermission).mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 }),
    });
    vi.mocked(requireAdmin).mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 }),
    });
    const result = await requireRhPayrollWrite();
    expect(result).toHaveProperty('error');
  });

  it('requireRhAdmin autorise manager', async () => {
    vi.mocked(requirePermission).mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 }),
    });
    vi.mocked(requireAdminOrManager).mockResolvedValueOnce({
      role: 'manager',
      userId: 'm1',
      userName: 'Manager',
      session: {} as never,
    });
    const result = await requireRhAdmin();
    expect(result).not.toHaveProperty('error');
    expect((result as { role: string }).role).toBe('manager');
  });

  it('requireRhEmployee bloque le compte démo', async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      role: 'demo',
      userId: 'd1',
      userName: 'Demo',
      session: {} as never,
    });
    const result = await requireRhEmployee();
    expect(result).toHaveProperty('error');
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';

const { upsert, findUnique, resolveAuthUserFromDb } = vi.hoisted(() => ({
  upsert: vi.fn(),
  findUnique: vi.fn(),
  resolveAuthUserFromDb: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { upsert, findUnique },
  },
}));

vi.mock('@/lib/resolve-auth-user', () => ({
  resolveAuthUserFromDb,
}));

import { ensureUserInDb } from '@/lib/ensure-auth-user';

describe('ensureUserInDb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne utilisateur existant', async () => {
    resolveAuthUserFromDb.mockResolvedValue({
      id: 'u1',
      email: 'a@b.mg',
      role: 'admin',
    });
    const r = await ensureUserInDb({ email: 'a@b.mg', role: 'admin' });
    expect(r?.id).toBe('u1');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('ne provisionne pas en readOnly (défaut AUTH-002)', async () => {
    resolveAuthUserFromDb.mockResolvedValue(null);
    const r = await ensureUserInDb({ email: 'john@doe.com', role: 'admin', name: 'Admin' });
    expect(r).toBeNull();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('provisionne uniquement si readOnly=false (login/admin)', async () => {
    resolveAuthUserFromDb.mockResolvedValue(null);
    upsert.mockResolvedValue({
      id: 'new-id',
      email: 'john@doe.com',
      name: 'Admin',
      role: 'admin',
    });
    const r = await ensureUserInDb(
      { email: 'john@doe.com', role: 'admin', name: 'Admin' },
      { readOnly: false },
    );
    expect(r?.id).toBe('new-id');
    expect(upsert).toHaveBeenCalled();
  });
});

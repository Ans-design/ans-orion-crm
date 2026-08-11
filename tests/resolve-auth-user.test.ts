import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { prisma } from '@/lib/prisma';
import { resolveAuthUserFromDb } from '@/lib/resolve-auth-user';

const findUnique = vi.mocked(prisma.user.findUnique);

describe('resolveAuthUserFromDb', () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it('retourne l’id Prisma réel pour un email connu', async () => {
    findUnique.mockResolvedValueOnce({
      id: 'cuid-real',
      email: 'demo@ansdesign.mg',
      name: 'Compte Démo',
      role: 'demo',
    } as never);
    const r = await resolveAuthUserFromDb({
      id: 'dev-demo',
      email: 'demo@ansdesign.mg',
      role: 'demo',
    });
    expect(r?.id).toBe('cuid-real');
  });

  it('retourne null si ni email ni id ne matchent', async () => {
    findUnique.mockResolvedValue(null);
    const r = await resolveAuthUserFromDb({
      id: 'ghost',
      email: 'ghost@test.mg',
      role: 'user',
    });
    expect(r).toBeNull();
  });
});

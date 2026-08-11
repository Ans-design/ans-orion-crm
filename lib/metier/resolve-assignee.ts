import { prisma } from '@/lib/prisma';

/** Résout un nom d'opérateur vers un compte User (nom ou email). */
export async function resolveAssigneeUser(name: string | null | undefined) {
  const q = name?.trim();
  if (!q) return null;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    take: 300,
  });
  const lower = q.toLowerCase();
  return users.find(
    (u) =>
      u.name?.toLowerCase() === lower
      || u.email.toLowerCase() === lower
      || u.name?.toLowerCase().includes(lower),
  ) ?? null;
}

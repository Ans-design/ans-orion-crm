import { prisma } from '@/lib/server/db/prisma';

export async function listMessagingUsers(
  auth: { userId: string; role: string },
  options: { showEmail: boolean },
) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, image: true },
    orderBy: { name: 'asc' },
  });

  return users
    .filter((u) => u.id !== auth.userId)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: options.showEmail ? u.email : null,
      role: u.role,
      image: u.image,
    }));
}

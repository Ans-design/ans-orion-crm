import { prisma } from '@/lib/prisma';

export type AuthProfile = {
  id?: string;
  email: string;
  name?: string | null;
  role: string;
};

/** Aligne l'id session sur l'utilisateur réel en base (évite FK Talk après redeploy / comptes démo). */
export async function resolveAuthUserFromDb(profile: AuthProfile): Promise<AuthProfile | null> {
  const email = profile.email.trim().toLowerCase();
  if (!email) return null;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, name: true, email: true },
    });
    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name ?? profile.name,
        role: dbUser.role,
      };
    }
  } catch {
    /* base indisponible */
  }

  if (profile.id) {
    try {
      const byId = await prisma.user.findUnique({
        where: { id: profile.id },
        select: { id: true, role: true, name: true, email: true },
      });
      if (byId) {
        return {
          id: byId.id,
          email: byId.email,
          name: byId.name ?? profile.name,
          role: byId.role,
        };
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

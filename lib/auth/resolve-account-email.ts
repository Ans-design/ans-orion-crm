import { prisma } from '@/lib/prisma';

/** Résout email depuis matricule ou email (mot de passe oublié). */
export async function resolveAccountEmail(identifier: string): Promise<string | null> {
  const raw = identifier.trim();
  if (!raw) return null;

  if (raw.includes('@')) {
    return raw.toLowerCase();
  }

  const employee = await prisma.employee.findUnique({
    where: { matricule: raw.toUpperCase() },
    select: { email: true, userId: true },
  });
  if (!employee) return null;

  if (employee.email?.includes('@')) {
    return employee.email.trim().toLowerCase();
  }

  if (employee.userId) {
    const user = await prisma.user.findUnique({
      where: { id: employee.userId },
      select: { email: true },
    });
    if (user?.email) return user.email.toLowerCase();
  }

  return null;
}

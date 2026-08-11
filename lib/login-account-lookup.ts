import { prisma } from '@/lib/prisma';
import { gateAccountAccess } from '@/lib/login-account-status';

/** Vérifie statut employé / rôle avant tentative de connexion (matricule ou email). */
export async function lookupAccountGate(identifier: string) {
  const raw = identifier.trim();
  if (!raw) return gateAccountAccess({});

  if (raw.includes('@')) {
    const email = raw.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: email },
          ...(user?.id ? [{ userId: user.id }] : []),
        ],
      },
      select: { statut: true },
    });
    return gateAccountAccess({
      userRole: user?.role,
      employeeStatut: employee?.statut,
    });
  }

  const employee = await prisma.employee.findUnique({
    where: { matricule: raw.toUpperCase() },
    select: { statut: true, userId: true, authRole: true },
  });
  if (!employee) {
    return gateAccountAccess({});
  }

  const user = employee.userId
    ? await prisma.user.findUnique({ where: { id: employee.userId }, select: { role: true } })
    : null;

  return gateAccountAccess({
    userRole: user?.role ?? employee.authRole,
    employeeStatut: employee.statut,
  });
}

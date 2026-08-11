import { prisma } from '@/lib/prisma';

export type RoleAssignee = {
  assigneeId: string;
  assigneeName: string;
};

const ROLE_ALIASES: Record<string, string[]> = {
  production: ['production', 'operateur', 'opérateur', 'atelier'],
  designer: ['designer', 'graphiste', 'studio', 'bat'],
  faconnage: ['faconnage', 'façonnage', 'finition', 'atelier'],
  livraison: ['livraison', 'logistique', 'livreur'],
  commercial: ['commercial', 'vendeur', 'sales'],
  admin: ['admin', 'manager', 'direction'],
  manager: ['manager', 'admin', 'direction'],
};

function expandRoles(role: string): string[] {
  const key = role.trim().toLowerCase();
  const aliases = ROLE_ALIASES[key] ?? [key];
  return [...new Set([key, ...aliases])];
}

/**
 * Choisit un utilisateur actif pour un rôle métier (charge minimale de tâches ouvertes).
 * Priorité : Employee.authRole lié à User → User.role.
 */
export async function resolveAssigneeFromRole(
  role: string | null | undefined,
): Promise<RoleAssignee | null> {
  const trimmed = role?.trim();
  if (!trimmed) return null;

  const roles = expandRoles(trimmed);

  const employees = await prisma.employee.findMany({
    where: {
      statut: 'Actif',
      userId: { not: null },
      OR: roles.map((r) => ({ authRole: r })),
    },
    select: { userId: true, firstName: true, lastName: true, authRole: true },
    take: 50,
  });

  const candidateIds = new Set<string>();
  const nameById = new Map<string, string>();

  for (const emp of employees) {
    if (!emp.userId) continue;
    candidateIds.add(emp.userId);
    nameById.set(emp.userId, `${emp.firstName} ${emp.lastName}`.trim());
  }

  if (candidateIds.size === 0) {
    const users = await prisma.user.findMany({
      where: { OR: roles.map((r) => ({ role: r })) },
      select: { id: true, name: true, email: true, role: true },
      take: 50,
    });
    for (const u of users) {
      candidateIds.add(u.id);
      nameById.set(u.id, u.name?.trim() || u.email);
    }
  }

  // Local / seed : si aucun user du rôle, basculer admin/manager pour débloquer le flux.
  if (candidateIds.size === 0 && process.env.APP_ENV !== 'production') {
    const fallbacks = await prisma.user.findMany({
      where: { role: { in: ['admin', 'manager'] } },
      select: { id: true, name: true, email: true },
      take: 10,
    });
    for (const u of fallbacks) {
      candidateIds.add(u.id);
      nameById.set(u.id, u.name?.trim() || u.email);
    }
  }

  if (candidateIds.size === 0) return null;

  const ids = [...candidateIds];
  const openCounts = await prisma.metierTask.groupBy({
    by: ['assigneeId'],
    where: {
      assigneeId: { in: ids },
      status: { notIn: ['Terminée', 'Annulée'] },
    },
    _count: { _all: true },
  }).catch(() => [] as { assigneeId: string | null; _count: { _all: number } }[]);

  const countMap = new Map<string, number>();
  for (const row of openCounts) {
    if (row.assigneeId) countMap.set(row.assigneeId, row._count._all);
  }

  ids.sort((a, b) => (countMap.get(a) ?? 0) - (countMap.get(b) ?? 0));
  const bestId = ids[0];
  if (!bestId) return null;

  return {
    assigneeId: bestId,
    assigneeName: nameById.get(bestId) ?? bestId,
  };
}

import { prisma } from '@/lib/prisma';
import { ROLES, ROLE_LABELS } from '@/lib/auth/permissions';
import { MODULE_REGISTRY } from '@/lib/modules/module-registry';
import {
  getModulePermissions,
  PERMISSION_MATRIX,
  DEFAULT_PERMISSION_FLAGS,
} from '@/lib/modules/permission-matrix';
import type { PermissionFlags } from '@/lib/modules/types';
import { EDITABLE_ROLES } from '@/lib/constants/permission-flags';

type FlagsJson = Partial<PermissionFlags>;

function parseFlags(raw: unknown): FlagsJson {
  if (!raw || typeof raw !== 'object') return {};
  return raw as FlagsJson;
}

export async function listRoleOverrides(role: string) {
  const rows = await prisma.roleModulePermission.findMany({ where: { role } });
  return Object.fromEntries(rows.map((r) => [r.moduleId, parseFlags(r.flags)]));
}

export async function listUserOverrides(userId: string) {
  const rows = await prisma.userModuleOverride.findMany({ where: { userId } });
  return Object.fromEntries(rows.map((r) => [r.moduleId, parseFlags(r.flags)]));
}

export function resolveEffectiveFlags(
  authRole: string,
  moduleId: string,
  roleOverride?: FlagsJson | null,
  userOverride?: FlagsJson | null,
): PermissionFlags {
  return getModulePermissions(authRole, moduleId, roleOverride ?? undefined, userOverride ?? undefined);
}

export async function getEffectiveModuleAccess(authRole: string, userId?: string) {
  const [roleRows, userRows] = await Promise.all([
    prisma.roleModulePermission.findMany({ where: { role: authRole } }),
    userId
      ? prisma.userModuleOverride.findMany({ where: { userId } })
      : Promise.resolve([]),
  ]);

  const roleMap = Object.fromEntries(roleRows.map((r) => [r.moduleId, parseFlags(r.flags)]));
  const userMap = Object.fromEntries(userRows.map((r) => [r.moduleId, parseFlags(r.flags)]));

  const access: Record<string, PermissionFlags> = {};
  for (const moduleId of Object.keys(MODULE_REGISTRY)) {
    access[moduleId] = resolveEffectiveFlags(authRole, moduleId, roleMap[moduleId], userMap[moduleId]);
  }
  return access;
}

export async function getPermissionAdminMatrix() {
  const modules = Object.values(MODULE_REGISTRY)
    .filter((m) => m.status !== 'hidden')
    .sort((a, b) => a.order - b.order)
    .map((m) => ({ id: m.id, label: m.label, group: m.group, href: m.href }));

  const roleMatrix: Record<string, Record<string, PermissionFlags>> = {};
  for (const role of EDITABLE_ROLES) {
    const overrides = await listRoleOverrides(role);
    roleMatrix[role] = {};
    for (const mod of modules) {
      roleMatrix[role][mod.id] = resolveEffectiveFlags(role, mod.id, overrides[mod.id]);
    }
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { email: 'asc' },
  });

  return {
    modules,
    roles: EDITABLE_ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r] ?? r })),
    allRoles: ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r] ?? r })),
    roleMatrix,
    defaults: PERMISSION_MATRIX,
    defaultFlags: DEFAULT_PERMISSION_FLAGS,
    users,
  };
}

export async function upsertRoleModulePermission(
  role: string,
  moduleId: string,
  flags: FlagsJson,
) {
  if (!MODULE_REGISTRY[moduleId]) throw new Error('Module inconnu');
  if (role === 'admin') throw new Error('Le rôle admin est protégé');

  const row = await prisma.roleModulePermission.upsert({
    where: { role_moduleId: { role, moduleId } },
    create: { role, moduleId, flags },
    update: { flags },
  });

  try {
    const { bumpPermissionPolicyVersion } = await import('@/lib/server/permission-policy-version');
    await bumpPermissionPolicyVersion({ note: `role:${role}:${moduleId}` });
  } catch (e) {
    console.warn('[permissions] policyVersion bump', e);
  }

  return row;
}

export async function upsertUserModuleOverride(
  userId: string,
  moduleId: string,
  flags: FlagsJson,
) {
  if (!MODULE_REGISTRY[moduleId]) throw new Error('Module inconnu');

  return prisma.userModuleOverride.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: { userId, moduleId, flags },
    update: { flags },
  });
}

export async function resetRolePermissions(role: string) {
  if (role === 'admin') throw new Error('Le rôle admin est protégé');
  await prisma.roleModulePermission.deleteMany({ where: { role } });
  return { cleared: true };
}

export async function resetUserOverrides(userId: string) {
  await prisma.userModuleOverride.deleteMany({ where: { userId } });
  return { cleared: true };
}

export async function getUserPermissionMatrix(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new Error('Utilisateur introuvable');

  const [roleOverrides, userOverrides] = await Promise.all([
    listRoleOverrides(user.role),
    listUserOverrides(userId),
  ]);

  const modules = Object.values(MODULE_REGISTRY)
    .filter((m) => m.status !== 'hidden')
    .sort((a, b) => a.order - b.order);

  const matrix: Record<string, { effective: PermissionFlags; roleOverride: FlagsJson; userOverride: FlagsJson }> = {};
  for (const mod of modules) {
    matrix[mod.id] = {
      effective: resolveEffectiveFlags(user.role, mod.id, roleOverrides[mod.id], userOverrides[mod.id]),
      roleOverride: roleOverrides[mod.id] ?? {},
      userOverride: userOverrides[mod.id] ?? {},
    };
  }

  return { user, matrix };
}

export async function getPermissionSyncStats() {
  const [roleOverrides, userOverrides, usersWithOverrides] = await Promise.all([
    prisma.roleModulePermission.count(),
    prisma.userModuleOverride.count(),
    prisma.userModuleOverride.groupBy({ by: ['userId'], _count: true }),
  ]);

  return {
    roleOverrides,
    userOverrides,
    usersWithOverrides: usersWithOverrides.length,
    editableRoles: EDITABLE_ROLES.length,
    modules: Object.keys(MODULE_REGISTRY).length,
  };
}

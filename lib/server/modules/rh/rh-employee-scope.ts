import { NextResponse } from 'next/server';
import { isDemoRole } from '@/lib/auth/permissions';
import { getEmployeeForSession } from '@/lib/services/rh-service';

export function isRhPrivilegedRole(role: string): boolean {
  return (role === 'admin' || role === 'manager') && !isDemoRole(role);
}

export async function resolveSessionEmployeeId(
  userId: string,
  matricule?: string | null,
): Promise<string | null> {
  const emp = await getEmployeeForSession(userId, matricule);
  return emp?.id ?? null;
}

/** Refuse l'accès si l'utilisateur n'est ni RH admin ni propriétaire de la fiche. */
export async function assertOwnEmployeeOrRhAdmin(
  auth: { userId: string; role: string },
  targetEmployeeId: string,
  matricule?: string | null,
): Promise<NextResponse | null> {
  if (isRhPrivilegedRole(auth.role)) return null;
  const selfId = await resolveSessionEmployeeId(auth.userId, matricule);
  if (selfId && selfId === targetEmployeeId) return null;
  return NextResponse.json(
    { error: 'Accès non autorisé à ces données RH' },
    { status: 403 },
  );
}

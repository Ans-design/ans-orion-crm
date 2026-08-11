import { NextResponse } from 'next/server';
import {
  requireAdmin,
  requireAdminOrManager,
  requireAuth,
  requirePermission,
  type RequireAuthOptions,
} from '@/lib/auth-utils';
import { isDemoRole } from '@/lib/auth/permissions';

function rhDemoBlocked() {
  return {
    error: NextResponse.json({ error: 'Module RH restreint en mode démo' }, { status: 403 }),
  } as const;
}

/** Données RH opérationnelles (effectifs, recrutement, absences) — admin / manager, hors démo. */
export async function requireRhAdmin(options?: RequireAuthOptions) {
  const auth = await requirePermission('rh:read', options);
  if ('error' in auth) {
    // Fallback: admin/manager historiques
    const fallback = await requireAdminOrManager(options);
    if ('error' in fallback) return auth;
    if (isDemoRole(fallback.role)) return rhDemoBlocked();
    return fallback;
  }
  if (isDemoRole(auth.role)) return rhDemoBlocked();
  return auth;
}

/**
 * Lecture montants de paie / grilles salariales — rh:payroll_read (admin).
 * Un manager ne reçoit jamais les montants complets (Lot A3 V4).
 */
export async function requireRhPayrollRead(options?: RequireAuthOptions) {
  const auth = await requirePermission('rh:payroll_read', options);
  if ('error' in auth) return auth;
  if (isDemoRole(auth.role)) return rhDemoBlocked();
  return auth;
}

/** Écriture paie / avances — rh:payroll_write (admin). */
export async function requireRhPayrollWrite(options?: RequireAuthOptions) {
  const auth = await requirePermission('rh:payroll_write', options);
  if ('error' in auth) {
    const fallback = await requireAdmin(options);
    if ('error' in fallback) return auth;
    if (isDemoRole(fallback.role)) return rhDemoBlocked();
    return fallback;
  }
  if (isDemoRole(auth.role)) return rhDemoBlocked();
  return auth;
}

/** Écriture RH opérationnelle (hors paie) — rh:write. */
export async function requireRhWrite(options?: RequireAuthOptions) {
  const auth = await requirePermission('rh:write', options);
  if ('error' in auth) {
    const fallback = await requireAdminOrManager(options);
    if ('error' in fallback) return auth;
    if (isDemoRole(fallback.role)) return rhDemoBlocked();
    return fallback;
  }
  if (isDemoRole(auth.role)) return rhDemoBlocked();
  return auth;
}

/** Espace employé (profil, pointage, congés, annonces) — session authentifiée, hors démo. */
export async function requireRhEmployee(options?: RequireAuthOptions) {
  const auth = await requireAuth(options);
  if ('error' in auth) return auth;
  if (isDemoRole(auth.role)) return rhDemoBlocked();
  return auth;
}

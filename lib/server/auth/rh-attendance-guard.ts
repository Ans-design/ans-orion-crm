import { getLateArrivalGate } from '@/lib/services/late-arrival-service';
import { getRhSessionMatricule } from '@/lib/server/modules/rh/rh-session';

const CACHE_TTL_MS = 45_000;
const attendanceCache = new Map<string, { blocked: boolean; expires: number }>();

/** Garde RH désactivée en dev local si SKIP_RH_ATTENDANCE_GUARD_IN_DEV=true */
export function isRhAttendanceGuardEnabled(): boolean {
  if (process.env.SKIP_RH_ATTENDANCE_GUARD_IN_DEV === 'true') {
    const env = process.env.APP_ENV ?? process.env.NODE_ENV;
    if (env === 'local' || env === 'development' || process.env.LOCAL_DEV === 'true') {
      return false;
    }
  }
  return true;
}

/** Chemins API exemptés (déclaration retard, auth, setup). */
export function isRhAttendanceExemptPath(pathname: string): boolean {
  const exemptPrefixes = [
    '/api/auth/',
    '/api/rh/late-arrival',
    '/api/health',
    '/api/setup-db',
    '/api/signup',
    '/api/auth/setup-status',
  ];
  return exemptPrefixes.some((p) => pathname === p || pathname.startsWith(p));
}

export function clearRhAttendanceCache(userId?: string): void {
  if (userId) attendanceCache.delete(userId);
  else attendanceCache.clear();
}

/**
 * Vérifie si l'utilisateur doit être bloqué (retard non déclaré).
 * Fail-closed : erreur interne → blocked=true.
 */
export async function isRhAttendanceBlocked(
  userId: string,
  matricule?: string | null,
): Promise<boolean> {
  if (!isRhAttendanceGuardEnabled()) return false;

  const cacheKey = userId;
  const hit = attendanceCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.blocked;

  try {
    let resolvedMatricule = matricule;
    if (resolvedMatricule === undefined) {
      try {
        resolvedMatricule = await getRhSessionMatricule();
      } catch {
        resolvedMatricule = null;
      }
    }
    const gate = await getLateArrivalGate(userId, resolvedMatricule);
    const blocked = gate.blocked === true;
    attendanceCache.set(cacheKey, { blocked, expires: Date.now() + CACHE_TTL_MS });
    return blocked;
  } catch (error) {
    console.error('[rh-attendance-guard] fail-closed:', error);
    attendanceCache.set(cacheKey, { blocked: true, expires: Date.now() + 15_000 });
    return true;
  }
}

export const RH_ATTENDANCE_BLOCKED_MESSAGE =
  'Déclaration de retard requise avant d\'accéder à l\'application.';

export const RH_ATTENDANCE_BLOCKED_CODE = 'RH_ATTENDANCE_BLOCKED';

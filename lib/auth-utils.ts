import '@/lib/init-server-env';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { ensureUserInDb } from '@/lib/ensure-auth-user';
import {
  type Permission,
  ROLE_LABELS,
  ROLES,
  canManageUsers,
  hasPermission,
  isDemoBlockedRoute,
  isDemoRole,
  isReadOnlyRole,
} from '@/lib/auth/permissions';
import { authorize, authorizeAny } from '@/lib/auth/authorize';
import {
  isRhAttendanceBlocked,
  isRhAttendanceExemptPath,
  isRhAttendanceGuardEnabled,
  RH_ATTENDANCE_BLOCKED_CODE,
  RH_ATTENDANCE_BLOCKED_MESSAGE,
} from '@/lib/server/auth/rh-attendance-guard';

export { ROLES, ROLE_LABELS, canManageUsers, hasPermission, isReadOnlyRole };
export type { Permission };

export type RequireAuthOptions = {
  /** Ne pas appliquer le gate retard (ex. route late-arrival). */
  skipRhAttendance?: boolean;
  /** Chemin API pour exemptions (ex. /api/rh/late-arrival). */
  requestPath?: string;
};

async function enforceRhAttendance(
  auth: { userId: string; role: string },
  options?: RequireAuthOptions,
): Promise<{ error: NextResponse } | null> {
  if (options?.skipRhAttendance) return null;
  if (!isRhAttendanceGuardEnabled()) return null;
  if (canManageUsers(auth.role)) return null;

  const path = options?.requestPath;
  if (path && isRhAttendanceExemptPath(path)) return null;

  const blocked = await isRhAttendanceBlocked(auth.userId);
  if (!blocked) return null;

  return {
    error: NextResponse.json(
      {
        ok: false,
        error: {
          message: RH_ATTENDANCE_BLOCKED_MESSAGE,
          code: RH_ATTENDANCE_BLOCKED_CODE,
        },
      },
      { status: 403 },
    ),
  };
}

export async function requireAuth(options?: RequireAuthOptions) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  const user = session.user as { id?: string; role?: string; name?: string | null; email?: string | null };
  const email = user.email?.trim().toLowerCase();

  // AUTH-002 : résolution DB obligatoire — jamais fail-open JWT, jamais upsert ici.
  const profile = {
    id: user.id,
    email: email || user.id || '',
    role: user.role || 'user',
    name: user.name,
  };

  let resolved: Awaited<ReturnType<typeof ensureUserInDb>> = null;
  try {
    resolved = await ensureUserInDb(profile, { readOnly: true });
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Service d’authentification indisponible', code: 'AUTH_DB_UNAVAILABLE' },
        { status: 503 },
      ),
    };
  }

  if (!resolved?.id) {
    // DB down / user absent / inactif → refus (fail-closed)
    const status = email || user.id ? 401 : 401;
    return {
      error: NextResponse.json(
        {
          error: 'Session invalide ou utilisateur introuvable — reconnectez-vous',
          code: 'AUTH_USER_UNRESOLVED',
        },
        { status },
      ),
    };
  }

  const auth = {
    session,
    userId: resolved.id,
    role: resolved.role,
    userName: resolved.name || email || 'Utilisateur',
  };
  const rhBlock = await enforceRhAttendance(auth, options);
  if (rhBlock) return rhBlock;
  return auth;
}

export async function requireAdmin(options?: RequireAuthOptions) {
  const auth = await requireAuth(options);
  if ('error' in auth) return auth;
  if (auth.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 }) };
  }
  return auth;
}

export async function requirePermission(permission: Permission, options?: RequireAuthOptions) {
  const auth = await requireAuth(options);
  if ('error' in auth) return auth;
  const decision = authorize(
    { userId: auth.userId, role: auth.role },
    permission,
  );
  if (!decision.allowed) {
    return { error: NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 }) };
  }
  return auth;
}

/** Session utilisateur — préférences, notifications, badges (pas une permission métier). */
export async function requireSession(options?: RequireAuthOptions) {
  return requireAuth(options);
}

/** Au moins une permission requise (workspaces multi-rôles). */
export async function requireAnyPermission(
  ...args: (Permission | RequireAuthOptions)[]
) {
  const last = args.at(-1);
  const options =
    last && typeof last === 'object' && ('requestPath' in last || 'skipRhAttendance' in last)
      ? (last as RequireAuthOptions)
      : undefined;
  const permissions = (options ? args.slice(0, -1) : args) as Permission[];

  const auth = await requireAuth(options);
  if ('error' in auth) return auth;
  const decision = authorizeAny(
    { userId: auth.userId, role: auth.role },
    permissions,
  );
  if (!decision.allowed) {
    return { error: NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 }) };
  }
  return auth;
}

type ApiRequestLike = { url: string; method: string };

/** Auth API + garde-fous démo / lecture seule (remplace le middleware Edge). */
export async function requireApiAccess(permission: Permission, req: ApiRequestLike) {
  const pathname = new URL(req.url).pathname;
  const auth = await requirePermission(permission, { requestPath: pathname });
  if ('error' in auth) return auth;

  if (isReadOnlyRole(auth.role) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return { error: NextResponse.json({ error: 'Accès lecture seule — modification interdite' }, { status: 403 }) };
  }
  if (isDemoRole(auth.role) && isDemoBlockedRoute(pathname, req.method, auth.role)) {
    return { error: NextResponse.json({ error: 'Accès limité — compte démo' }, { status: 403 }) };
  }
  return auth;
}

export async function requireAdminOrManager(options?: RequireAuthOptions) {
  const auth = await requireAuth(options);
  if ('error' in auth) return auth;
  if (!canManageUsers(auth.role)) {
    return { error: NextResponse.json({ error: 'Accès réservé à la direction' }, { status: 403 }) };
  }
  return auth;
}

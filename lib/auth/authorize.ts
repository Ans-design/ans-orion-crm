/**
 * Service d’autorisation canonique (PERM-001 V10).
 * Une seule décision serveur pour API, nav et payloads.
 */

import {
  type Permission,
  hasPermission,
  isDemoBlockedRoute,
  isDemoRole,
} from '@/lib/auth/permissions';

export type AuthorizeSubject = {
  userId: string;
  role: string;
  /** Overrides user — deny explicite gagne. */
  denyPermissions?: Permission[];
  grantPermissions?: Permission[];
};

export type AuthorizeDecision = {
  allowed: boolean;
  reason: string;
  permission: Permission;
  role: string;
};

/**
 * Priorité : refus user > grant user > politique rôle.
 * Erreur / politique absente ⇒ refus (fail-closed).
 */
export function authorize(
  subject: AuthorizeSubject | null | undefined,
  permission: Permission,
  _context?: { path?: string; resourceId?: string },
): AuthorizeDecision {
  if (!subject?.userId || !subject.role) {
    return {
      allowed: false,
      reason: 'subject_missing',
      permission,
      role: subject?.role ?? '',
    };
  }

  const deny = subject.denyPermissions ?? [];
  if (deny.includes(permission)) {
    return {
      allowed: false,
      reason: 'user_deny_override',
      permission,
      role: subject.role,
    };
  }

  const grants = subject.grantPermissions ?? [];
  if (grants.includes(permission)) {
    return {
      allowed: true,
      reason: 'user_grant_override',
      permission,
      role: subject.role,
    };
  }

  try {
    const ok = hasPermission(subject.role, permission);
    return {
      allowed: ok,
      reason: ok ? 'role_grant' : 'role_deny',
      permission,
      role: subject.role,
    };
  } catch {
    return {
      allowed: false,
      reason: 'policy_error',
      permission,
      role: subject.role,
    };
  }
}

export function authorizeAny(
  subject: AuthorizeSubject | null | undefined,
  permissions: Permission[],
): AuthorizeDecision {
  for (const p of permissions) {
    const d = authorize(subject, p);
    if (d.allowed) return d;
  }
  return {
    allowed: false,
    reason: 'none_granted',
    permission: permissions[0]!,
    role: subject?.role ?? '',
  };
}

/** Navigation : même politique ; demo bloqué sur routes sensibles. */
export function canAccessPath(
  subject: AuthorizeSubject | null | undefined,
  path: string,
  method = 'GET',
): boolean {
  if (!subject) return false;
  if (isDemoRole(subject.role) && isDemoBlockedRoute(path, method, subject.role)) return false;
  return true;
}

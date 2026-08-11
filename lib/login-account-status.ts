/** Messages login — compte désactivé / non autorisé (sans révéler l'existence d'un compte inconnu). */

export const LOGIN_MESSAGES = {
  disabled: 'Ce compte est désactivé — contactez l\'administrateur.',
  unauthorized: 'Accès non autorisé pour ce profil.',
  invalidCredentials: 'Identifiants incorrects — vérifiez email et mot de passe.',
  locked: 'Trop de tentatives — compte temporairement verrouillé. Réessayez dans quelques minutes.',
  identifierRequired: 'Email requis.',
  emailInvalid: 'Adresse email invalide.',
  passwordRequired: 'Mot de passe requis (4 caractères minimum).',
} as const;

const INACTIVE_EMPLOYEE_STATUTS = new Set(['inactif', 'suspendu', 'licencié', 'licencie', 'désactivé', 'desactive']);

export function isEmployeeActive(statut: string | null | undefined): boolean {
  if (!statut) return true;
  return !INACTIVE_EMPLOYEE_STATUTS.has(statut.trim().toLowerCase());
}

export function isUserRoleAllowed(role: string | null | undefined): boolean {
  if (!role) return true;
  const r = role.trim().toLowerCase();
  return r !== 'blocked' && r !== 'disabled' && r !== 'banned';
}

export type AccountGateResult =
  | { allowed: true }
  | { allowed: false; code: 'disabled' | 'unauthorized'; message: string };

export function gateAccountAccess(opts: {
  userRole?: string | null;
  employeeStatut?: string | null;
}): AccountGateResult {
  if (!isUserRoleAllowed(opts.userRole)) {
    return { allowed: false, code: 'unauthorized', message: LOGIN_MESSAGES.unauthorized };
  }
  if (!isEmployeeActive(opts.employeeStatut)) {
    return { allowed: false, code: 'disabled', message: LOGIN_MESSAGES.disabled };
  }
  return { allowed: true };
}

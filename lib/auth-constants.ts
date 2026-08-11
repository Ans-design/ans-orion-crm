/**
 * Sentinelle connexion rapide démo — jamais un vrai mot de passe métier.
 * Client : valeur fixe non secrète pour le bouton quick-login (local uniquement).
 * Serveur : `getDemoQuickLoginToken()` — fail-closed hors local/E2E explicite.
 */
export const DEMO_QUICK_LOGIN_TOKEN = '__ANS_DEMO_QUICK__';

function isLocalOrE2eAuthContext(): boolean {
  if (process.env.E2E_MODE === 'true') return true;
  if (process.env.APP_ENV === 'local') return true;
  if (process.env.LOCAL_DEV === 'true') return true;
  if (process.env.ALLOW_INSECURE_LOCAL === 'true') return true;
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}

/**
 * Token accepté côté credentials provider.
 * - Env `DEMO_QUICK_LOGIN_TOKEN` prioritaire
 * - Sinon sentinelle locale uniquement en local/E2E
 * - Sinon chaîne vide (jamais de match en staging/prod)
 */
export function getDemoQuickLoginToken(): string {
  const fromEnv = (process.env.DEMO_QUICK_LOGIN_TOKEN || '').trim();
  if (fromEnv) return fromEnv;
  if (isLocalOrE2eAuthContext()) return DEMO_QUICK_LOGIN_TOKEN;
  return '';
}

/**
 * Comptes démo — mots de passe UNIQUEMENT via variables d'environnement.
 * Aucun secret en dur. Désactivés si DEMO_*_PASSWORD absents.
 */

export type DevAccount = {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'demo';
  id: string;
  badge: string;
  hint: string;
};

function envPassword(key: string): string {
  const v = process.env[key]?.trim() ?? '';
  return v;
}

/** Comptes injectés par env — liste vide si secrets manquants (fail-closed). */
export function getDevAccounts(): DevAccount[] {
  const accounts: DevAccount[] = [];

  const adminEmail = (process.env.DEMO_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = envPassword('DEMO_ADMIN_PASSWORD');
  if (adminEmail && adminPassword.length >= 8) {
    accounts.push({
      email: adminEmail,
      password: adminPassword,
      name: 'Admin ANS',
      role: 'admin',
      id: 'dev-admin',
      badge: 'Accès complet',
      hint: 'Injecté via DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD',
    });
  }

  const demoEmail = (process.env.DEMO_EMAIL || process.env.E2E_EMAIL || '').trim().toLowerCase();
  const demoPassword = envPassword('DEMO_PASSWORD') || envPassword('E2E_PASSWORD');
  if (demoEmail && demoPassword.length >= 8) {
    accounts.push({
      email: demoEmail,
      password: demoPassword,
      name: 'Compte Démo',
      role: 'demo',
      id: 'dev-demo',
      badge: 'CRM interactif',
      hint: 'Injecté via DEMO_EMAIL / DEMO_PASSWORD',
    });
  }

  return accounts;
}

/** @deprecated Utiliser getDevAccounts() — conservé pour imports legacy (lecture seule métadonnées). */
export const DEV_ACCOUNTS: readonly DevAccount[] = [];

export function matchDevAccount(email: string, password: string) {
  if (!email || !password) return null;
  const needle = email.trim().toLowerCase();
  return getDevAccounts().find((a) => a.email === needle && a.password === password) ?? null;
}

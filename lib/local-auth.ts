import { isLocalAppEnv } from '@/lib/local-dev';
import { isProductionDeploy } from '@/lib/auth-environment';

export type LocalAdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  matricule: string;
};

/** Auth locale — activée en dev uniquement ; jamais en déploiement production. */
export function isLocalAuthEnabled(): boolean {
  if (process.env.LOCAL_AUTH_ENABLED === 'false') return false;
  if (isProductionDeploy()) return false;
  if (
    process.env.USE_PRODUCTION_DB === 'true' ||
    process.env.HOSTINGER === 'true' ||
    Boolean(process.env.HOSTINGER_SITE_URL?.trim())
  ) {
    return false;
  }
  if (process.env.LOCAL_AUTH_ENABLED === 'true') return true;
  return isLocalAppEnv();
}

/**
 * Identifiants locaux — password OBLIGATOIRE via LOCAL_ADMIN_PASSWORD (min. 8).
 * Aucun fallback ADM01 / mot de passe par défaut.
 */
export function getLocalAdminCredentials(): { login: string; password: string } | null {
  const login = (process.env.LOCAL_ADMIN_LOGIN || '').trim().toUpperCase();
  const password = (process.env.LOCAL_ADMIN_PASSWORD || '').trim();
  if (!login || password.length < 8) return null;
  return { login, password };
}

export function normalizeLoginIdentifier(raw: string): string {
  const id = raw.trim();
  return id.includes('@') ? id.toLowerCase() : id.toUpperCase();
}

/** Lit identifiant + mot de passe depuis le body API (plusieurs clés supportées). */
export function parseLoginCredentials(body: unknown): { identifier: string; password: string } {
  if (!body || typeof body !== 'object') {
    return { identifier: '', password: '' };
  }
  const b = body as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const v = b[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  };
  return {
    identifier: pick('identifier', 'login', 'matricule', 'email'),
    password: pick('password', 'motDePasse', 'mot_de_passe'),
  };
}

/**
 * Connexion admin locale sans Prisma / Hostinger.
 * Fail-closed : pas de credentials env → null.
 */
export function matchLocalAdminAuth(identifier: string, password?: string): LocalAdminUser | null {
  if (!isLocalAuthEnabled()) return null;
  if (!identifier.trim()) return null;

  const creds = getLocalAdminCredentials();
  if (!creds) return null;

  const normalized = normalizeLoginIdentifier(identifier);
  if (normalized !== creds.login) return null;

  // Mot de passe obligatoire — plus de « porte ouverte » sans password.
  if (password == null || password === '' || password !== creds.password) return null;

  const email = (process.env.DEMO_ADMIN_EMAIL || process.env.LOCAL_ADMIN_EMAIL || '').trim().toLowerCase();

  return {
    id: 'local-admin',
    email: email || `${creds.login.toLowerCase()}@local.orion`,
    name: process.env.LOCAL_ADMIN_NAME?.trim() || 'Admin Local',
    role: 'admin',
    matricule: creds.login,
  };
}

export function localAuthSuccessPayload(user: LocalAdminUser, extra?: Record<string, unknown>) {
  return {
    allowed: true,
    success: true,
    local: true,
    user,
    remaining: 999,
    limit: 999,
    ...extra,
  };
}

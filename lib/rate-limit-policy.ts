/**
 * Politiques rate-limit — clés, fenêtres, limites, criticité.
 * Mémoire = local/dev uniquement ; prod multi-instance → Redis/Upstash.
 */

export type RateLimitPolicyId =
  | 'auth_callback'
  | 'auth_sensitive'
  | 'signup'
  | 'forgot_password'
  | 'reset_password'
  | 'upload'
  | 'payment_create'
  | 'pricing_publish'
  | 'cron'
  | 'bat_link'
  | 'expensive'
  | 'public_info'
  | 'setup_db';

export type RateLimitPolicy = {
  id: RateLimitPolicyId;
  /** Préfixe de clé (IP / user ajoutés par l’appelant) */
  keyPrefix: string;
  limit: number;
  windowMs: number;
  /** Si true : sans store distribué en prod → 429 fail-closed */
  critical: boolean;
};

export const RATE_LIMIT_POLICIES: Record<RateLimitPolicyId, RateLimitPolicy> = {
  auth_callback: {
    id: 'auth_callback',
    keyPrefix: 'auth',
    limit: 20,
    windowMs: 60_000,
    critical: true,
  },
  auth_sensitive: {
    id: 'auth_sensitive',
    keyPrefix: 'auth-sensitive',
    limit: 30,
    windowMs: 60_000,
    critical: true,
  },
  signup: {
    id: 'signup',
    keyPrefix: 'signup',
    limit: 5,
    windowMs: 60_000,
    critical: true,
  },
  forgot_password: {
    id: 'forgot_password',
    keyPrefix: 'forgot',
    limit: 5,
    windowMs: 60_000,
    critical: true,
  },
  reset_password: {
    id: 'reset_password',
    keyPrefix: 'reset',
    limit: 10,
    windowMs: 60_000,
    critical: true,
  },
  upload: {
    id: 'upload',
    keyPrefix: 'upload',
    limit: 30,
    windowMs: 60_000,
    critical: true,
  },
  payment_create: {
    id: 'payment_create',
    keyPrefix: 'payment',
    limit: 40,
    windowMs: 60_000,
    critical: true,
  },
  pricing_publish: {
    id: 'pricing_publish',
    keyPrefix: 'pricing-publish',
    limit: 10,
    windowMs: 60_000,
    critical: true,
  },
  cron: {
    id: 'cron',
    keyPrefix: 'cron',
    limit: 10,
    windowMs: 60_000,
    critical: true,
  },
  bat_link: {
    id: 'bat_link',
    keyPrefix: 'bat-client',
    limit: 10,
    windowMs: 60_000,
    critical: true,
  },
  expensive: {
    id: 'expensive',
    keyPrefix: 'expensive',
    limit: 20,
    windowMs: 60_000,
    critical: false,
  },
  public_info: {
    id: 'public_info',
    keyPrefix: 'public-info',
    limit: 60,
    windowMs: 60_000,
    critical: false,
  },
  setup_db: {
    id: 'setup_db',
    keyPrefix: 'setup-db',
    limit: 3,
    windowMs: 60_000,
    critical: true,
  },
};

export function isRateLimitCriticalKey(key: string): boolean {
  return Object.values(RATE_LIMIT_POLICIES).some(
    (p) => p.critical && (key === p.keyPrefix || key.startsWith(`${p.keyPrefix}:`)),
  );
}

/** Environnement où le store distribué est requis pour les clés critiques. */
export function requiresDistributedRateLimitStore(): boolean {
  if (process.env.ALLOW_MEMORY_RATE_LIMIT === 'true') return false;
  if (process.env.RATE_LIMIT_REQUIRE_DISTRIBUTED === 'true') return true;
  if (process.env.VERCEL === '1') return true;
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') return true;
  if (process.env.HOSTINGER === 'true') return true;
  const app = (process.env.APP_ENV || '').toLowerCase();
  if (app === 'production' || app === 'prod' || app === 'staging') return true;
  if (process.env.NODE_ENV === 'production' && process.env.APP_ENV !== 'local') return true;
  return false;
}

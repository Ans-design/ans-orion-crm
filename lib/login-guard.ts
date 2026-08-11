import { peekRateLimit, recordRateLimitHit, resetRateLimit } from '@/lib/rate-limit';

/** Sandbox Vercel sans Neon — test multi-comptes (17 logins). */
function isVercelDemoSandbox(): boolean {
  return Boolean(process.env.VERCEL) && process.env.USE_PRODUCTION_DB !== 'true';
}

function loginLimits(): { limit: number; windowMs: number } {
  // Démo en ligne : beaucoup d’essais (tous les profils) sans verrou 15 min
  if (isVercelDemoSandbox() || process.env.RELAX_LOGIN_LOCK === 'true') {
    return { limit: 200, windowMs: 60_000 };
  }
  return { limit: 5, windowMs: 15 * 60_000 };
}

function loginKey(ip: string, identifier?: string) {
  const id = (identifier ?? '').trim().toLowerCase().slice(0, 120);
  return `login-guard:${ip}:${id || 'anon'}`;
}

export function checkLoginAllowed(ip: string, identifier?: string) {
  if (isVercelDemoSandbox() || process.env.DISABLE_LOGIN_LOCK === 'true') {
    const { limit } = loginLimits();
    return { ok: true as const, remaining: limit, limit, retryAfterSec: undefined };
  }
  const { limit, windowMs } = loginLimits();
  const key = loginKey(ip, identifier);
  const status = peekRateLimit(key, limit, windowMs);
  return { ...status, limit };
}

export function recordLoginFailure(ip: string, identifier?: string) {
  if (isVercelDemoSandbox() || process.env.DISABLE_LOGIN_LOCK === 'true') {
    return { ok: true as const, attempts: 0, retryAfterSec: undefined };
  }
  const { limit, windowMs } = loginLimits();
  const key = loginKey(ip, identifier);
  return recordRateLimitHit(key, limit, windowMs);
}

export function clearLoginFailures(ip: string, identifier?: string) {
  resetRateLimit(loginKey(ip, identifier));
}

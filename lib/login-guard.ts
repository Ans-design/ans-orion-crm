import { peekRateLimit, recordRateLimitHit, resetRateLimit } from '@/lib/rate-limit';

const LOGIN_FAIL_LIMIT = 5;
const LOGIN_LOCK_MS = 15 * 60_000;

function loginKey(ip: string, identifier?: string) {
  const id = (identifier ?? '').trim().toLowerCase().slice(0, 120);
  return `login-guard:${ip}:${id || 'anon'}`;
}

export function checkLoginAllowed(ip: string, identifier?: string) {
  const key = loginKey(ip, identifier);
  const status = peekRateLimit(key, LOGIN_FAIL_LIMIT, LOGIN_LOCK_MS);
  return { ...status, limit: LOGIN_FAIL_LIMIT };
}

export function recordLoginFailure(ip: string, identifier?: string) {
  const key = loginKey(ip, identifier);
  return recordRateLimitHit(key, LOGIN_FAIL_LIMIT, LOGIN_LOCK_MS);
}

export function clearLoginFailures(ip: string, identifier?: string) {
  resetRateLimit(loginKey(ip, identifier));
}

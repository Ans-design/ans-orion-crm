/**
 * Rate limit — adaptateur mémoire (local) + Upstash Redis (prod multi-instance).
 *
 * Politique indisponibilité :
 * - clés critiques + store distribué requis → fail-closed (429)
 * - clés non critiques → mémoire locale si Upstash absent
 * - local (APP_ENV=local) → mémoire explicite OK
 *
 * Réponse HTTP : 429 + Retry-After ; journalisation sans PII (préfixe clé seulement).
 */
import { checkRateLimitUpstash } from '@/lib/rate-limit-upstash';
import {
  RATE_LIMIT_POLICIES,
  isRateLimitCriticalKey,
  requiresDistributedRateLimitStore,
  type RateLimitPolicyId,
} from '@/lib/rate-limit-policy';

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec?: number;
  remaining?: number;
  backend: 'upstash' | 'memory' | 'fail-closed';
};

const hits = new Map<string, { count: number; resetAt: number }>();
const MAX_ENTRIES = 10_000;

function pruneExpired(now: number) {
  if (hits.size < MAX_ENTRIES) return;
  for (const [k, v] of hits) {
    if (now > v.resetAt) hits.delete(k);
    if (hits.size < MAX_ENTRIES * 0.8) break;
  }
}

export function checkRateLimit(key: string, limit = 10, windowMs = 60_000): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  pruneExpired(now);
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true };
}

/** Rate limit avec Upstash Redis si configuré, sinon mémoire / fail-closed. */
export async function checkRateLimitAsync(
  key: string,
  limit = 10,
  windowMs = 60_000,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const full = await enforceRateLimit(key, limit, windowMs);
  return { ok: full.ok, retryAfterSec: full.retryAfterSec };
}

export async function enforceRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  const distributed = await checkRateLimitUpstash(key, limit, windowMs);
  if (distributed) {
    return { ...distributed, backend: 'upstash' };
  }

  const critical = isRateLimitCriticalKey(key);
  if (
    requiresDistributedRateLimitStore() &&
    critical &&
    process.env.ALLOW_MEMORY_RATE_LIMIT !== 'true'
  ) {
    console.error('[rate-limit] store distribué absent — refus fail-closed', key.split(':')[0]);
    return { ok: false, retryAfterSec: 60, backend: 'fail-closed' };
  }

  const mem = checkRateLimit(key, limit, windowMs);
  return { ...mem, backend: 'memory' };
}

/** Applique une politique nommée (préfixe + identité). */
export async function enforcePolicy(
  policyId: RateLimitPolicyId,
  identity: string,
): Promise<RateLimitResult> {
  const p = RATE_LIMIT_POLICIES[policyId];
  const key = `${p.keyPrefix}:${identity}`;
  return enforceRateLimit(key, p.limit, p.windowMs);
}

export function rateLimitResponseHeaders(result: RateLimitResult): Record<string, string> {
  const h: Record<string, string> = {};
  if (result.retryAfterSec != null) h['Retry-After'] = String(result.retryAfterSec);
  if (result.remaining != null) h['X-RateLimit-Remaining'] = String(result.remaining);
  return h;
}

/** Lecture sans incrément — pour vérifier un verrou avant action */
export function peekRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): { ok: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    return { ok: true, remaining: limit };
  }
  if (entry.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { ok: true, remaining: limit - entry.count };
}

/** Incrémente le compteur d'échecs (verrou après `limit` hits dans la fenêtre) */
export function recordRateLimitHit(
  key: string,
  limit: number,
  windowMs = 60_000,
): { ok: boolean; retryAfterSec?: number; attempts: number } {
  const now = Date.now();
  pruneExpired(now);
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, attempts: 1 };
  }
  entry.count += 1;
  if (entry.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
      attempts: entry.count,
    };
  }
  return { ok: true, attempts: entry.count };
}

export function resetRateLimit(key: string) {
  hits.delete(key);
}

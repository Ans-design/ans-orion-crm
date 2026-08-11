/**
 * Cache runtime tarifs publiés — invalidé à chaque publication Admin.
 * Empêche un POS ouvert de conserver indéfiniment un ancien tarif en mémoire process.
 */

type CacheEntry<T> = { value: T; at: number; releaseId: string | null };

const store = new Map<string, CacheEntry<unknown>>();
let generation = 0;
let activeReleaseId: string | null = null;

export function getPricingCacheGeneration(): number {
  return generation;
}

export function setPricingCacheReleaseId(id: string | null) {
  activeReleaseId = id;
}

export function getPricingCacheReleaseId(): string | null {
  return activeReleaseId;
}

/** Invalide tout le cache tarifaire process (après publish / unpublish). */
export function invalidatePricingRuntimeCache(reason?: string): void {
  generation += 1;
  store.clear();
  if (process.env.NODE_ENV !== 'production' || process.env.APP_ENV === 'local') {
    console.info(`[pricing-cache] invalidated gen=${generation}${reason ? ` (${reason})` : ''}`);
  }
}

export function pricingCacheGet<T>(key: string): T | undefined {
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (!hit) return undefined;
  if (hit.releaseId !== activeReleaseId) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

export function pricingCacheSet<T>(key: string, value: T, ttlMs = 60_000): void {
  store.set(key, { value, at: Date.now() + ttlMs, releaseId: activeReleaseId });
}

export function pricingCacheKey(parts: Array<string | number | null | undefined>): string {
  return parts.map((p) => String(p ?? '')).join('|');
}

'use client';

import { useEffect, useState } from 'react';
import { unwrapApiData } from '@/lib/api-client';
import type { ModuleAccessMap } from '@/lib/modules';

const CACHE_TTL_MS = 5 * 60_000;
const memoryCache = new Map<string, { at: number; data: ModuleAccessMap }>();
/** Une seule requête réseau même si sidebar + bottom nav + rail montent ensemble. */
const inflightByRole = new Map<string, Promise<ModuleAccessMap | null>>();

function readSessionCache(cacheKey: string): ModuleAccessMap | null {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: ModuleAccessMap };
    if (Date.now() - parsed.at >= CACHE_TTL_MS) return null;
    memoryCache.set(cacheKey, parsed);
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCaches(cacheKey: string, data: ModuleAccessMap) {
  const entry = { at: Date.now(), data };
  memoryCache.set(cacheKey, entry);
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

function fetchModuleAccessOnce(role: string, cacheKey: string): Promise<ModuleAccessMap | null> {
  const existing = inflightByRole.get(cacheKey);
  if (existing) return existing;

  const promise = fetch('/api/admin/permissions?effective=1', {
    credentials: 'include',
    cache: 'no-store',
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      if (!body) return null;
      const payload = unwrapApiData<{ moduleAccess?: ModuleAccessMap }>(body);
      const next = payload?.moduleAccess ?? null;
      if (next) writeCaches(cacheKey, next);
      return next;
    })
    .catch(() => null)
    .finally(() => {
      inflightByRole.delete(cacheKey);
    });

  inflightByRole.set(cacheKey, promise);
  return promise;
}

/**
 * Permissions modules effectives — cache mémoire + sessionStorage + dedupe fetch.
 * Évite le triple fetch sidebar + bottom nav + rail tablette.
 */
export function useEffectiveModuleAccess(role: string | undefined | null) {
  const [moduleAccess, setModuleAccess] = useState<ModuleAccessMap | undefined>(() => {
    if (!role || typeof window === 'undefined') return undefined;
    const cacheKey = `orion-module-access:${role}`;
    const fromMemory = memoryCache.get(cacheKey);
    if (fromMemory && Date.now() - fromMemory.at < CACHE_TTL_MS) return fromMemory.data;
    return readSessionCache(cacheKey) ?? undefined;
  });

  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    const cacheKey = `orion-module-access:${role}`;

    const fromMemory = memoryCache.get(cacheKey);
    if (fromMemory && Date.now() - fromMemory.at < CACHE_TTL_MS) {
      setModuleAccess(fromMemory.data);
      return;
    }

    const fromSession = readSessionCache(cacheKey);
    if (fromSession) {
      setModuleAccess(fromSession);
      return;
    }

    void fetchModuleAccessOnce(role, cacheKey).then((next) => {
      if (!cancelled && next) setModuleAccess(next);
    });

    return () => {
      cancelled = true;
    };
  }, [role]);

  return moduleAccess;
}

/**
 * Révisions live serveur — multi-postes (polling) en complément BroadcastChannel.
 * Process-local : adapté au démarrage Node unique (dev / Hostinger single instance).
 */

import type { OrionLiveDomain } from '@/lib/live/orion-live';

const revisions = new Map<string, number>();
let globalSeq = 0;

export function bumpLiveRevisions(domains: readonly string[]): number {
  const unique = [...new Set(domains.map((d) => d.trim()).filter(Boolean))];
  if (!unique.length) return globalSeq;
  globalSeq += 1;
  for (const d of unique) {
    revisions.set(d, globalSeq);
    if (d !== '*') revisions.set('*', globalSeq);
  }
  return globalSeq;
}

export function getLiveRevision(domain: string): number {
  return revisions.get(domain) ?? 0;
}

export function getLiveRevisionsSnapshot(domains: readonly string[]): {
  global: number;
  revisions: Record<string, number>;
  max: number;
} {
  const out: Record<string, number> = {};
  let max = 0;
  for (const d of domains) {
    const key = d.trim();
    if (!key) continue;
    const v = getLiveRevision(key);
    out[key] = v;
    if (v > max) max = v;
  }
  return { global: globalSeq, revisions: out, max };
}

export function domainsForBump(domains: readonly string[]): OrionLiveDomain[] {
  return domains.filter(Boolean) as OrionLiveDomain[];
}

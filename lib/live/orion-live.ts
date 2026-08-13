/**
 * Bus live ORION — mises à jour sans F5 après mutation.
 * - CustomEvent même onglet
 * - BroadcastChannel multi-onglets
 * - domaines métier pour abonnements ciblés
 * - en-tête serveur `x-orion-live-domains` lu par liveFetch
 */

import { ORION_LIVE_HEADER, parseLiveDomainsHeader } from '@/lib/live/live-response';

export type OrionLiveDomain =
  | 'commandes'
  | 'devis'
  | 'clients'
  | 'stock'
  | 'factures'
  | 'paiements'
  | 'livraisons'
  | 'production'
  | 'bat'
  | 'sync'
  | 'pricing'
  | 'catalogue'
  | 'nav'
  | 'reclamations'
  | 'rh'
  | 'machines'
  | 'achats'
  | 'caisse'
  | '*';

export type OrionLiveDetail = {
  domain: OrionLiveDomain;
  entityId?: string;
  source?: string;
  at: number;
};

export const ORION_LIVE_EVENT = 'orion:live';
export const ORION_LIVE_CHANNEL = 'orion-live-v1';

const BADGE_DOMAINS: OrionLiveDomain[] = [
  'commandes',
  'devis',
  'factures',
  'paiements',
  'livraisons',
  'production',
  'stock',
  'bat',
  'pricing',
  'catalogue',
  'reclamations',
  'rh',
  'machines',
  'achats',
  'caisse',
  'nav',
  '*',
];

let channel: BroadcastChannel | null = null;
let lastBumpKey = '';
let lastBumpAt = 0;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(ORION_LIVE_CHANNEL);
    } catch {
      channel = null;
    }
  }
  return channel;
}

/** Signale les autres postes via révision serveur (polling). */
function bumpServerLive(domains: readonly OrionLiveDomain[]): void {
  if (typeof window === 'undefined' || !domains.length) return;
  const key = [...domains].sort().join('|');
  const now = Date.now();
  if (key === lastBumpKey && now - lastBumpAt < 400) return;
  lastBumpKey = key;
  lastBumpAt = now;
  void fetch('/api/live/bump', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domains }),
    keepalive: true,
  }).catch(() => {
    /* ignore */
  });
}

export function emitOrionLive(
  domain: OrionLiveDomain,
  opts?: { entityId?: string; source?: string; skipNav?: boolean },
): void {
  if (typeof window === 'undefined') return;
  const detail: OrionLiveDetail = {
    domain,
    entityId: opts?.entityId,
    source: opts?.source,
    at: Date.now(),
  };
  window.dispatchEvent(new CustomEvent(ORION_LIVE_EVENT, { detail }));
  try {
    getChannel()?.postMessage(detail);
  } catch {
    /* ignore */
  }
  bumpServerLive([domain]);
  if (!opts?.skipNav && BADGE_DOMAINS.includes(domain)) {
    window.dispatchEvent(new Event('orion:nav-badges-refresh'));
  }
}

/** Anti double-emit (liveFetch + fetch bridge dans le même tick). */
let lastLiveManyKey = '';
let lastLiveManyAt = 0;

/** Émet plusieurs domaines (ex. pricing + catalogue + sync). */
export function emitOrionLiveMany(
  domains: readonly OrionLiveDomain[],
  opts?: { entityId?: string; source?: string; skipNav?: boolean },
): void {
  const unique = [...new Set(domains)].filter(Boolean) as OrionLiveDomain[];
  if (!unique.length) return;
  const key = unique.slice().sort().join('|');
  const now = Date.now();
  if (key === lastLiveManyKey && now - lastLiveManyAt < 120) return;
  lastLiveManyKey = key;
  lastLiveManyAt = now;

  unique.forEach((d) => {
    emitOrionLive(d, {
      entityId: opts?.entityId,
      source: opts?.source,
      skipNav: true,
    });
  });
  bumpServerLive(unique);
  if (!opts?.skipNav && unique.some((d) => BADGE_DOMAINS.includes(d))) {
    window.dispatchEvent(new Event('orion:nav-badges-refresh'));
  }
}

/**
 * Domaines inférés depuis une URL API (peut en retourner plusieurs).
 * Toute mutation Administration → commercial / stock / sync immédiat via le bridge fetch.
 */
export function inferLiveDomainsFromUrl(url: string): OrionLiveDomain[] {
  const path = (url.split('?')[0] || '').toLowerCase();

  // —— Administration (Backoffice) : source de vérité → modules opérationnels ——
  if (
    path.includes('/api/admin-backoffice/')
    || path.includes('/api/administration/')
    || path.includes('/api/admin-config/')
    || path.includes('/api/admin/catalogue')
    || path.includes('/api/admin/pricing')
    || path.includes('/api/backoffice/')
  ) {
    // Production / flux → production + sync
    if (
      path.includes('/production-flux')
      || path.includes('/estimation-temps')
      || path.includes('/gpao')
    ) {
      return ['production', 'sync', 'commandes', 'pricing'];
    }
    // Stock / matières
    if (
      path.includes('/materials')
      || path.includes('/matieres')
      || path.includes('/stock')
      || path.includes('/base-materials')
      || path.includes('/prix-matieres')
    ) {
      return ['stock', 'catalogue', 'pricing', 'sync'];
    }
    // Défaut Admin : prix + catalogue + sync (POS, devis, commandes)
    return ['pricing', 'catalogue', 'sync'];
  }

  // Estimations / lectures POS — NE PAS émettre (évite boucle simulate → live → simulate)
  if (
    path.includes('/api/pricing/simulate')
    || path.includes('/api/pricing/calculate')
    || path.includes('/api/pricing/estimate')
  ) {
    return [];
  }

  if (
    path.includes('/api/dynamic-pricing')
    || path.includes('/api/pricing/')
    || path.includes('/pricing/publish')
    || path.includes('/pricing/sync')
    || path.includes('sync-pos')
    || path.includes('/base-prix-matieres')
    || path.includes('/prix-matieres')
  ) {
    return ['pricing', 'catalogue', 'sync'];
  }

  if (
    path.includes('/api/admin-backoffice/sync')
    || path.includes('/admin-backoffice/sync-all')
    || path.includes('/api/backoffice/sync')
    || (path.includes('/sync') && path.includes('/api/') && !path.includes('/api/messaging'))
  ) {
    return ['sync', 'pricing', 'catalogue'];
  }

  if (path.includes('/api/admin-config/publish') || path.includes('/api/admin/catalogue')) {
    return ['catalogue', 'pricing', 'sync'];
  }

  if (path.includes('/api/stock')) return ['stock', 'catalogue', 'pricing'];
  if (path.includes('/api/commandes')) return ['commandes'];
  if (path.includes('/api/devis')) return ['devis'];
  if (path.includes('/api/clients')) return ['clients'];
  if (path.includes('/api/factures')) return ['factures'];
  if (path.includes('/api/paiements') || path.includes('/api/encaissement')) {
    return ['paiements', 'factures', 'commandes', 'caisse'];
  }
  if (path.includes('/api/caisse') || path.includes('/api/register')) return ['caisse', 'paiements'];
  if (path.includes('/api/livraisons')) return ['livraisons', 'commandes'];
  if (path.includes('/api/production') || path.includes('/api/gpao') || path.includes('/api/planning')) {
    return ['production', 'commandes'];
  }
  if (path.includes('/api/bat') || path.includes('/api/proof')) return ['bat', 'commandes', 'production'];
  if (path.includes('/api/reclamations')) return ['reclamations', 'clients', 'rh'];
  if (path.includes('/api/machines') || path.includes('/api/maintenance')) return ['machines', 'production'];
  if (path.includes('/api/achats') || path.includes('/api/purchase') || path.includes('/api/suppliers')) {
    return ['achats', 'stock'];
  }
  if (path.includes('/api/equipe/taches')) return ['commandes', 'production', 'rh', 'nav'];
  if (path.includes('/api/rh') || path.includes('/api/employees') || path.includes('/api/equipe/employes')) {
    return ['rh'];
  }
  if (path.includes('/api/messaging')) return ['nav'];
  if (path.includes('/api/pos/catalogue') || path.includes('/api/pos/')) return ['catalogue', 'pricing'];
  return [];
}

/** @deprecated préférer inferLiveDomainsFromUrl — conservé pour compat. */
export function inferLiveDomainFromUrl(url: string): OrionLiveDomain | null {
  return inferLiveDomainsFromUrl(url)[0] ?? null;
}

/**
 * fetch métier : GET inchangé ; POST/PUT/PATCH/DELETE 2xx → emit live auto.
 * L’emit est délégué au bridge window.fetch (évite double-fire).
 * Si le bridge n’est pas monté, emit local via en-tête / URL.
 */
export async function liveFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  if (!res.ok) return res;
  const method = (init?.method ?? (typeof input !== 'string' && 'method' in input ? input.method : 'GET') ?? 'GET')
    .toString()
    .toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return res;

  // Bridge app-shell déjà en place → emit unique depuis le patch
  if (typeof window !== 'undefined' && (window as Window & { __orionLiveFetchPatched?: boolean }).__orionLiveFetchPatched) {
    return res;
  }

  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const fromHeader = parseLiveDomainsHeader(res.headers.get(ORION_LIVE_HEADER)) as OrionLiveDomain[];
  const domains = fromHeader.length ? fromHeader : inferLiveDomainsFromUrl(url);
  if (domains.length) {
    emitOrionLiveMany(domains as OrionLiveDomain[], { source: 'liveFetch' });
  }
  return res;
}

export function domainsMatch(subscribed: OrionLiveDomain[], incoming: OrionLiveDomain): boolean {
  if (subscribed.includes('*') || incoming === '*') return true;
  return subscribed.includes(incoming);
}

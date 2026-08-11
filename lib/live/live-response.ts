/**
 * En-tête API pour pousser les domaines live au client (liveFetch / bridge).
 */

import { NextResponse } from 'next/server';
import { bumpLiveRevisions } from '@/lib/server/live/live-revision-bus';

export const ORION_LIVE_HEADER = 'x-orion-live-domains';

const ALLOWED_LIVE_DOMAINS = new Set([
  'commandes',
  'devis',
  'clients',
  'stock',
  'factures',
  'paiements',
  'livraisons',
  'production',
  'bat',
  'sync',
  'pricing',
  'catalogue',
  'nav',
  'reclamations',
  'rh',
  'machines',
  'achats',
  'caisse',
  '*',
]);

export function setLiveDomainsOnHeaders(
  headers: Headers,
  domains: readonly string[],
): Headers {
  const unique = [
    ...new Set(
      domains
        .map((d) => d.trim())
        .filter((d) => d && ALLOWED_LIVE_DOMAINS.has(d)),
    ),
  ];
  if (unique.length) {
    headers.set(ORION_LIVE_HEADER, unique.join(','));
    bumpLiveRevisions(unique);
  }
  return headers;
}

export function jsonWithLiveDomains<T>(
  body: T,
  domains: readonly string[],
  init?: ResponseInit,
): NextResponse {
  const headers = new Headers(init?.headers);
  setLiveDomainsOnHeaders(headers, domains);
  return NextResponse.json(body, { ...init, headers });
}

/** Ajoute l’en-tête live sur une Response déjà construite (ok/created). */
export function attachLiveDomains(
  res: NextResponse,
  domains: readonly string[],
): NextResponse {
  setLiveDomainsOnHeaders(res.headers, domains);
  return res;
}

export function parseLiveDomainsHeader(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((d) => d && ALLOWED_LIVE_DOMAINS.has(d));
}

'use client';

/**
 * Intercepte les mutations fetch (POST/PUT/PATCH/DELETE) pour émettre le bus live ORION.
 * Garantit Admin → Commercial / Stock multi-onglets sans réécrire chaque écran.
 */

import { useEffect } from 'react';
import {
  emitOrionLiveMany,
  inferLiveDomainsFromUrl,
  type OrionLiveDomain,
} from '@/lib/live/orion-live';
import { ORION_LIVE_HEADER, parseLiveDomainsHeader } from '@/lib/live/live-response';

const MUTATE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function OrionLiveFetchBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as Window & { __orionLiveFetchPatched?: boolean };
    if (w.__orionLiveFetchPatched) return;
    w.__orionLiveFetchPatched = true;

    const original = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await original(input, init);
      try {
        const method = (
          init?.method
          ?? (typeof input !== 'string' && input instanceof Request ? input.method : 'GET')
          ?? 'GET'
        )
          .toString()
          .toUpperCase();
        if (!MUTATE.has(method) || !res.ok) return res;

        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        // Uniquement API app (évite analytics tiers)
        if (!url.includes('/api/')) return res;

        const fromHeader = parseLiveDomainsHeader(res.headers.get(ORION_LIVE_HEADER)) as OrionLiveDomain[];
        const domains = fromHeader.length
          ? fromHeader
          : (inferLiveDomainsFromUrl(url) as OrionLiveDomain[]);
        if (domains.length) {
          emitOrionLiveMany(domains, { source: 'fetch-bridge' });
        }
      } catch {
        /* ignore bridge errors */
      }
      return res;
    };

    return () => {
      window.fetch = original;
      w.__orionLiveFetchPatched = false;
    };
  }, []);

  return null;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

export type ClientSearchResult = {
  id: string;
  code: string;
  name: string;
  tel: string | null;
  email: string | null;
  nif: string | null;
  commercialName: string | null;
  adressePrincipale: string | null;
  axeLivraison: string | null;
  clientFidele: boolean;
  nombreCommandes: number;
  totalInvesti: number;
};

export function useClientSearch(debounceMs = 300) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(`/api/clients/search?q=${encodeURIComponent(trimmed)}`, {
        timeout: 10_000,
      });
      if (!res.ok) {
        setError('Impossible de charger les clients. Réessayez.');
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(Array.isArray(data.clients) ? data.clients : []);
    } catch {
      setError('Impossible de charger les clients. Réessayez.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      search(query);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs, search]);

  const retry = useCallback(() => search(query), [query, search]);

  return { query, setQuery, results, loading, error, retry };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORIES, CAT_LABELS } from '@/lib/data/catalogue';
import type { CatalogueItem } from '@/lib/data/catalogue';
import { classifyFetchError } from '@/lib/ux/messages';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';

type PosCatalogueResponse = {
  items?: CatalogueItem[];
  categories?: typeof CATEGORIES;
  catLabels?: Record<string, string>;
  source?: 'database' | 'catalogue-fallback' | 'database-primary' | 'database-full';
  coverage?: { coveragePercent?: number; mode?: string };
  error?: string;
};

/**
 * Catalogue POS — DB + refresh live (sans flash loader si déjà chargé).
 */
export function usePosCatalogue() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [catLabels, setCatLabels] = useState(CAT_LABELS);
  const [source, setSource] = useState<'api' | 'database-primary' | 'database-full' | 'none'>('none');
  const [coveragePercent, setCoveragePercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const lastGoodItems = useRef<CatalogueItem[]>([]);
  const [fetchKey, setFetchKey] = useState(0);

  const lastFetchedAt = useRef(0);
  const liveTick = useOrionLiveRevision(['pricing', 'catalogue', 'stock', 'sync'], {
    debounceMs: 400,
    focusMinMs: 20_000,
  });

  const refresh = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (liveTick === 0) return;
    refresh();
  }, [liveTick, refresh]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      const age = Date.now() - lastFetchedAt.current;
      if (lastFetchedAt.current > 0 && age < 45_000) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refresh(), 300);
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') schedule();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (timer) clearTimeout(timer);
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const soft = lastGoodItems.current.length > 0;
    if (!soft) setLoading(true);
    setApiError(null);
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;

    fetch(`/api/pos/catalogue?_=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store',
      signal: ac?.signal,
    })
      .then(async (r) => {
        if (cancelled) return;

        if (!r.ok) {
          const msg = classifyFetchError(r, 'Impossible de charger le catalogue POS.');
          setApiError(msg);
          setItems(lastGoodItems.current);
          return;
        }

        const data: PosCatalogueResponse = await r.json().catch(() => ({}));
        if (!data.items?.length) {
          setApiError(
            data.error
            || 'Catalogue vide — publiez les articles dans Administration → Catalogue & POS.',
          );
          setItems([]);
          setSource('none');
          setCoveragePercent(data.coverage?.coveragePercent ?? null);
          return;
        }

        lastGoodItems.current = data.items;
        lastFetchedAt.current = Date.now();
        setItems(data.items);
        if (data.categories?.length) setCategories(data.categories);
        if (data.catLabels) setCatLabels(data.catLabels);
        setSource(
          data.source === 'database-full' || data.source === 'database-primary'
            ? data.source
            : 'api',
        );
        setCoveragePercent(data.coverage?.coveragePercent ?? null);
        setApiError(null);
      })
      .catch((e) => {
        if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) return;
        setApiError(classifyFetchError(e, 'Erreur réseau — vérifiez la connexion et réessayez.'));
        setItems(lastGoodItems.current);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      ac?.abort();
    };
  }, [fetchKey]);

  return { items, categories, catLabels, source, coveragePercent, loading, apiError, refresh };
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { classifyFetchError } from '@/lib/ux/messages';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';

export type PosServerPrice = {
  prixUnitaire: number;
  sousTotal: number;
  remiseRate: number;
  remiseAmount: number;
  totalHT: number;
  clicheFee: number;
  qty: number;
  surDevis?: boolean;
  snapshot?: Record<string, unknown>;
  formulaApplied?: string;
  margin?: {
    unitCostEst: number;
    marginAmount: number;
    marginRatePct: number;
    costSource: string | null;
  };
};

export type PosServerPriceState = {
  price: PosServerPrice | null;
  loading: boolean;
  error: string | null;
};

type Params = {
  articleId: string | null | undefined;
  config: Record<string, unknown>;
  textileQty: number;
  /**
   * Historiquement : config 100 % prête.
   * Désormais : true dès qu’on peut estimer (qty > 0) — le panier reste bloqué par isReady.
   */
  isReady: boolean;
  debounceMs?: number;
};

/** Charge le prix serveur unifié (/api/pricing/simulate?lite) pour le configurateur POS. */
export function usePosServerPrice({
  articleId,
  config,
  textileQty,
  isReady,
  debounceMs = 320,
}: Params): PosServerPriceState {
  const [price, setPrice] = useState<PosServerPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priceRef = useRef<PosServerPrice | null>(null);
  const articleRef = useRef<string | null>(null);

  // Admin publié / sync → recalcul à l’instant (configurateur ouvert)
  const liveTick = useOrionLiveRevision(['pricing', 'catalogue', 'sync'], {
    debounceMs: 180,
    onFocus: false,
  });

  const configKey = useMemo(() => {
    try {
      return JSON.stringify(config);
    } catch {
      return String(Date.now());
    }
  }, [config]);

  useEffect(() => {
    priceRef.current = price;
  }, [price]);

  useEffect(() => {
    if (!articleId) {
      setPrice(null);
      priceRef.current = null;
      articleRef.current = null;
      setLoading(false);
      setError(null);
      return;
    }
    let parsedConfig: Record<string, unknown> = config;
    try {
      parsedConfig = JSON.parse(configKey) as Record<string, unknown>;
    } catch {
      parsedConfig = config;
    }
    const rawQty = parsedConfig.quantite ?? parsedConfig.qty;
    const hasQty = rawQty !== '' && rawQty !== undefined && rawQty !== null && Number(rawQty) > 0;
    const canEstimate = isReady || hasQty || textileQty > 0;
    if (!canEstimate) {
      setPrice(null);
      priceRef.current = null;
      setLoading(false);
      setError(null);
      return;
    }
    const qty = textileQty > 0 ? textileQty : (Number(rawQty) || 1);
    let cancelled = false;
    const sameArticle = articleRef.current === articleId;
    const soft = sameArticle && priceRef.current != null;
    articleRef.current = articleId;

    // Soft = refresh silencieux (pas de loading → pas de « recalcul… » / opacity)
    if (!soft) {
      setLoading(true);
      setPrice(null);
      priceRef.current = null;
    }
    setError(null);

    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      fetch('/api/pricing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({ articleId, config: parsedConfig, qty, lite: true }),
      })
        .then(async (r) => {
          if (!r.ok) {
            const body = await r.json().catch(() => ({}));
            const msg = typeof body?.error === 'string'
              ? body.error
              : typeof body?.error?.message === 'string'
                ? body.error.message
                : classifyFetchError(r);
            throw new Error(msg);
          }
          return r.json() as Promise<PosServerPrice>;
        })
        .then((d) => {
          if (cancelled) return;
          const prev = priceRef.current;
          // Même montant → pas de setState (évite re-render / micro-clignotement)
          if (
            prev
            && prev.prixUnitaire === d.prixUnitaire
            && prev.sousTotal === d.sousTotal
            && prev.totalHT === d.totalHT
            && prev.qty === d.qty
            && prev.remiseRate === d.remiseRate
            && prev.remiseAmount === d.remiseAmount
            && Boolean(prev.surDevis) === Boolean(d.surDevis)
          ) {
            setError(null);
            return;
          }
          setPrice(d);
          priceRef.current = d;
          setError(null);
        })
        .catch((e: unknown) => {
          if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) return;
          // Soft : conserver le dernier prix plutôt que tout effacer
          if (!soft) {
            setPrice(null);
            priceRef.current = null;
          }
          setError(classifyFetchError(e));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, liveTick > 0 ? Math.min(debounceMs, 160) : debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable key + liveTick
  }, [articleId, configKey, textileQty, isReady, debounceMs, liveTick]);

  return { price, loading, error };
}

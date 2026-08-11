'use client';

import { useCallback, useRef, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';

type Options = {
  /** Message toast succès après actualisation */
  successMessage?: string;
  /** Afficher toast erreur automatiquement */
  toastOnError?: boolean;
};

/**
 * Recharge fiable depuis l’API — pattern Stock & Matières.
 * Pas de seed, pas de sync catalogue implicite.
 */
export function useAdminTableRefetch<T>(
  fetcher: () => Promise<T>,
  onData: (data: T) => void,
  opts?: Options,
) {
  const genRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(
    async (options?: { silent?: boolean }) => {
      const gen = ++genRef.current;
      setLoading(true);
      setError(null);
      try {
        const data = await fetcher();
        if (gen !== genRef.current) return data;
        onData(data);
        if (!options?.silent && opts?.successMessage) {
          uxToast.success(opts.successMessage);
        }
        return data;
      } catch (e) {
        if (gen !== genRef.current) throw e;
        const msg = e instanceof Error ? e.message : 'Chargement impossible';
        setError(msg);
        if (opts?.toastOnError !== false) {
          uxToast.error(msg, 'Actualisation impossible');
        }
        throw e;
      } finally {
        if (gen === genRef.current) setLoading(false);
      }
    },
    [fetcher, onData, opts?.successMessage, opts?.toastOnError],
  );

  return { refetch, loading, error, clearError: () => setError(null) };
}

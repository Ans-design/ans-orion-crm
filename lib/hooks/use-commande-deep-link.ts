'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { unwrapApiData } from '@/lib/api-client';

export type CommandeDeepLinkInfo = {
  id: string;
  numero: string;
  article: string;
} | null;

/** Lit ?commande= depuis l'URL et charge les métadonnées pour bannière / filtre. */
export function useCommandeDeepLink() {
  const searchParams = useSearchParams();
  const commandeId = searchParams.get('commande');
  const [info, setInfo] = useState<CommandeDeepLinkInfo>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!commandeId) {
      setInfo(null);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    fetch(`/api/commandes/${commandeId}/overview`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const d = body ? unwrapApiData<{ commande?: { numero: string; article: string } }>(body) : null;
        if (!d?.commande) {
          setInfo({ id: commandeId, numero: commandeId.slice(-8), article: 'Commande' });
          return;
        }
        setInfo({
          id: commandeId,
          numero: d.commande.numero,
          article: d.commande.article,
        });
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setInfo({ id: commandeId, numero: commandeId.slice(-8), article: 'Commande' });
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [commandeId]);

  return { commandeId, info, loading };
}

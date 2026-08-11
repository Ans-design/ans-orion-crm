'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Play, CheckCircle2, Truck, Package, RefreshCw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { readApiJson } from '@/lib/api-client';
import { statusBadgeClass } from '@/lib/ui/status-styles';
import { LoadingState } from '@/components/ui/loading-state';
import type { TourneeLivraisonEnriched } from '@/lib/logistics/tournee-types';

const STATUT_CLASS: Record<string, string> = {
  'Planifiée': statusBadgeClass('Préparation'),
  'En cours': statusBadgeClass('En livraison'),
  'Terminée': statusBadgeClass('Livré'),
};

type Props = {
  onRefresh?: () => void;
  compact?: boolean;
};

export function TourneePlanner({ onRefresh, compact }: Props) {
  const [tournees, setTournees] = useState<TourneeLivraisonEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logistics/tournees', { credentials: 'include' });
      const data = await readApiJson<{ tournees: TourneeLivraisonEnriched[] }>(res);
      setTournees(data.tournees ?? []);
    } catch {
      uxToast.error('Impossible de charger les tournées');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (id: string, action: 'start' | 'complete') => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/logistics/tournees/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) throw new Error('action failed');
      uxToast.success(action === 'start' ? 'Tournée démarrée — livraisons en route' : 'Tournée clôturée');
      await load();
      onRefresh?.();
    } catch {
      uxToast.error('Action tournée impossible');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Chargement des tournées…" size="sm" />;
  }

  if (tournees.length === 0) {
    return (
      <div className="tournee-empty" role="status">
        <span className="tournee-empty__icon" aria-hidden>
          <MapPin size={15} strokeWidth={2} />
        </span>
        <div>
          <p className="tournee-empty__title">Aucune tournée planifiée</p>
          <p className="tournee-empty__desc">
            Assignez un livreur sur les livraisons « Prêt » pour constituer la tournée du jour.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${compact ? '' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground m-0">
          Tournées ({tournees.length})
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[11px] font-semibold text-[var(--ans-cyan)] hover:underline inline-flex items-center gap-1"
        >
          <RefreshCw size={11} /> Actualiser
        </button>
      </div>
      {tournees.map((t) => (
        <div key={t.id} className="tournee-card">
          <div className="tournee-card__top">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold">{t.numero}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUT_CLASS[t.statut] ?? ''}`}>
                  {t.statut}
                </span>
              </div>
              <p className="text-sm font-medium mt-1 mb-0 flex items-center gap-1">
                <Truck size={14} className="text-[var(--ans-cyan)]" /> {t.livreur}
              </p>
              <p className="text-xs text-muted-foreground m-0">
                {t.stopsCount} arrêt(s) · {t.colisTotal} colis · {t.zone ?? 'Zone —'}
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {t.statut === 'Planifiée' && (
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => void runAction(t.id, 'start')}
                  className="px-2.5 py-1 rounded-[8px] bg-primary text-primary-foreground text-[11px] font-bold inline-flex items-center gap-1 border-0"
                >
                  <Play size={11} /> Démarrer
                </button>
              )}
              {t.statut === 'En cours' && (
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => void runAction(t.id, 'complete')}
                  className="px-2.5 py-1 rounded-[8px] bg-green-600 text-white text-[11px] font-bold inline-flex items-center gap-1 border-0"
                >
                  <CheckCircle2 size={11} /> Clôturer
                </button>
              )}
              <Link
                href={`/livraisons?livreur=${encodeURIComponent(t.livreur)}&mode=livreur`}
                className="px-2.5 py-1 rounded-[8px] text-[11px] font-semibold inline-flex items-center gap-1 bg-[color-mix(in_srgb,var(--bg-app,#f1f5f9)_70%,transparent)] hover:opacity-90"
              >
                Vue livreur
              </Link>
            </div>
          </div>
          {!compact && t.livraisons.length > 0 && (
            <ol className="tournee-stops">
              {t.livraisons.map((l, i) => (
                <li key={l.id}>
                  <span className="w-5 h-5 rounded-full bg-[color-mix(in_srgb,var(--bg-app,#e2e8f0)_80%,transparent)] text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/livraisons?id=${l.id}`}
                      className="font-mono text-xs text-[var(--ans-cyan)] hover:underline"
                    >
                      {l.numero}
                    </Link>
                    <p className="font-medium truncate m-0 text-xs">{l.clientName}</p>
                    {l.adresseLiv && (
                      <p className="text-[11px] text-muted-foreground flex items-start gap-1 mt-0.5 mb-0">
                        <MapPin size={11} className="shrink-0 mt-0.5" /> {l.adresseLiv}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                    <Package size={11} /> {l.colisCount ?? 1}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}

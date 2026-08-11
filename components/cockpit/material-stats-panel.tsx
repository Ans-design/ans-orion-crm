'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { unwrapApiData } from '@/lib/api-client';

type MaterialKpis = {
  lignesDevis: number;
  lignesCommande: number;
  caDevis: number;
  caCommande: number;
  surfaceBruteM2: number;
  surfaceReelleM2: number;
  calendarLignes: number;
  packagingLignes: number;
  customSurfaceLignes: number;
  topFormats: { format: string; count: number }[];
};

type Props = { months?: number };

export function MaterialStatsPanel({ months = 3 }: Props) {
  const [data, setData] = useState<MaterialKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetchWithTimeout(`/api/cockpit/material-stats?months=${months}`, {
      credentials: 'include',
      cache: 'no-store',
      timeout: 15_000,
    })
      .then((r) => r.json())
      .then((raw) => {
        const d = unwrapApiData<{ material?: MaterialKpis; _warning?: string }>(raw);
        if (d.material) setData(d.material);
        else setError(d._warning ?? 'Données matière indisponibles');
      })
      .catch((e: Error) => setError(e.message || 'Erreur réseau'))
      .finally(() => setLoading(false));
  }, [months]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="dashboard-chart-card card-span-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <Layers size={16} className="text-[var(--brand-primary)]" />
          KPI Matière — {months} mois
        </h3>
        <button type="button" onClick={load} className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>
      {loading && !data ? (
        <div className="h-24 animate-pulse bg-accent/50 rounded-lg" />
      ) : error && !data ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{error}</p>
      ) : data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div><p className="text-muted-foreground">Lignes devis</p><p className="font-bold text-lg">{data.lignesDevis}</p></div>
          <div><p className="text-muted-foreground">Lignes commande</p><p className="font-bold text-lg">{data.lignesCommande}</p></div>
          <div><p className="text-muted-foreground">Surface réelle</p><p className="font-bold text-lg">{data.surfaceReelleM2.toFixed(1)} m²</p></div>
          <div><p className="text-muted-foreground">Calendriers</p><p className="font-bold text-lg">{data.calendarLignes}</p></div>
          <div><p className="text-muted-foreground">Packaging</p><p className="font-bold text-lg">{data.packagingLignes}</p></div>
          <div><p className="text-muted-foreground">Surfaces custom</p><p className="font-bold text-lg">{data.customSurfaceLignes}</p></div>
          {data.topFormats.length > 0 && (
            <div className="col-span-full mt-1">
              <p className="text-muted-foreground mb-1">Top formats</p>
              <ul className="space-y-1">
                {data.topFormats.slice(0, 4).map((f) => (
                  <li key={f.format} className="flex justify-between">
                    <span className="truncate">{f.format}</span>
                    <span className="font-mono text-muted-foreground">{f.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { uxToast } from '@/lib/ux/feedback';
import { OptionsEmptyState } from '../options/OptionsEmptyState';
import { OptionsLoadingState } from '../options/OptionsLoadingState';

type Row = {
  key: string;
  label: string;
  family: string;
  grammage: string | null;
  format: string | null;
  unit: string | null;
  linkedArticles: string[];
  sources: string[];
  currentPrice: number | null;
  missingPrice: boolean;
  visiblePos: boolean;
  active: boolean;
  anomalies: string[];
};

export function MaterialsUsedPosTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<{ total: number; missingInBaseDb: number; missingPrice: number; withAnomalies: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadGenRef = useRef(0);

  const load = useCallback(async (showErrorToast = false) => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/materials-used-pos', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || d.ok === false) {
        const msg =
          typeof d.error === 'object' ? d.error?.message : d.error ?? 'Audit matières POS impossible';
        throw new Error(String(msg));
      }
      if (gen !== loadGenRef.current) return;
      setRows(d.data?.materials ?? []);
      setSummary(d.data?.summary ?? null);
    } catch (e) {
      if (gen !== loadGenRef.current) return;
      const msg = e instanceof Error ? e.message : 'Audit matières POS impossible';
      setError(msg);
      setRows([]);
      if (showErrorToast) uxToast.error(msg);
    } finally {
      if (gen === loadGenRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  if (loading) return <OptionsLoadingState variant="table" rows={8} />;

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
        <p className="mb-4 text-sm text-red-300/80">{error}</p>
        <AppButton type="button" variant="default" onClick={() => load(true)}>
          <RefreshCw className="h-4 w-4" /> Réessayer
        </AppButton>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <OptionsEmptyState
        title="Aucune matière détectée dans le POS."
        description="Les matières apparaîtront ici dès qu’elles sont référencées dans les options/chips ou le catalogue."
      />
    );
  }

  return (
    <div>
      {summary && (
        <div className="mb-3 flex flex-wrap gap-3 text-sm">
          <span className="ab2-badge">{summary.total} matières détectées</span>
          <span className="ab2-badge ab2-badge-warning">{summary.missingInBaseDb} absentes Matières DB</span>
          <span className="ab2-badge ab2-badge-warning">{summary.missingPrice} sans prix</span>
          <span className="ab2-badge ab2-badge-danger">{summary.withAnomalies} anomalies</span>
        </div>
      )}
      <div className="ab2-table-wrap overflow-x-auto">
        <table className="ab2-table text-sm">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Famille</th>
              <th>Grammage</th>
              <th>Format</th>
              <th>Articles liés</th>
              <th>Sources</th>
              <th>Prix actuel</th>
              <th>Anomalies</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={row.anomalies.length ? 'bg-amber-500/5' : undefined}>
                <td>{row.label}</td>
                <td>{row.family}</td>
                <td>{row.grammage ?? '—'}</td>
                <td>{row.format ?? '—'}</td>
                <td className="max-w-[120px] truncate" title={row.linkedArticles.join(', ')}>
                  {row.linkedArticles.length || '—'}
                </td>
                <td className="max-w-[140px] truncate" title={row.sources.join(', ')}>
                  {row.sources.join(', ')}
                </td>
                <td>{row.currentPrice != null ? `${Math.round(row.currentPrice)} Ar` : '—'}</td>
                <td className="text-amber-600">{row.anomalies.join(' ; ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

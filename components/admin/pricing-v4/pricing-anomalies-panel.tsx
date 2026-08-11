'use client';

import { useCallback, useEffect, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { AlertTriangle, RefreshCw, Wrench } from 'lucide-react';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import type { PricingAnomaly } from '@/lib/pricing/pricing-types';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  onOpenArticle?: (articleId: string) => void;
};

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'critical', label: 'Critiques' },
  { id: 'warning', label: 'Warnings' },
  { id: 'info', label: 'Infos' },
] as const;

export function PricingAnomaliesPanel({ onOpenArticle }: Props) {
  const [anomalies, setAnomalies] = useState<PricingAnomaly[]>([]);
  const [counts, setCounts] = useState({ critical: 0, warning: 0, info: 0 });
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter !== 'all' ? `?severity=${filter}` : '';
      const r = await fetch(`/api/pricing/anomalies${q}`);
      const d = await r.json();
      if (r.ok) {
        setAnomalies(d.anomalies ?? []);
        setCounts(d.counts ?? { critical: 0, warning: 0, info: 0 });
      }
    } catch {
      uxToast.error('Erreur chargement anomalies');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const countFor = (id: string) => {
    if (id === 'all') return counts.critical + counts.warning + counts.info;
    return counts[id as keyof typeof counts] ?? 0;
  };

  const severityClass = (s: string) =>
    s === 'critical' ? 'critique' : s === 'warning' ? 'warning' : 'info';

  const badgeCls = (s: string) =>
    s === 'critical' ? 'pta-badge-danger' : s === 'warning' ? 'pta-badge-warn' : 'pta-badge-draft';

  return (
    <div>
      <div className="pta-info-box" style={{ marginBottom: 16 }}>
        Analyse automatique des incohérences tarifaires — profils incomplets, formules manquantes, écarts POS.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div className="pta-anomaly-filters" role="group" aria-label="Filtrer les anomalies">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`pta-filter-chip${filter === f.id ? ' active' : ''}`}
              aria-pressed={filter === f.id}
            >
              {f.label} ({countFor(f.id)})
            </button>
          ))}
        </div>
        <AppButton
          type="button"
          onClick={() => void load().then(() => uxToast.success('Anomalies actualisées'))}
          disabled={loading}
          variant="ghost"
          size="sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ marginRight: 6 }} />
          Actualiser
        </AppButton>
        <ExcelTableActions
          fileStem="anomalies-tarif"
          sheetName="Anomalies"
          canImport={false}
          getExportRows={() =>
            anomalies.map((a, i) => ({
              SÉVÉRITÉ: a.severity,
              ARTICLE: a.articleId ?? '',
              SOURCE: a.source,
              MESSAGE: a.message,
              ACTION: a.recommendedAction,
              ID: String(i + 1).padStart(3, '0'),
            }))
          }
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="pta-skeleton" style={{ height: 64, borderRadius: 8 }} />
          ))}
        </div>
      ) : anomalies.length === 0 ? (
        <div className="pta-empty-state">
          <div className="icon">✅</div>
          <div className="title">Aucune anomalie</div>
          <div className="desc">Tout est en ordre dans cette catégorie. Revenez après une modification tarifaire.</div>
        </div>
      ) : (
        <div style={{ maxHeight: '32rem', overflowY: 'auto' }}>
          {anomalies.map((a) => (
            <div key={a.id} className={`pta-anomaly-row ${severityClass(a.severity)}`}>
              <AlertTriangle
                size={16}
                style={{
                  flexShrink: 0,
                  marginTop: 2,
                  color: a.severity === 'critical' ? 'var(--pta-danger)' :
                    a.severity === 'warning' ? 'var(--pta-warn)' : 'var(--primary, #FF174D)',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={`pta-badge ${badgeCls(a.severity)}`}>{a.severity}</span>
                  {a.articleId && (
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--pta-text3)' }}>
                      {a.articleId}
                    </span>
                  )}
                </div>
                <p style={{ fontWeight: 600, fontSize: 12 }}>{a.message}</p>
                <p style={{ fontSize: 10, color: 'var(--pta-text2)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Wrench size={10} /> {a.recommendedAction}
                </p>
              </div>
              {a.articleId && onOpenArticle && (
                <AppButton
                  type="button"
                  onClick={() => onOpenArticle(a.articleId!)}
                  variant="default"
                  size="sm"
                  style={{ flexShrink: 0 }}
                >
                  Corriger →
                </AppButton>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

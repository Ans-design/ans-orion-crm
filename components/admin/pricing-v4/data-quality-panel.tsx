'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { uxToast } from '@/lib/ux/feedback';
import { readApiJson } from '@/lib/api-client';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';

type Anomaly = {
  ruleId: string;
  module: string;
  label: string;
  severity: string;
  count: number;
  sampleIds: string[];
  fixHint?: string;
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critique',
  high: 'Élevée',
  medium: 'Moyenne',
  low: 'Faible',
};

function entityLink(ruleId: string, id: string): string | null {
  if (ruleId.startsWith('client')) return `/clients/${id}`;
  if (ruleId.startsWith('commande')) return `/commandes/${id}`;
  if (ruleId.startsWith('devis')) return `/devis`;
  if (ruleId.startsWith('facture')) return `/factures`;
  if (ruleId.startsWith('livraison')) return `/livraisons`;
  if (ruleId.startsWith('stock')) return `/stock`;
  if (ruleId.startsWith('talk')) return `/messagerie`;
  return null;
}

export function DataQualityPanel({ compact = false }: { compact?: boolean }) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [total, setTotal] = useState(0);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/data-quality', { credentials: 'include' });
      const d = await readApiJson<{
        totalAnomalies: number;
        scannedAt: string;
        anomalies: Anomaly[];
      }>(r);
      setAnomalies(d.anomalies ?? []);
      setTotal(d.totalAnomalies ?? 0);
      setScannedAt(d.scannedAt ?? null);
    } catch {
      uxToast.error('Scan qualité données indisponible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const severityClass = (s: string) =>
    s === 'critical' ? 'critique' : s === 'high' ? 'warning' : 'info';

  const badgeCls = (s: string) =>
    s === 'critical' ? 'pta-badge-danger' : s === 'high' ? 'pta-badge-warn' : 'pta-badge-draft';

  return (
    <div className={compact ? '' : 'mt-6 pt-6 border-t border-border'}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <h3 className="orion-section-title text-sm">Qualité des données ERP</h3>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-1">
              Clients, commandes, finance, stock, logistique — {total} anomalie(s) détectée(s)
              {scannedAt && ` · ${new Date(scannedAt).toLocaleString('fr-FR')}`}
            </p>
          )}
        </div>
        <AppButton type="button" onClick={load} disabled={loading} variant="ghost" size="sm">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Rescanner
        </AppButton>
      </div>

      {loading ? (
        <div className="pta-skeleton" style={{ height: 80, borderRadius: 8 }} />
      ) : anomalies.length === 0 ? (
        <div className="pta-empty-state" style={{ padding: '1.5rem' }}>
          <div className="icon">✅</div>
          <div className="title">Données cohérentes</div>
          <div className="desc">Aucune anomalie métier détectée sur ce scan.</div>
        </div>
      ) : (
        <div style={{ maxHeight: compact ? '20rem' : '28rem', overflowY: 'auto' }}>
          {anomalies.map((a) => (
            <div key={a.ruleId} className={`pta-anomaly-row ${severityClass(a.severity)}`}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span className={`pta-badge ${badgeCls(a.severity)}`}>{SEVERITY_LABEL[a.severity] ?? a.severity}</span>
                  <span className="text-[10px] text-muted-foreground">{a.module}</span>
                  <span className="pta-badge pta-badge-draft">{a.count}×</span>
                </div>
                <p style={{ fontWeight: 600, fontSize: 12 }}>{a.label}</p>
                {a.fixHint && (
                  <p style={{ fontSize: 10, color: 'var(--pta-text2)', marginTop: 4 }}>{a.fixHint}</p>
                )}
                {a.sampleIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {a.sampleIds.slice(0, 3).map((id) => {
                      const href = entityLink(a.ruleId, id);
                      if (!href) return null;
                      return (
                        <Link
                          key={id}
                          href={href}
                          className="text-[10px] text-[var(--accent-primary,#FF174D)] hover:underline inline-flex items-center gap-1"
                        >
                          {id.slice(0, 8)}… <ExternalLink size={10} />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

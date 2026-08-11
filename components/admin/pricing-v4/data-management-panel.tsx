'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { uxToast } from '@/lib/ux/feedback';
import { readApiJson } from '@/lib/api-client';
import { Download, Upload, RefreshCw, AlertTriangle, Database } from 'lucide-react';
import { DataQualityPanel } from '@/components/admin/pricing-v4/data-quality-panel';
import { MetricCell, MetricGrid, SectionBlock, SectionStack } from '@/components/ui/section-layout';
import { AppButton } from '@/components/ui/app-ui';

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityLabel: string | null;
  userName: string | null;
  createdAt: string;
};

type Overview = {
  volumes: {
    clients: number;
    clientsActifs: number;
    devis: number;
    commandes: number;
    factures: number;
    paiements: number;
    livraisons: number;
    stockItems: number;
    productions: number;
  };
  snapshots: {
    commandesSansPaymentSnapshot: number;
    devisAcceptesSansLogistics: number;
  };
  activity: {
    auditLast24h: number;
    commandesLast7d: number;
    paiementsLast7d: number;
  };
  qualityTrend: { scannedAt: string; totalAnomalies: number; critical: number; high: number }[];
  anomaliesByModule: { module: string; count: number }[];
};

export function DataManagementPanel() {
  const [totalAnomalies, setTotalAnomalies] = useState(0);
  const [bySeverity, setBySeverity] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dqRes, auditRes, ovRes] = await Promise.all([
        fetch('/api/admin/data-quality', { credentials: 'include' }),
        fetch('/api/admin/audit-logs?limit=8', { credentials: 'include' }),
        fetch('/api/admin/data-management/overview', { credentials: 'include' }),
      ]);
      if (dqRes.ok) {
        const dq = await readApiJson<{
          totalAnomalies: number;
          bySeverity: { critical: number; high: number; medium: number; low: number };
        }>(dqRes);
        setTotalAnomalies(dq.totalAnomalies ?? 0);
        setBySeverity(dq.bySeverity ?? { critical: 0, high: 0, medium: 0, low: 0 });
      }
      if (auditRes.ok) {
        const audit = await readApiJson<{ logs?: AuditRow[] }>(auditRes);
        setAuditLogs(audit.logs ?? []);
      }
      if (ovRes.ok) {
        const ov = await readApiJson<Overview>(ovRes);
        setOverview(ov);
      }
    } catch {
      uxToast.error('Chargement gouvernance données');
    } finally {
      setLoading(false);
    }
  }, []);

  const runBackfill = async (dryRun = false) => {
    setBackfilling(true);
    try {
      const r = await fetch(`/api/admin/data-management/backfill-snapshots${dryRun ? '?dryRun=1' : ''}`, {
        method: 'POST',
        credentials: 'include',
      });
      const result = await readApiJson<{ paymentUpdated: number; logisticsUpdated: number; dryRun: boolean }>(r);
      uxToast.success(
        result.dryRun
          ? `Simulation : ${result.paymentUpdated} commande(s), ${result.logisticsUpdated} devis`
          : `Backfill OK — ${result.paymentUpdated} paymentSnapshot, ${result.logisticsUpdated} logisticsSnapshot`,
      );
      await load();
    } catch {
      uxToast.error('Échec backfill snapshots');
    } finally {
      setBackfilling(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const snapGap =
    (overview?.snapshots.commandesSansPaymentSnapshot ?? 0) +
    (overview?.snapshots.devisAcceptesSansLogistics ?? 0);

  return (
    <SectionStack>
      <div className="pta-info-box flex flex-wrap items-center justify-between gap-2">
        <span>Centre de gouvernance des données — volumes, santé, snapshots et traçabilité.</span>
        <AppButton type="button" onClick={load} disabled={loading} variant="ghost" size="sm">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Actualiser
        </AppButton>
      </div>

      <MetricGrid>
        <MetricCell label="Anomalies" value={loading ? '…' : String(totalAnomalies)} tone={totalAnomalies > 0 ? 'warn' : 'ok'} />
        <MetricCell label="Critiques" value={loading ? '…' : String(bySeverity.critical)} tone={bySeverity.critical > 0 ? 'danger' : 'ok'} />
        <MetricCell label="Commandes" value={loading ? '…' : String(overview?.volumes.commandes ?? '—')} />
        <MetricCell label="Clients actifs" value={loading ? '…' : String(overview?.volumes.clientsActifs ?? '—')} />
        <MetricCell label="Audit 24h" value={loading ? '…' : String(overview?.activity.auditLast24h ?? '—')} />
        <MetricCell label="Snapshots à backfill" value={loading ? '…' : String(snapGap)} tone={snapGap > 0 ? 'warn' : 'ok'} />
      </MetricGrid>

      {overview && overview.qualityTrend.length > 1 && (
        <SectionBlock title="Tendance qualité données (derniers scans)">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs text-muted-foreground">{overview.qualityTrend.length} point(s)</span>
            <AppButton asChild variant="ghost" size="sm" className="inline-flex items-center gap-1">
              <a
                href="/api/admin/data-management/quality-trend"
                download
              >
                <Download size={12} /> Export CSV
              </a>
            </AppButton>
          </div>
          <div className="flex items-end gap-1 h-16">
            {overview.qualityTrend.map((point) => {
              const max = Math.max(...overview.qualityTrend.map((p) => p.totalAnomalies), 1);
              const h = Math.max(4, Math.round((point.totalAnomalies / max) * 100));
              return (
                <div
                  key={point.scannedAt}
                  className="flex-1 min-w-[6px] rounded-t bg-[rgba(255,23,77,0.35)] hover:bg-[rgba(255,23,77,0.55)] transition-colors"
                  style={{ height: `${h}%` }}
                  title={`${new Date(point.scannedAt).toLocaleString('fr-FR')} — ${point.totalAnomalies} anomalies`}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Chaque barre = un scan enregistré · déclenché via l&apos;onglet anomalies ou le rescan ci-dessous
          </p>
        </SectionBlock>
      )}

      {overview && (
        <SectionBlock title="Volumes métier">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              ['Devis', overview.volumes.devis],
              ['Factures', overview.volumes.factures],
              ['Paiements', overview.volumes.paiements],
              ['Livraisons', overview.volumes.livraisons],
              ['Stock actif', overview.volumes.stockItems],
              ['Productions', overview.volumes.productions],
              ['Cmd. 7 j', overview.activity.commandesLast7d],
              ['Pay. 7 j', overview.activity.paiementsLast7d],
            ].map(([label, val]) => (
              <div key={String(label)} className="rounded-lg border border-border px-3 py-2">
                <p className="text-muted-foreground">{label}</p>
                <p className="font-semibold text-sm">{val}</p>
              </div>
            ))}
          </div>
          {snapGap > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
              {overview.snapshots.commandesSansPaymentSnapshot} commande(s) sans paymentSnapshot ·{' '}
              {overview.snapshots.devisAcceptesSansLogistics} devis accepté(s) sans logisticsSnapshot
            </p>
          )}
          {snapGap > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              <AppButton
                type="button"
                disabled={backfilling || loading}
                onClick={() => runBackfill(false)}
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-2"
              >
                <Database size={14} className={backfilling ? 'animate-pulse' : ''} />
                Backfill snapshots
              </AppButton>
              <AppButton
                type="button"
                disabled={backfilling || loading}
                onClick={() => runBackfill(true)}
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                Simuler (dry-run)
              </AppButton>
              <span className="text-[10px] text-muted-foreground self-center">
                ou <code>npm run backfill:entity-snapshots</code>
              </span>
            </div>
          )}
        </SectionBlock>
      )}

      {overview && overview.anomaliesByModule.length > 0 && (
        <SectionBlock title="Activité audit (7 j)">
          <ul className="flex flex-wrap gap-2 text-xs">
            {overview.anomaliesByModule.map((row) => (
              <li key={row.module} className="pta-badge pta-badge-draft">
                {row.module} · {row.count}
              </li>
            ))}
          </ul>
        </SectionBlock>
      )}

      <SectionBlock title="Actions rapides">
        <div className="flex flex-wrap gap-2">
          <AppButton asChild variant="ghost" size="sm" className="inline-flex items-center gap-2">
            <Link href="/administration/import-export">
              <Upload size={14} /> Import / Export
            </Link>
          </AppButton>
          <AppButton asChild variant="ghost" size="sm" className="inline-flex items-center gap-2">
            <Link href="/administration/synchronisation">
              <RefreshCw size={14} /> Synchronisation
            </Link>
          </AppButton>
          <AppButton asChild variant="ghost" size="sm" className="inline-flex items-center gap-2">
            <Link href="/administration/anomalies">
              <AlertTriangle size={14} /> Anomalies tarif
            </Link>
          </AppButton>
          <AppButton asChild variant="ghost" size="sm" className="inline-flex items-center gap-2">
            <Link href="/parametres/donnees">
              <Download size={14} /> Données métier
            </Link>
          </AppButton>
        </div>
      </SectionBlock>

      <DataQualityPanel />

      <SectionBlock title="Modifications récentes">
        {auditLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun log récent.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {auditLogs.map((log) => (
              <li key={log.id} className="flex flex-wrap gap-2 border-b border-border/50 pb-2">
                <span className="font-mono text-muted-foreground">{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                <span className="font-medium">{log.action}</span>
                <span>{log.entity}{log.entityLabel ? ` — ${log.entityLabel}` : ''}</span>
                {log.userName && <span className="text-muted-foreground">par {log.userName}</span>}
              </li>
            ))}
          </ul>
        )}
      </SectionBlock>
    </SectionStack>
  );
}

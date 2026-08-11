'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { SyncDiagnostic } from '@/lib/services/sync.service';
import type { SyncDriftAlert, SyncDriftReport, SyncDriftSummary } from '@/lib/services/sync-drift-service';
import { BackofficeLoading, BackofficeError } from '@/components/admin/pricing-v4/backoffice-panel-state';
import { AppButton } from '@/components/ui/app-ui';

const Catalogue2026AuditPanel = dynamic(
  () =>
    import('@/components/admin/pricing-v4/panels/catalogue-2026-audit-panel').then(
      (m) => m.Catalogue2026AuditPanel,
    ),
  { ssr: false, loading: () => null },
);

type Props = {
  onRetrySync?: () => void;
  onSyncCatalogueDb?: () => void;
  syncing?: boolean;
  syncingCatalogueDb?: boolean;
  refreshKey?: number;
  lastPublishDrift?: SyncDriftSummary | null;
};

const STATUS_LABEL: Record<SyncDiagnostic['status'], string> = {
  ok: 'Synchronisé',
  info: 'Info',
  warn: 'À vérifier',
  error: 'Erreur',
  unknown: 'Non configuré',
};

const STATUS_CLASS: Record<SyncDiagnostic['status'], string> = {
  ok: 'acat-badge-active',
  info: 'acat-badge-draft',
  warn: 'acat-badge-draft',
  error: 'acat-badge-danger',
  unknown: 'acat-badge-draft',
};

const DRIFT_SEVERITY_CLASS: Record<SyncDriftAlert['severity'], string> = {
  info: 'acat-badge-draft',
  warn: 'acat-badge-draft',
  critical: 'acat-badge-danger',
};

const DRIFT_SEVERITY_LABEL: Record<SyncDriftAlert['severity'], string> = {
  info: 'Info',
  warn: 'Écart',
  critical: 'Critique',
};

export function SyncCenterPanel({ onRetrySync, onSyncCatalogueDb, syncing, syncingCatalogueDb, refreshKey, lastPublishDrift }: Props) {
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostic[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [driftReport, setDriftReport] = useState<SyncDriftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repairingPayments, setRepairingPayments] = useState(false);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);
  const [ignoringId, setIgnoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin-backoffice/sync-diagnostics');
      const d = await r.json();
      if (r.ok) {
        setDiagnostics(d.diagnostics ?? []);
        setSummary(d.summary ?? null);
        setDriftReport(d.driftReport ?? null);
      } else setError(d.error || 'Diagnostics indisponibles');
    } catch {
      setError('Erreur réseau');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const hasPaymentDrift = driftReport?.alerts.some((a) => a.id === 'payment-acompte-mismatch') ?? false;

  const repairPaymentDrift = useCallback(async () => {
    setRepairingPayments(true);
    setRepairMessage(null);
    try {
      const r = await fetch('/api/admin-backoffice/repair-payment-drift', { method: 'POST' });
      const d = await r.json();
      if (r.ok) {
        setRepairMessage(
          d.remaining === 0
            ? `${d.repaired} commande(s) resynchronisée(s) — ledger aligné.`
            : `${d.repaired} resynchronisée(s), ${d.remaining} écart(s) restant(s).`,
        );
        await load();
      } else {
        setRepairMessage(d.error || 'Réparation impossible');
      }
    } catch {
      setRepairMessage('Erreur réseau');
    }
    setRepairingPayments(false);
  }, [load]);

  const ignoreAlert = useCallback(async (alertId: string) => {
    setIgnoringId(alertId);
    setRepairMessage(null);
    try {
      const r = await fetch('/api/admin-backoffice/ignore-sync-drift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, hours: 24 }),
      });
      const d = await r.json();
      if (r.ok) {
        setRepairMessage(`Alerte ignorée 24 h (jusqu’à ${new Date(d.until).toLocaleString('fr-FR')}).`);
        await load();
      } else {
        setRepairMessage(d.error || 'Impossible d’ignorer');
      }
    } catch {
      setRepairMessage('Erreur réseau');
    }
    setIgnoringId(null);
  }, [load]);

  if (loading) {
    return <BackofficeLoading message="Analyse synchronisation…" />;
  }

  if (error) {
    return <BackofficeError message={error} onRetry={load} title="Synchronisation" />;
  }

  const driftAlerts = driftReport?.alerts ?? [];

  return (
    <div className="space-y-4">
      {lastPublishDrift && (
        <div className={`pta-info-box text-xs ${lastPublishDrift.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
          <strong>Dernière publication</strong>
          {' '}— score drift {lastPublishDrift.totalScore}
          {lastPublishDrift.criticalCount > 0 && (
            <> · <span className="text-red-600 font-semibold">{lastPublishDrift.criticalCount} critique(s)</span></>
          )}
          {lastPublishDrift.warnCount > 0 && (
            <> · {lastPublishDrift.warnCount} alerte(s)</>
          )}
          {lastPublishDrift.ok && lastPublishDrift.criticalCount === 0 && lastPublishDrift.warnCount === 0 && (
            <> · aucun écart critique</>
          )}
        </div>
      )}
      {summary && (
        <div className="pta-info-box text-xs">
          Config : <strong>{String(summary.configStatus)}</strong>
          {summary.posSyncRecommended ? ' — sync POS recommandée' : ''}
          {typeof summary.driftScore === 'number' && summary.driftScore > 0 && (
            <> — score drift <strong>{String(summary.driftScore)}</strong></>
          )}
          {summary.driftVerified === false && (
            <> — drift <strong>non vérifié</strong></>
          )}
          {typeof summary.catalogueCoveragePercent === 'number' && (
            <> — couverture DB <strong>{String(summary.catalogueCoveragePercent)}%</strong>
            {summary.catalogueCoverageMode ? ` (${String(summary.catalogueCoverageMode)})` : ''}</>
          )}
        </div>
      )}

      <Catalogue2026AuditPanel refreshKey={refreshKey} />

      {driftReport && (
        <div className="pta-subpanel space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="pta-subpanel-title">Alertes drift automatiques</div>
            <span className="text-[11px] text-muted-foreground">
              {driftAlerts.length === 0
                ? driftReport.ignoredCount
                  ? `Aucun écart visible · ${driftReport.ignoredCount} ignorée(s) 24 h`
                  : 'Aucun écart détecté'
                : `${driftAlerts.length} alerte(s) · score ${driftReport.totalScore}${
                    driftReport.ignoredCount ? ` · ${driftReport.ignoredCount} ignorée(s)` : ''
                  }`}
            </span>
          </div>
          {driftReport.catalogueDb && (
            <p className="text-[11px] text-muted-foreground">
              Catalogue {driftReport.catalogueDb.catalogueCount} · profils DB{' '}
              {driftReport.catalogueDb.dbProfileCount}
              {driftReport.catalogueDb.missingInDb > 0 &&
                ` · ${driftReport.catalogueDb.missingInDb} manquant(s) en base`}
            </p>
          )}
          {driftAlerts.length > 0 ? (
            <ul className="space-y-2">
              {driftAlerts.map((alert) => (
                <li key={alert.id} className="flex items-start justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">{alert.title}</div>
                    <p className="text-[11px] text-muted-foreground">{alert.message}</p>
                    {alert.details && alert.details.length > 0 && (
                      <ul className="mt-1 orion-text-meta list-disc pl-4">
                        {alert.details.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {alert.href && (
                        <a
                          href={alert.href}
                          className="text-[11px] text-[var(--orion-red,#FF174D)] underline-offset-2 hover:underline"
                        >
                          Ouvrir
                        </a>
                      )}
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        disabled={ignoringId === alert.id}
                        onClick={() => void ignoreAlert(alert.id)}
                      >
                        {ignoringId === alert.id ? '…' : 'Ignorer 24 h'}
                      </AppButton>
                    </div>
                  </div>
                  <span className={`acat-badge acat-badge-xs shrink-0 ${DRIFT_SEVERITY_CLASS[alert.severity]}`}>
                    {DRIFT_SEVERITY_LABEL[alert.severity]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">Config, catalogue et profils tarifaires alignés.</p>
          )}
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        {diagnostics.map((d) => (
          <div key={d.key} className="pta-subpanel flex justify-between items-start gap-2">
            <div>
              <div className="pta-subpanel-title">{d.label}</div>
              {d.detail && <p className="text-[11px] text-muted-foreground">{d.detail}</p>}
            </div>
            <span className={`acat-badge acat-badge-xs ${STATUS_CLASS[d.status]}`}>
              {STATUS_LABEL[d.status]}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <AppButton type="button" variant="ghost" size="sm" onClick={load}>Réanalyser</AppButton>
        {hasPaymentDrift && (
          <AppButton
            type="button"
            variant="default"
            size="sm"
            onClick={repairPaymentDrift}
            disabled={repairingPayments}
          >
            {repairingPayments ? 'Resync paiements…' : 'Resync acomptes ↔ ledger'}
          </AppButton>
        )}
        {onRetrySync && (
          <AppButton type="button" variant="default" size="sm" onClick={onRetrySync} disabled={syncing}>
            {syncing ? 'Sync…' : 'Sync config catalogue'}
          </AppButton>
        )}
        {onSyncCatalogueDb && (
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSyncCatalogueDb}
            disabled={syncingCatalogueDb}
          >
            {syncingCatalogueDb ? 'Import DB…' : 'Importer catalogue → profils DB'}
          </AppButton>
        )}
      </div>
      {repairMessage && (
        <p className="text-[11px] text-muted-foreground">{repairMessage}</p>
      )}
    </div>
  );
}

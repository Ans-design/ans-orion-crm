'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AppButton, AppSyncStateBadge } from '@/components/ui/app-ui';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';
import { exportRowsToXlsx } from '@/lib/admin/excel-table';
import { SyncCenterPanel } from '@/components/admin/pricing-v4/panels/sync-center-panel';
import type { SyncDiagnostic } from '@/lib/services/sync.service';
import type { SyncDriftReport } from '@/lib/services/sync-drift-service';
import type { SyncUiStatus } from '@/components/ui/sync-state-badge';
import { emitOrionLive, liveFetch } from '@/lib/live/orion-live';

type Props = { canEdit: boolean };

function driftToExcelRows(
  diagnostics: SyncDiagnostic[],
  driftReport: SyncDriftReport | null,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  for (const d of diagnostics) {
    rows.push({
      TYPE: 'DIAGNOSTIC',
      MODULE: d.label,
      STATUT: d.status,
      DÉTAIL: d.detail ?? '',
      SÉVÉRITÉ: '',
      MESSAGE: '',
      ID: d.key,
    });
  }

  for (const alert of driftReport?.alerts ?? []) {
    rows.push({
      TYPE: 'ALERTE DRIFT',
      MODULE: alert.id,
      STATUT: alert.severity,
      DÉTAIL: alert.title,
      SÉVÉRITÉ: alert.severity,
      MESSAGE: alert.message,
      ID: alert.id,
    });
    for (const detail of alert.details ?? []) {
      rows.push({
        TYPE: 'DÉTAIL DRIFT',
        MODULE: alert.id,
        STATUT: alert.severity,
        DÉTAIL: detail,
        SÉVÉRITÉ: alert.severity,
        MESSAGE: '',
        ID: `${alert.id}-detail`,
      });
    }
  }

  if (driftReport?.catalogueDb) {
    const c = driftReport.catalogueDb;
    rows.push({
      TYPE: 'CATALOGUE DB',
      MODULE: 'catalogue',
      STATUT: c.missingInDb > 0 ? 'warn' : 'ok',
      DÉTAIL: `Catalogue ${c.catalogueCount} · DB ${c.dbProfileCount}`,
      SÉVÉRITÉ: '',
      MESSAGE: c.missingInDb > 0 ? `${c.missingInDb} manquant(s) en base` : 'Aligné',
      ID: 'catalogue-db',
    });
  }

  return rows;
}

export function SyncUnifiedWorkspace({ canEdit }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncingCatalogueDb, setSyncingCatalogueDb] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncOk, setLastSyncOk] = useState<boolean | null>(null);

  const uiStatus: SyncUiStatus = syncing || syncingCatalogueDb
    ? 'publishing'
    : refreshing
      ? 'queued'
      : lastSyncOk === false
        ? 'error'
        : lastSyncOk === true
          ? 'synced'
          : 'saved';

  const syncPos = async () => {
    if (!canEdit) return;
    setSyncing(true);
    try {
      const r = await liveFetch('/api/admin-backoffice/sync-all', { method: 'POST' });
      const d = await r.json();
      const status = d.data?.syncStatus as string | undefined;
      const ok = r.ok && d.ok !== false && status !== 'failed';
      if (ok) {
        uxToast.success(
          d.data?.message ??
            (status === 'partial' ? 'Sync partielle Admin → POS' : ADMIN_UI.syncPos),
        );
        emitOrionLive('sync', { source: 'sync-all' });
        emitOrionLive('pricing', { source: 'sync-all', skipNav: true });
        emitOrionLive('catalogue', { source: 'sync-all', skipNav: true });
        setRefreshKey((k) => k + 1);
        setLastSyncAt(new Date().toISOString());
        setLastSyncOk(status !== 'partial');
      } else {
        uxToast.error(getApiErrorMessage(d, 'Sync échouée'));
        setLastSyncOk(false);
      }
    } catch {
      uxToast.error('Erreur réseau');
      setLastSyncOk(false);
    }
    setSyncing(false);
  };

  const syncCatalogueDb = async () => {
    if (!canEdit) return;
    setSyncingCatalogueDb(true);
    try {
      const r = await fetch('/api/admin-config/sync-catalog', { method: 'POST' });
      const d = await r.json();
      if (r.ok) {
        uxToast.success('Catalogue importé vers profils DB');
        setRefreshKey((k) => k + 1);
      } else uxToast.error(getApiErrorMessage(d, 'Import catalogue impossible'));
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSyncingCatalogueDb(false);
  };

  const exportDrift = async () => {
    const r = await fetch('/api/admin-backoffice/sync-diagnostics');
    const d = await r.json();
    if (!r.ok) {
      uxToast.error('Diagnostics indisponibles');
      return;
    }
    const rows = driftToExcelRows(d.diagnostics ?? [], d.driftReport ?? null);
    if (!rows.length) {
      uxToast.error('Aucune donnée à exporter');
      return;
    }
    exportRowsToXlsx(rows, 'sync-diagnostics', 'Synchronisation');
    uxToast.success(`${rows.length} ligne(s) exportée(s)`);
  };

  const refreshDiagnostics = async () => {
    setRefreshing(true);
    try {
      const r = await fetch('/api/admin-backoffice/sync-diagnostics');
      const d = await r.json();
      if (!r.ok) {
        uxToast.error(getApiErrorMessage(d, 'Diagnostics indisponibles'));
        return;
      }
      setRefreshKey((k) => k + 1);
      uxToast.success('Diagnostics actualisés');
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4 min-h-0 flex flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            ORION · Administration · Synchronisation
          </p>
          <h1 className="text-xl font-bold text-foreground m-0">Centre de synchronisation</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Diagnostics drift, alignement catalogue/POS/DB et réparations automatiques.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AppSyncStateBadge status={uiStatus} asOf={lastSyncAt} />
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            disabled={refreshing}
            onClick={() => void refreshDiagnostics()}
          >
            <RefreshCw className={`h-4 w-4${refreshing ? ' animate-spin' : ''}`} />
            Actualiser
          </AppButton>
          <AppButton type="button" variant="ghost" size="sm" onClick={() => void exportDrift()}>
            Export Excel diagnostics
          </AppButton>
          {canEdit ? (
            <AppButton
              type="button"
              variant="default"
              size="sm"
              disabled={syncing}
              onClick={() => void syncPos()}
            >
              {syncing ? 'Sync…' : ADMIN_UI.syncPos}
            </AppButton>
          ) : null}
        </div>
      </header>

      <SyncCenterPanel
        onRetrySync={canEdit ? syncPos : undefined}
        onSyncCatalogueDb={canEdit ? syncCatalogueDb : undefined}
        syncing={syncing}
        syncingCatalogueDb={syncingCatalogueDb}
        refreshKey={refreshKey}
      />
    </div>
  );
}

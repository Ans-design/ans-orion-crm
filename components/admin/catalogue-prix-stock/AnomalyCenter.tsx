'use client';

import { useState } from 'react';
import { AlertTriangle, GitCompareArrows, RefreshCw } from 'lucide-react';
import { CatalogueAnomaliesPanel } from '@/components/administration/catalogue/CatalogueAnomaliesPanel';
import { SyncCenterPanel } from '@/components/admin/pricing-v4/panels/sync-center-panel';
import { PosPublicationParityPanel } from './PosPublicationParityPanel';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  canEdit: boolean;
  onMerged?: () => void;
  onSyncPos?: () => void;
  onOpenFormula?: (articleId: string) => void;
  onOpenProduct?: (articleId: string) => void;
};

type DiagTab = 'anomalies' | 'drift' | 'parity';

/**
 * Centre d’anomalies tarifaires — diagnostics + actions correctives.
 * Onglet par défaut = anomalies catalogue (pas un faux « Synchronisé »).
 */
export function AnomalyCenter({
  canEdit,
  onMerged,
  onSyncPos,
  onOpenFormula,
  onOpenProduct,
}: Props) {
  const [tab, setTab] = useState<DiagTab>('anomalies');

  return (
    <div className="space-y-3">
      <div className="cps-pricing-panel">
        <div className="cps-pricing-panel__head">
          <h3 className="cps-pricing-panel__title">Centre d’anomalies tarifaires</h3>
          <p className="cps-pricing-panel__sub">
            Diagnostiquer, corriger, puis réanalyser — ne marquer résolu qu’après contrôle.
          </p>
        </div>
        <div className="grid gap-2 px-4 pb-4 sm:grid-cols-3">
          <button
            type="button"
            className={cn('cps-pricing-kpi', tab === 'anomalies' && 'cps-pricing-kpi--warn')}
            onClick={() => setTab('anomalies')}
          >
            <span className="cps-pricing-kpi__label">Anomalies catalogue</span>
            <p className="m-0 mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Doublons, prix, formules
            </p>
          </button>
          <button
            type="button"
            className={cn('cps-pricing-kpi', tab === 'parity' && 'cps-pricing-kpi--warn')}
            onClick={() => setTab('parity')}
          >
            <span className="cps-pricing-kpi__label">Parité Admin ↔ POS</span>
            <p className="m-0 mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <GitCompareArrows className="h-3.5 w-3.5" aria-hidden />
              Projection vérifiée
            </p>
          </button>
          <button
            type="button"
            className={cn('cps-pricing-kpi', tab === 'drift' && 'cps-pricing-kpi--warn')}
            onClick={() => setTab('drift')}
          >
            <span className="cps-pricing-kpi__label">Drift technique</span>
            <p className="m-0 mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Sync & reprise
            </p>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Diagnostics">
        {(
          [
            { id: 'anomalies' as const, label: 'Anomalies catalogue' },
            { id: 'parity' as const, label: 'Parité Admin ↔ POS' },
            { id: 'drift' as const, label: 'Drift technique' },
          ] as const
        ).map((t) => (
          <AppButton
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            variant={tab === t.id ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </AppButton>
        ))}
      </div>

      {tab === 'parity' ? (
        <PosPublicationParityPanel
          onOpenFormula={onOpenFormula}
          onOpenProduct={onOpenProduct}
        />
      ) : tab === 'drift' ? (
        <div className="orion-pricing-admin">
          <SyncCenterPanel
            onRetrySync={onSyncPos}
            syncing={false}
          />
        </div>
      ) : (
        <CatalogueAnomaliesPanel
          canEdit={canEdit}
          onMerged={onMerged}
          onSyncPos={onSyncPos}
        />
      )}
    </div>
  );
}

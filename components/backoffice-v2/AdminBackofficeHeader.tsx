'use client';

/** @deprecated Remplacé par AdminBackofficeTopbar — conservé (zéro suppression). */

import { Rocket, RefreshCw, Plus } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  engineVersion?: string;
  syncLabel: string;
  lastSync?: string | null;
  canEdit: boolean;
  publishing: boolean;
  syncing: boolean;
  onPublish: () => void;
  onSync: () => void;
  onNewArticle?: () => void;
};

export function AdminBackofficeHeader({
  engineVersion = 'v4',
  syncLabel,
  lastSync,
  canEdit,
  publishing,
  syncing,
  onPublish,
  onSync,
  onNewArticle,
}: Props) {
  return (
    <header className="ab2-header">
      <div>
        <h1>Administration Backoffice</h1>
        <p>Catalogue, tarification, variables, matières, publication et synchronisation POS.</p>
        <p className="text-[10px] mt-1 opacity-70">
          ANS ORION · Moteur {engineVersion}
          {lastSync && <> · Sync {new Date(lastSync).toLocaleString('fr-FR')}</>}
        </p>
      </div>
      <div className="ab2-header-actions">
        <span className={`ab2-badge ${syncLabel.includes('Synchronis') ? 'ab2-badge-success' : 'ab2-badge-warning'}`}>
          {syncLabel}
        </span>
        {canEdit && (
          <>
            {onNewArticle && (
              <AppButton type="button" variant="ghost" onClick={onNewArticle}>
                <Plus className="inline h-3.5 w-3.5 mr-1" />
                Nouvel article
              </AppButton>
            )}
            <AppButton type="button" variant="ghost" onClick={onSync} disabled={syncing}>
              <RefreshCw className={`inline h-3.5 w-3.5 mr-1${syncing ? ' animate-spin' : ''}`} />
              Sync POS
            </AppButton>
            <AppButton type="button" variant="default" onClick={onPublish} disabled={publishing}>
              <Rocket className="inline h-3.5 w-3.5 mr-1" />
              {publishing ? 'Publication…' : 'Publier'}
            </AppButton>
          </>
        )}
      </div>
    </header>
  );
}

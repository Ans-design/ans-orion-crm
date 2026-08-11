'use client';

import Link from 'next/link';
import { AppButton } from '@/components/ui/app-ui';
import type { BackofficeUnifiedTabId } from '@/lib/pricing/backoffice-unified-tabs';

type SyncInfo = {
  posUpToDate: boolean;
  pendingChanges: number;
  lastPublishedAt: string | null;
  lastPublishedBy: string | null;
  message: string;
};

type Props = {
  articleId: string | null;
  articleLabel: string | null;
  sync: SyncInfo | null;
  anomalyCount: number;
  onJumpTab: (tab: BackofficeUnifiedTabId) => void;
};

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function BackofficeContextPanel({ articleId, articleLabel, sync, anomalyCount, onJumpTab }: Props) {
  return (
    <aside className="bo-catalog-context">
      <div className="bo-catalog-context-head">Panneau contextuel</div>

      <div className="bo-context-block">
        <div className="bo-context-label">Article sélectionné</div>
        {articleId ? (
          <>
            <p className="text-sm font-semibold">{articleLabel ?? articleId}</p>
            <p className="text-xs text-muted-foreground mt-1">{articleId}</p>
            <Link href={`/pos/${articleId}`} className="text-xs text-primary mt-2 inline-block" target="_blank">
              Voir dans POS →
            </Link>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun article</p>
        )}
      </div>

      <div className="bo-context-block">
        <div className="bo-context-label">Publication POS</div>
        <div className="bo-stat-row">
          <span>Statut</span>
          <span className={`bo-badge ${sync?.posUpToDate ? 'bo-badge-success' : 'bo-badge-warning'}`}>
            {sync?.posUpToDate ? 'Synchronisé' : 'Modifié non publié'}
          </span>
        </div>
        <div className="bo-stat-row">
          <span>Modifications en attente</span>
          <strong>{sync?.pendingChanges ?? 0}</strong>
        </div>
        <div className="bo-stat-row">
          <span>Dernière publication</span>
          <span>{formatTime(sync?.lastPublishedAt ?? null)}</span>
        </div>
        {sync?.lastPublishedBy && (
          <div className="bo-stat-row">
            <span>Par</span>
            <span>{sync.lastPublishedBy}</span>
          </div>
        )}
        <AppButton type="button" variant="ghost" size="sm" className="mt-2 w-full" onClick={() => onJumpTab('sync')}>
          Ouvrir synchronisation
        </AppButton>
      </div>

      <div className="bo-context-block">
        <div className="bo-context-label">Anomalies</div>
        {anomalyCount > 0 ? (
          <>
            <p className="text-sm">
              <span className="bo-badge bo-badge-danger">{anomalyCount}</span>
              {' '}alerte{anomalyCount > 1 ? 's' : ''} catalogue
            </p>
            <AppButton type="button" variant="ghost" size="sm" className="mt-2 w-full" onClick={() => onJumpTab('history')}>
              Voir anomalies
            </AppButton>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Aucune anomalie critique détectée</p>
        )}
      </div>

      <div className="bo-context-block">
        <div className="bo-context-label">Raccourcis</div>
        <div className="flex flex-col gap-1">
          <AppButton type="button" variant="ghost" size="sm" className="justify-start" onClick={() => onJumpTab('pricing')}>
            Tarification & simulateur
          </AppButton>
          <AppButton type="button" variant="ghost" size="sm" className="justify-start" onClick={() => onJumpTab('variables')}>
            Variables & options
          </AppButton>
          <AppButton asChild variant="ghost" size="sm" className="justify-start">
            <Link href="/administration/synchronisation">
              Centre sync complet
            </Link>
          </AppButton>
        </div>
      </div>
    </aside>
  );
}

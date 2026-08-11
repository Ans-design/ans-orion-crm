'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw, Rocket, Search } from 'lucide-react';
import { adminStatusFilterLabel } from '@/lib/administration/admin-ui-vocab';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  familyFilter: string;
  onFamilyFilterChange: (v: string) => void;
  families: { id: string; label: string; count: number }[];
  lastUpdated: string | null;
  syncStatus: string;
  syncBadge: 'success' | 'warning' | 'danger' | 'info';
  anomalyCount: number;
  canEdit: boolean;
  publishing: boolean;
  syncing: boolean;
  onPublish: () => void;
  onSync: () => void;
  onShowAnomalies: () => void;
};

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BackofficeHeader({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  familyFilter,
  onFamilyFilterChange,
  families,
  lastUpdated,
  syncStatus,
  syncBadge,
  anomalyCount,
  canEdit,
  publishing,
  syncing,
  onPublish,
  onSync,
  onShowAnomalies,
}: Props) {
  return (
    <header className="bo-catalog-header">
      <div>
        <h1>Backoffice Catalogue &amp; Tarification</h1>
        <p>
          Gérez articles, variables, options, prix, règles et synchronisation POS depuis une seule interface.
        </p>
      </div>

      <div className="bo-catalog-header-actions">
        <div className="relative flex items-center">
          <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            className="bo-search pl-7 w-48"
            placeholder="Rechercher article…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <select
          className="bo-search w-auto min-w-[7rem]"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          aria-label="Filtrer par statut"
        >
          <option value="all">Tous statuts</option>
          <option value="published">{adminStatusFilterLabel('published')}</option>
          <option value="draft">{adminStatusFilterLabel('draft')}</option>
        </select>

        <select
          className="bo-search w-auto min-w-[7rem]"
          value={familyFilter}
          onChange={(e) => onFamilyFilterChange(e.target.value)}
          aria-label="Filtrer par famille"
        >
          <option value="all">Toutes familles</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>{f.label} ({f.count})</option>
          ))}
        </select>

        <span className={`bo-badge bo-badge-${syncBadge}`} title="Synchronisation POS">
          {syncStatus}
        </span>

        <span className="bo-badge bo-badge-muted" title="Dernière MAJ catalogue">
          MAJ {formatTime(lastUpdated)}
        </span>

        {anomalyCount > 0 && (
          <AppButton type="button" variant="ghost" size="sm" onClick={onShowAnomalies}>
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            {anomalyCount} anomalie{anomalyCount > 1 ? 's' : ''}
          </AppButton>
        )}

        {canEdit && (
          <>
            <AppButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1${syncing ? ' animate-spin' : ''}`} />
              Sync catalogue
            </AppButton>
            <AppButton
              type="button"
              variant="default"
              size="sm"
              onClick={onPublish}
              disabled={publishing}
            >
              <Rocket className="h-3.5 w-3.5 mr-1" />
              {publishing ? 'Publication…' : 'Publier'}
            </AppButton>
          </>
        )}

        <AppButton asChild variant="ghost" size="sm">
          <Link href="/pos" target="_blank">
            Aperçu POS
          </Link>
        </AppButton>
      </div>
    </header>
  );
}

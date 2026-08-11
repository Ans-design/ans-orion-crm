'use client';

import {
  Download,
  FileSpreadsheet,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_UI } from '@/lib/administration/admin-ui-vocab';
import { AppButton } from '@/components/ui/app-ui';
import './matieres-tarifs-page.css';

export type SyncBadgeStatus = 'synced' | 'pending' | 'error';

type Props = {
  title?: string;
  subtitle?: string;
  /** Conservé pour compat API — fil d’Ariane retiré. */
  domainLabel?: string;
  /** Masque le bloc titre / sous-titre (ex. Formules & moteurs a son propre heading). */
  hideTitleBlock?: boolean;
  syncStatus: SyncBadgeStatus;
  canEdit: boolean;
  syncing?: boolean;
  /** Permission serveur config:publish — désactive Sync si false. */
  canPublish?: boolean;
  onNew?: () => void;
  newLabel?: string;
  onImport?: () => void;
  onExport?: () => void;
  onTemplate?: () => void;
  onSync?: () => void;
  onActions?: () => void;
  /**
   * `studio-prix` : Exporter (outline) puis Nouvel article (primary) uniquement —
   * Import / Modèle / Sync : en-tête Matières ou Paramètres.
   * `matieres-tarifs` : Importer + Exporter + Nouvelle matière (mockup PrintFlow).
   */
  actionsVariant?: 'default' | 'studio-prix' | 'matieres-tarifs';
  /** Sous-titre long — off par défaut (en-têtes densifiés tous modules). */
  showDescription?: boolean;
};

const SYNC_LABEL: Record<SyncBadgeStatus, { label: string; className: string; dot: string }> = {
  synced: {
    label: 'POS synchronisé',
    className: 'cps-sync-pill cps-sync-pill--ok',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'Sync non vérifiée',
    className: 'cps-sync-pill cps-sync-pill--warn',
    dot: 'bg-[var(--ans-gold,#d97706)]',
  },
  error: {
    label: 'Erreur sync — POS non à jour',
    className: 'cps-sync-pill cps-sync-pill--danger',
    dot: 'bg-[var(--ans-primary,#e71850)]',
  },
};

/** Header module premium — titre + actions (maquette V5). Ne remplace pas les sidebars. */
export function AdminHeader({
  title = 'Catalogue, Prix & Stock',
  subtitle = 'Configurez le catalogue, publiez les tarifs et synchronisez le POS — sans modifier le code.',
  domainLabel,
  hideTitleBlock = false,
  syncStatus,
  canEdit,
  syncing,
  canPublish = true,
  onNew,
  newLabel,
  onImport,
  onExport,
  onTemplate,
  onSync,
  onActions,
  actionsVariant = 'default',
  showDescription = false,
}: Props) {
  const sync = SYNC_LABEL[syncStatus];
  const syncDisabled = Boolean(syncing) || !canPublish;
  const studioPrix = actionsVariant === 'studio-prix';
  const matieresTarifs = actionsVariant === 'matieres-tarifs';
  const compactActions = studioPrix || matieresTarifs;
  const hasActions =
    Boolean(onExport) ||
    Boolean(onImport) ||
    Boolean(onTemplate) ||
    Boolean(onSync) ||
    Boolean(onActions) ||
    Boolean(canEdit && onNew);

  if (hideTitleBlock && !hasActions) {
    return null;
  }

  const kicker = matieresTarifs
    ? 'Catalogue de production'
    : studioPrix
      ? 'Catalogue & prix'
      : domainLabel || 'Administration';
  /* Dense par défaut : kicker + h1 + chip — pas de paragraphe long */
  const showSubtitle = Boolean(subtitle) && showDescription && !compactActions;

  return (
    <header
      className={cn(
        'cps-admin-header orion-module-header orion-module-header--compact cps-admin-header--dense sticky top-0 z-20 flex w-full flex-col border-b border-[var(--border-soft,transparent)] bg-[var(--cps-bg)]/92 px-0 backdrop-blur-md',
        studioPrix && 'cps-admin-header--studio-prix',
        matieresTarifs && 'cps-admin-header--matieres-tarifs',
      )}
    >
      <div className="orion-module-header__row flex w-full flex-wrap items-center justify-between gap-2">
        {!hideTitleBlock ? (
          <div className="orion-module-header__meta min-w-0 flex-1">
            {kicker ? <p className="orion-module-header__kicker mt-eyebrow">{kicker}</p> : null}
            <div className="orion-module-header__title-line">
              <h1 className="orion-module-header__title orion-ds-page-title orion-ds-page-title--compact orion-text-page-title m-0 text-[var(--cps-title)]">
                {title}
              </h1>
              <span
                className={cn(
                  'orion-module-header__chip inline-flex items-center gap-1.5',
                  sync.className,
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    sync.dot,
                    syncStatus === 'synced' && 'animate-pulse',
                  )}
                />
                {sync.label}
              </span>
            </div>
            {showSubtitle ? (
              <p className="orion-module-header__desc cps-admin-header__subtitle-studio line-clamp-1 max-w-xl text-[var(--cps-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="min-w-0 flex-1" aria-hidden />
        )}

        <div className="cps-header-actions flex flex-wrap items-center gap-1.5">
          {matieresTarifs ? (
            <>
              {canEdit && onImport ? (
                <AppButton type="button" variant="outline" onClick={onImport}>
                  <Upload className="h-3.5 w-3.5" />
                  {ADMIN_UI.import}
                </AppButton>
              ) : null}
              {onExport ? (
                <AppButton type="button" variant="outline" onClick={onExport}>
                  <Download className="h-3.5 w-3.5" />
                  {ADMIN_UI.export}
                </AppButton>
              ) : null}
              {canEdit && onSync ? (
                <AppButton
                  type="button"
                  variant="outline"
                  disabled={syncDisabled}
                  onClick={onSync}
                  title={!canPublish ? 'Permission publication requise' : undefined}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
                  {ADMIN_UI.syncPos}
                </AppButton>
              ) : null}
              {canEdit && onNew ? (
                <AppButton type="button" variant="default" className="cps-matieres-new-btn" onClick={onNew}>
                  <Plus className="h-3.5 w-3.5" />
                  {newLabel ?? 'Nouvelle matière'}
                </AppButton>
              ) : null}
            </>
          ) : compactActions ? (
            <>
              {onExport ? (
                <AppButton type="button" variant="outline" onClick={onExport}>
                  <Download className="h-3.5 w-3.5" />
                  {ADMIN_UI.export}
                </AppButton>
              ) : null}
              {canEdit && onNew ? (
                <AppButton type="button" variant="default" onClick={onNew}>
                  <Plus className="h-3.5 w-3.5" />
                  {newLabel ?? 'Nouvel article'}
                </AppButton>
              ) : null}
            </>
          ) : (
            <>
              {canEdit && onNew ? (
                <AppButton type="button" variant="default" onClick={onNew}>
                  <Plus className="h-3.5 w-3.5" />
                  {newLabel ?? ADMIN_UI.create}
                </AppButton>
              ) : null}
              {canEdit && onImport ? (
                <AppButton type="button" variant="outline" onClick={onImport}>
                  <Upload className="h-3.5 w-3.5" />
                  {ADMIN_UI.import}
                </AppButton>
              ) : null}
              {onExport ? (
                <AppButton type="button" variant="outline" onClick={onExport}>
                  <Download className="h-3.5 w-3.5" />
                  {ADMIN_UI.export}
                </AppButton>
              ) : null}
              {onTemplate ? (
                <AppButton type="button" variant="outline" className="hidden sm:inline-flex" onClick={onTemplate}>
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Modèle Excel
                </AppButton>
              ) : null}
              {canEdit && onSync ? (
                <AppButton
                  type="button"
                  variant="default"
                  disabled={syncDisabled}
                  title={!canPublish ? 'Permission config:publish requise' : undefined}
                  onClick={onSync}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
                  {syncing ? 'Synchronisation…' : ADMIN_UI.syncPos}
                </AppButton>
              ) : null}
              {onActions ? (
                <AppButton type="button" variant="ghost" size="icon" onClick={onActions} aria-label="Ouvrir les diagnostics">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </AppButton>
              ) : null}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

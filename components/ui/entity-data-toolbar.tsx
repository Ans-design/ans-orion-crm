'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Archive, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  className?: string;
  /** Vue liste active vs corbeille */
  trash?: boolean;
  onTrashChange?: (trash: boolean) => void;
  /** Navigation URL (prioritaire si fournie — fiable multi-onglets / E2E) */
  activeHref?: string;
  trashHref?: string;
  trashLabel?: string;
  activeLabel?: string;
  onImport?: () => void;
  onExport?: () => void;
  canImport?: boolean;
  canExport?: boolean;
  importLabel?: string;
  exportLabel?: string;
  children?: ReactNode;
};

const toggleClass = (active: boolean) =>
  cn(
    'px-3 min-h-[44px] h-11 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]',
    active
      ? 'orion-on-dark-fill bg-[var(--primary)] text-white'
      : 'bg-card text-muted-foreground hover:bg-accent',
  );

/**
 * Barre listes métier : Importer / Exporter / Corbeille.
 */
export function EntityDataToolbar({
  className,
  trash = false,
  onTrashChange,
  activeHref,
  trashHref,
  trashLabel = 'Corbeille',
  activeLabel = 'Actifs',
  onImport,
  onExport,
  canImport = true,
  canExport = true,
  importLabel = 'Importer',
  exportLabel = 'Exporter',
  children,
}: Props) {
  const showTrashToggle = Boolean(onTrashChange || activeHref || trashHref);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 orion-entity-data-toolbar',
        className,
      )}
      role="toolbar"
      aria-label="Données module"
    >
      {showTrashToggle ? (
        <div className="inline-flex rounded-[7px] border border-border overflow-hidden">
          {activeHref ? (
            <Link
              href={activeHref}
              scroll={false}
              data-testid="entity-toolbar-actifs"
              className={toggleClass(!trash)}
              aria-pressed={!trash}
              prefetch={false}
            >
              {activeLabel}
            </Link>
          ) : (
            <button
              type="button"
              data-testid="entity-toolbar-actifs"
              className={toggleClass(!trash)}
              aria-pressed={!trash}
              onClick={() => onTrashChange?.(false)}
            >
              {activeLabel}
            </button>
          )}
          {trashHref ? (
            <Link
              href={trashHref}
              scroll={false}
              data-testid="entity-toolbar-trash"
              className={toggleClass(trash)}
              aria-pressed={trash}
              prefetch={false}
            >
              <Archive size={13} aria-hidden />
              {trashLabel}
            </Link>
          ) : (
            <button
              type="button"
              data-testid="entity-toolbar-trash"
              className={toggleClass(trash)}
              aria-pressed={trash}
              onClick={() => onTrashChange?.(true)}
            >
              <Archive size={13} aria-hidden />
              {trashLabel}
            </button>
          )}
        </div>
      ) : null}

      {onImport && canImport && !trash ? (
        <AppButton type="button" variant="outline" size="sm" onClick={onImport} className="gap-1.5">
          <Upload size={14} aria-hidden />
          {importLabel}
        </AppButton>
      ) : null}

      {onExport && canExport ? (
        <AppButton type="button" variant="outline" size="sm" onClick={onExport} className="gap-1.5">
          <Download size={14} aria-hidden />
          {exportLabel}
        </AppButton>
      ) : null}

      {children}
    </div>
  );
}

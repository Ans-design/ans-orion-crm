'use client';

import type { ReactNode } from 'react';
import { OrionPageHeader } from '@/components/orion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SyncUiStatus } from '@/components/ui/sync-state-badge';

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  syncStatus?: SyncUiStatus;
  syncAsOf?: string | null;
  kicker?: string;
  meta?: ReactNode;
  /** id pour aria-labelledby */
  headingId?: string;
};

/**
 * Shell liste métier canonique — header + toolbar + contenu, a11y landmarks.
 */
export function EntityListPageShell({
  title,
  description,
  icon,
  actions,
  toolbar,
  children,
  className,
  syncStatus,
  syncAsOf,
  kicker,
  meta,
  headingId = 'orion-list-page-title',
}: Props) {
  return (
    <div
      className={cn('space-y-6 dashboard-full max-w-none', className)}
      role="region"
      aria-labelledby={headingId}
    >
      <OrionPageHeader
        title={title}
        description={description}
        icon={icon}
        actions={actions}
        syncStatus={syncStatus}
        syncAsOf={syncAsOf}
        kicker={kicker}
        meta={meta}
      />
      {/* titre exposé pour lecteurs d’écran si PageHeader n’émet pas l’id */}
      <span id={headingId} className="sr-only">
        {title}
      </span>
      {toolbar ? (
        <div className="orion-filter-toolbar" role="search" aria-label={`Filtres ${title}`}>
          {toolbar}
        </div>
      ) : null}
      <div className="orion-list-page-body min-w-0">{children}</div>
    </div>
  );
}

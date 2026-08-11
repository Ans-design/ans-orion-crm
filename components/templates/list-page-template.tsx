/**
 * Template List V11 — coquille réutilisable (pilote /clients à brancher progressivement).
 */
import type { ReactNode } from 'react';
import { ModuleHeader } from '@/components/layouts/module-header';
import type { LucideIcon } from 'lucide-react';
import type { SyncUiStatus } from '@/components/ui/sync-state-badge';

export function ListPageTemplate({
  title,
  description,
  icon,
  actions,
  toolbar,
  children,
  syncStatus,
  syncAsOf,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  syncStatus?: SyncUiStatus;
  syncAsOf?: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <ModuleHeader
        title={title}
        description={description}
        icon={icon}
        actions={actions}
        syncStatus={syncStatus}
        syncAsOf={syncAsOf}
      />
      {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

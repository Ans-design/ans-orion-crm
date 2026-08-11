/**
 * Template Detail V11 — hub type /commandes/[id].
 */
import type { ReactNode } from 'react';
import { ModuleHeader } from '@/components/layouts/module-header';
import type { LucideIcon } from 'lucide-react';
import type { SyncUiStatus } from '@/components/ui/sync-state-badge';

export function DetailPageTemplate({
  title,
  description,
  icon,
  actions,
  contextBanner,
  children,
  syncStatus,
  syncAsOf,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  contextBanner?: ReactNode;
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
      {contextBanner}
      <div className="min-h-0 flex-1 space-y-4">{children}</div>
    </div>
  );
}

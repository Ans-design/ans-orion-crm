/**
 * ModuleHeader — wrapper mince V11 sur PageHeader.
 */
import { PageHeader } from '@/components/layouts/page-header';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { AppSyncStateBadge } from '@/components/ui/app-ui';
import type { SyncUiStatus } from '@/components/ui/sync-state-badge';

export function ModuleHeader({
  title,
  description,
  actions,
  breadcrumb,
  icon,
  compact = true,
  syncStatus,
  syncAsOf,
  className,
  kicker,
  meta,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  icon?: LucideIcon;
  compact?: boolean;
  syncStatus?: SyncUiStatus;
  syncAsOf?: string | null;
  className?: string;
  kicker?: string;
  meta?: ReactNode;
}) {
  const mergedActions = (
    <>
      {syncStatus ? <AppSyncStateBadge status={syncStatus} asOf={syncAsOf} /> : null}
      {actions}
    </>
  );

  return (
    <PageHeader
      title={title}
      description={description}
      breadcrumb={breadcrumb}
      icon={icon}
      compact={compact}
      className={className}
      kicker={kicker}
      meta={meta}
      actions={syncStatus || actions ? mergedActions : undefined}
    />
  );
}

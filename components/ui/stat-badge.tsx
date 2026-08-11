import { cn } from '@/lib/utils';
import { statusBadgeClass } from '@/lib/ui/status-styles';
import { getStatusMeta } from '@/lib/design/status-meta';

export function StatBadge({ statut, className }: { statut: string; className?: string }) {
  const meta = getStatusMeta(statut);
  return (
    <span
      title={meta.description}
      className={cn('orion-badge-chip text-xs font-semibold leading-none px-2 py-0.5 orion-status-pop', statusBadgeClass(statut), className)}
    >
      {statut}
    </span>
  );
}

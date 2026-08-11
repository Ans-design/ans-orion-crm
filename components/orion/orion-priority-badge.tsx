import { cn } from '@/lib/utils';

export type OrionPriority = 'Basse' | 'Normale' | 'Haute' | 'Urgente' | string;

const PRIORITY_CLASS: Record<string, string> = {
  Basse: 'bg-[var(--bg-chip)] text-[var(--text-muted)] border border-[var(--border-soft)]',
  Normale: 'bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]',
  Haute: 'bg-[color-mix(in_srgb,var(--orion-orange)_18%,transparent)] text-[var(--orion-orange-dark,var(--warning))]',
  Urgente: 'bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)] text-destructive',
};

export function OrionPriorityBadge({
  priority,
  className,
  size = 'sm',
}: {
  priority: OrionPriority;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const tone = PRIORITY_CLASS[priority] ?? PRIORITY_CLASS.Normale;
  return (
    <span
      className={cn(
        'orion-ds-badge orion-status-pop inline-flex items-center font-semibold',
        size === 'md' && 'orion-ds-badge--md',
        tone,
        className,
      )}
    >
      {priority}
    </span>
  );
}

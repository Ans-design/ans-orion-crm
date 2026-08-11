import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
};

export function SectionHeader({
  title,
  description,
  actions,
  className,
  icon: Icon,
  size = 'md',
}: Props) {
  return (
    <div
      className={cn(
        'orion-section-header flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between w-full min-w-0',
        className,
      )}
    >
      <div className="min-w-0 w-full sm:flex-1">
        <h2
          className={cn(
            'orion-ds-section-title flex items-center gap-2 min-w-0',
            size === 'sm' && 'text-sm font-semibold',
          )}
        >
          {Icon && (
            <Icon
              size={size === 'sm' ? 14 : 16}
              className="text-[var(--orion-rose)] shrink-0"
              aria-hidden
            />
          )}
          <span className="truncate">{title}</span>
        </h2>
        {description ? (
          <p className="orion-ds-page-desc orion-hide-on-phone mt-1">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div
          className="orion-section-header__actions flex items-center gap-2 shrink-0 min-w-0 w-full sm:w-auto overflow-x-auto sm:overflow-visible sm:flex-wrap sm:justify-end"
          data-orion-h-scroll="1"
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        'orion-ds-empty orion-ux-fade-in text-center py-14 px-6',
        className,
      )}
    >
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-[var(--orion-radius)] bg-accent flex items-center justify-center mb-4">
          <Icon size={22} className="text-muted-foreground" aria-hidden />
        </div>
      )}
      <h3 className="orion-ds-section-title text-sm">{title}</h3>
      {description && <p className="orion-ds-page-desc mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

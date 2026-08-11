import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Props = {
  title?: string;
  message: string;
  icon?: LucideIcon;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({
  title = 'Une erreur est survenue',
  message,
  icon: Icon = AlertTriangle,
  onRetry,
  retryLabel = 'Réessayer',
  action,
  className,
}: Props) {
  return (
    <div
      role="alert"
      className={cn(
        'text-center py-12 px-6 bg-destructive/5 border border-destructive/20 rounded-[7px]',
        className,
      )}
    >
      <div className="mx-auto w-12 h-12 rounded-[7px] bg-destructive/10 flex items-center justify-center mb-4">
        <Icon size={22} className="text-destructive" aria-hidden />
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{message}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button type="button" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}

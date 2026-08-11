import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  message?: string;
  hint?: string;
  className?: string;
  size?: 'sm' | 'md';
  children?: ReactNode;
};

export function LoadingState({
  message = 'Chargement…',
  hint,
  className,
  size = 'md',
  children,
}: Props) {
  const iconSize = size === 'sm' ? 18 : 22;
  const pad = size === 'sm' ? 'py-8' : 'py-12';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        pad,
        className,
      )}
    >
      <div
        className={cn(
          'rounded-[7px] bg-accent border border-border flex items-center justify-center mb-3',
          size === 'sm' ? 'w-10 h-10' : 'w-12 h-12',
        )}
      >
        <Loader2 size={iconSize} className="text-muted-foreground animate-spin" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{hint}</p>}
      {children}
    </div>
  );
}

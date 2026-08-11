import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function OrionActionBar({
  children,
  className,
  align = 'start',
}: {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'between' | 'center';
}) {
  return (
    <div
      className={cn(
        'orion-ds-toolbar',
        align === 'end' && 'justify-end',
        align === 'between' && 'justify-between',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      {children}
    </div>
  );
}

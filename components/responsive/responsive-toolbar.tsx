'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  primary?: ReactNode;
  secondary?: ReactNode;
  className?: string;
};

/** Toolbar : primaire visible ; secondaire wrap / scroll horizontal local. */
export function ResponsiveToolbar({ primary, secondary, className }: Props) {
  return (
    <div className={cn('flex flex-col gap-2 md:flex-row md:items-center md:justify-between min-w-0', className)}>
      {primary ? <div className="flex flex-wrap items-center gap-2 min-w-0">{primary}</div> : null}
      {secondary ? (
        <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-0.5 min-w-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

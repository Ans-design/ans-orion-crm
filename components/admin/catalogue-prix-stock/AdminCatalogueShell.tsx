'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './catalogue-prix-stock-light.css';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Shell Catalogue Prix Stock — full-bleed aligné sur --shell-pad-x */
export function AdminCatalogueShell({ children, className }: Props) {
  return (
    <div
      className={cn(
        'cps-theme orion-bleed w-full max-w-none min-w-0 py-3 md:py-4 space-y-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

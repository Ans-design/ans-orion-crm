'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Action = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  hidden?: boolean;
};

type Props = {
  actions: Action[];
  className?: string;
};

/** Actions icône alignées — voir, modifier, supprimer */
export function TableRowActions({ actions, className }: Props) {
  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {visible.map((a) => (
        <button
          key={a.id}
          type="button"
          title={a.label}
          aria-label={a.label}
          onClick={(e) => { e.stopPropagation(); a.onClick(); }}
          className={cn(
            'orion-row-action-btn',
            a.variant === 'danger' && 'orion-row-action-btn-danger',
          )}
        >
          {a.icon}
        </button>
      ))}
    </div>
  );
}

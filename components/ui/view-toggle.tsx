'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewOption<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
};

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: ViewOption<T>[];
  className?: string;
};

/** Segmented control liste / kanban / cartes */
export function ViewToggle<T extends string>({ value, onChange, options, className }: Props<T>) {
  return (
    <div className={cn('orion-segmented shrink-0', className)} role="group" aria-label="Mode d'affichage">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              'p-2 rounded-[7px] transition-colors',
              active
                ? 'ans-btn-primary shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--orion-surface-soft)]',
            )}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

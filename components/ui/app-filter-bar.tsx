'use client';

import { cn } from '@/lib/utils';

type FilterOption = {
  id: string;
  label: string;
};

type Props = {
  options: FilterOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

/** Barre de filtres chips — design system ORION. */
export function AppFilterBar({ options, value, onChange, className }: Props) {
  return (
    <div className={cn('orion-surface-toolbar', className)}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'orion-surface-chip',
            value === opt.id && 'orion-surface-chip--active',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

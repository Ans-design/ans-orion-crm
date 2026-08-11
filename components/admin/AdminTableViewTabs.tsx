'use client';

import { cn } from '@/lib/utils';

export type AdminViewTab<T extends string = string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  tabs: readonly AdminViewTab<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
};

/**
 * Sous-onglets standard Administration — modèle Matières / Corbeille / Historique.
 * Classes : `.orion-material-nav-tabs` (material-modal.css).
 */
export function AdminTableViewTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel = 'Vues du tableau',
  className,
}: Props<T>) {
  return (
    <nav className={cn('orion-material-nav-tabs', className)} aria-label={ariaLabel}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={value === t.id ? 'active' : undefined}
          aria-current={value === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

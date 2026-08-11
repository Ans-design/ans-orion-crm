import { cn } from '@/lib/utils';
import { ORION_GRID_GAP } from '@/lib/design/spacing-system';

type Props = {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6 | 8;
  className?: string;
  /** Bandeau KPI compact (commandes) vs grille cartes (devis) */
  variant?: 'cards' | 'strip';
};

const COL_CLASS: Record<NonNullable<Props['columns']>, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6',
  8: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8',
};

/** Grille KPI unifiée — gouttière gap-4, hauteurs homogènes via orion-kpi-tile */
export function KpiGrid({ children, columns = 4, className, variant = 'cards' }: Props) {
  const gridClass = cn('grid', ORION_GRID_GAP.standard, COL_CLASS[columns], className);

  if (variant === 'strip') {
    return (
      <div className="orion-kpi-strip">
        <div className={gridClass}>{children}</div>
      </div>
    );
  }

  return <div className={gridClass}>{children}</div>;
}

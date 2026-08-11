'use client';

import type { ReactNode } from 'react';
import { useResponsiveMode } from '@/lib/responsive/use-responsive-mode';
import type { ColumnPriority } from '@/lib/responsive/types';
import { columnsForMode, cardFields } from '@/lib/responsive/column-priority';
import { cn } from '@/lib/utils';

export type ResponsiveDataViewProps<T> = {
  data: T[];
  rowKey: (row: T) => string;
  columns: ColumnPriority[];
  /** Table desktop/tablette — même dataset, pas de second fetch */
  renderTable: (visibleColumnIds: string[]) => ReactNode;
  /** Carte phone — champs dérivés du schéma colonnes */
  renderCard: (row: T, fields: ColumnPriority[]) => ReactNode;
  /** Force liste cartes même hors phone (tests) */
  forceCards?: boolean;
  className?: string;
  empty?: ReactNode;
  caption?: string;
};

/**
 * Une seule source de données → table ou cartes selon mode.
 * Interdit : display:block sur &lt;table&gt; comme faux responsive.
 */
export function ResponsiveDataView<T>({
  data,
  rowKey,
  columns,
  renderTable,
  renderCard,
  forceCards,
  className,
  empty,
  caption,
}: ResponsiveDataViewProps<T>) {
  const { mode, ready } = useResponsiveMode();
  const useCards = forceCards ?? (ready && mode === 'phone');

  if (data.length === 0 && empty) return <>{empty}</>;

  if (useCards) {
    const fields = cardFields(columns);
    return (
      <ul
        className={cn('space-y-2 list-none p-0 m-0', className)}
        aria-label={caption || 'Liste'}
      >
        {data.map((row) => (
          <li key={rowKey(row)}>{renderCard(row, fields)}</li>
        ))}
      </ul>
    );
  }

  const visible = columnsForMode(columns, mode === 'phone' ? 'tablet' : mode);
  return (
    <div className={className} aria-label={caption}>
      {renderTable(visible.map((c) => c.id))}
    </div>
  );
}

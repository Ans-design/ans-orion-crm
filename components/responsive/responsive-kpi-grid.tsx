'use client';

import { Children, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { KpiGrid } from '@/components/ui/kpi-grid';
import { OrionHorizontalRail } from '@/components/responsive/orion-horizontal-rail';

type Props = {
  children: ReactNode;
  /** Nb KPI desktop */
  columns?: 2 | 3 | 4 | 5 | 6 | 8;
  className?: string;
  variant?: 'cards' | 'strip';
  /**
   * Conservé pour API : sur phone tous les KPI glissent L→R (plus de coupe + « Voir tous » empilé).
   * @deprecated préférer le rail horizontal — phoneMax n’empile plus verticalement.
   */
  phoneMax?: 2 | 3;
  more?: ReactNode;
};

/**
 * KPI V15 — phone : carrousel horizontal (snap) ; tablet 2 cols ; desktop N cols.
 * Évite les colonnes empilées qui allongent le scroll bas.
 */
export function ResponsiveKpiGrid({
  children,
  columns = 4,
  className,
  variant = 'cards',
  more,
}: Props) {
  const kids = Children.toArray(children);

  return (
    <div className={cn('w-full min-w-0', className)}>
      {/* Phone — slide L→R, tous les indicateurs accessibles sans hauteur verticale */}
      <OrionHorizontalRail label="Indicateurs — glisser à gauche ou à droite" phoneOnly>
        {kids}
      </OrionHorizontalRail>
      {more ? (
        <div className="mt-2 md:hidden flex justify-center">{more}</div>
      ) : null}

      {/* Tablet : 2 cols */}
      <div className="hidden md:block xl:hidden">
        <KpiGrid columns={2} variant={variant}>
          {kids}
        </KpiGrid>
      </div>
      {/* Desktop ≥1280 */}
      <div className="hidden xl:block">
        <KpiGrid columns={columns} variant={variant}>
          {kids}
        </KpiGrid>
      </div>
    </div>
  );
}

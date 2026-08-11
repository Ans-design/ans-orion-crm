'use client';

import { Children, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Largeur slide (défaut KPI) */
  slide?: 'kpi' | 'wide';
  /** Accessible name */
  label?: string;
  /** Masqué dès tablet — le parent affiche une grille classique */
  phoneOnly?: boolean;
};

/**
 * Rail L→R (scroll-snap) — même module, moins de scroll vertical.
 * Visuel type app moderne (peek + snap).
 */
export function OrionHorizontalRail({
  children,
  className,
  slide = 'kpi',
  label = 'Faire défiler horizontalement',
  phoneOnly = true,
}: Props) {
  const kids = Children.toArray(children).filter(Boolean);
  if (!kids.length) return null;

  return (
    <div
      className={cn(
        'orion-h-rail',
        phoneOnly && 'orion-h-rail--phone-only md:hidden',
        className,
      )}
      role="region"
      aria-label={label}
      data-orion-h-scroll="1"
    >
      {kids.map((child, i) => (
        <div
          key={i}
          className={cn(
            'orion-h-rail__slide',
            slide === 'wide' && 'orion-h-rail__slide--wide',
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

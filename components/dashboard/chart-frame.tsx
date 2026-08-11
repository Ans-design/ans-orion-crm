'use client';

import type { ReactNode, CSSProperties } from 'react';

/**
 * Conteneur stable pour Recharts ResponsiveContainer.
 * Une seule surface partagée (évite width/height = -1 en flex/grid).
 */
export function ChartFrame({
  children,
  height = 220,
  className = '',
}: {
  children: ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`orion-chart-frame w-full min-w-0 max-w-full ${className}`}
      style={{
        width: '100%',
        height,
        minHeight: height,
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
}

export function safeChartNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Style tooltip unique pour tous les graphiques Recharts. */
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  background: 'var(--cockpit-surface)',
  border: '1px solid var(--border-soft)',
  borderRadius: '7px',
  fontSize: '12px',
  boxShadow: 'var(--shadow-card)',
  padding: '10px 12px',
};

import type { ColumnPriority, ResponsiveMode, ResponsivePriority } from '@/lib/responsive/types';

const RANK: Record<ResponsivePriority, number> = {
  critical: 0,
  primary: 1,
  secondary: 2,
  detail: 3,
};

/** Colonnes visibles pour un mode (exclut `detail` hors desktop). */
export function columnsForMode(
  columns: ColumnPriority[],
  mode: ResponsiveMode,
  opts?: { maxDetailOnDesktop?: boolean },
): ColumnPriority[] {
  return columns.filter((col) => {
    const p = col[mode];
    if (mode === 'phone') return p === 'critical' || p === 'primary' || Boolean(col.cardField);
    if (mode === 'tablet') return p !== 'detail';
    void opts;
    return true;
  });
}

export function sortColumnsByPriority(
  columns: ColumnPriority[],
  mode: ResponsiveMode,
): ColumnPriority[] {
  return [...columns].sort((a, b) => RANK[a[mode]] - RANK[b[mode]]);
}

export function cardFields(columns: ColumnPriority[]): ColumnPriority[] {
  return columns.filter((c) => c.cardField || c.phone === 'critical' || c.phone === 'primary');
}

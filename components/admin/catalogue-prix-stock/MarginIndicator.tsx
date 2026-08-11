'use client';

import { cn } from '@/lib/utils';

type Props = {
  /** Marge brute en % (0–100+) */
  marginPct: number | null | undefined;
  showBar?: boolean;
  className?: string;
};

function tone(pct: number) {
  if (pct > 50) return { text: 'text-green-600', bar: 'bg-green-500', bg: 'bg-green-50' };
  if (pct >= 30) return { text: 'text-orange-500', bar: 'bg-orange-500', bg: 'bg-orange-50' };
  return { text: 'text-red-600', bar: 'bg-red-500', bg: 'bg-red-50' };
}

export function MarginIndicator({ marginPct, showBar = true, className }: Props) {
  if (marginPct == null || Number.isNaN(marginPct)) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  const pct = Math.max(0, marginPct);
  const t = tone(pct);
  const width = Math.min(100, pct);

  return (
    <div className={cn('min-w-[72px]', className)}>
      <span className={cn('text-xs font-semibold tabular-nums', t.text)}>
        {pct.toFixed(0)} %
      </span>
      {showBar ? (
        <div className={cn('mt-1 h-1.5 w-full overflow-hidden rounded-full', t.bg)}>
          <div className={cn('h-full rounded-full transition-all', t.bar)} style={{ width: `${width}%` }} />
        </div>
      ) : null}
    </div>
  );
}

/** Calcule marge (vente - achat) / vente * 100 */
export function computeMarginPct(sale: number, cost: number): number | null {
  if (!(sale > 0)) return null;
  return ((sale - cost) / sale) * 100;
}

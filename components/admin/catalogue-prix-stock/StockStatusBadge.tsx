'use client';

import { cn } from '@/lib/utils';

export type StockTone = 'ok' | 'critical' | 'rupture';

type Props = {
  stock: number | null | undefined;
  threshold?: number | null;
  className?: string;
};

export function resolveStockTone(stock: number | null | undefined, threshold?: number | null): StockTone {
  const qty = stock ?? 0;
  if (qty <= 0) return 'rupture';
  if (threshold != null && qty <= threshold) return 'critical';
  return 'ok';
}

const LABEL: Record<StockTone, string> = {
  ok: 'Normal',
  critical: 'Critique',
  rupture: 'Rupture',
};

export function StockStatusBadge({ stock, threshold, className }: Props) {
  const tone = resolveStockTone(stock, threshold);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        tone === 'ok' && 'bg-green-50 text-green-700 ring-1 ring-green-600/20',
        tone === 'critical' && 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
        tone === 'rupture' && 'animate-pulse bg-red-50 text-red-700 ring-1 ring-red-600/20',
        className,
      )}
    >
      {LABEL[tone]}
      {stock != null ? (
        <span className="ml-1 font-mono font-semibold normal-case tracking-normal">{stock}</span>
      ) : null}
    </span>
  );
}

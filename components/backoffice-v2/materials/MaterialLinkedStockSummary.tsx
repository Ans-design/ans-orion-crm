'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

type Row = {
  stockItemId?: string | null;
  stockDisplay?: string | null;
  stockStatus?: string | null;
  stockSku?: string | null;
};

export function MaterialLinkedStockSummary({ row }: { row: Row }) {
  if (!row.stockItemId && !row.stockDisplay) {
    return <span className="text-muted-foreground text-xs">Non lié</span>;
  }

  const statusClass =
    row.stockStatus === 'rupture'
      ? 'text-red-400'
      : row.stockStatus === 'critique'
        ? 'text-amber-400'
        : 'text-emerald-400';

  return (
    <div className="text-xs">
      <div className={statusClass}>{row.stockDisplay ?? '—'}</div>
      {row.stockSku && (
        <Link href="/stock" className="inline-flex items-center gap-0.5 text-primary hover:underline">
          {row.stockSku} <ExternalLink className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

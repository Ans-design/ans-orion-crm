'use client';

import { STOCK_CATEGORIES, type StockCategoryId } from '@/lib/data/stock-categories';

const COLORS: Record<StockCategoryId, string> = {
  vente_directe: 'bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)]',
  hybride: 'bg-[color-mix(in_srgb,var(--ans-plum-700,#9D174D)_18%,transparent)] text-[var(--ans-plum-700,#9D174D)] dark:text-[#D4A0C0] border-[color-mix(in_srgb,var(--ans-plum-700,#9D174D)_30%,transparent)]',
  matiere_interne: 'bg-amber-500/20 text-amber-700 dark:text-amber-200 border-amber-500/30',
  maintenance_piece: 'bg-primary/15 text-primary border-[color-mix(in_srgb,var(--primary)_28%,transparent)]',
};

export function StockCategoryBadge({ category }: { category: string }) {
  const id = (STOCK_CATEGORIES.find((c) => c.id === category)?.id ?? 'matiere_interne') as StockCategoryId;
  const label = STOCK_CATEGORIES.find((c) => c.id === id)?.label ?? category;
  return (
    <span className={`inline-flex rounded-[7px] border px-2 py-0.5 text-xs font-medium ${COLORS[id]}`}>
      {label}
    </span>
  );
}

export { STOCK_CATEGORIES };

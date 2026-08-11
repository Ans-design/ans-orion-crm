'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/** Barre pagination compacte pour listes CRM */
export function ListPaginationBar({ page, totalPages, total, onPageChange, className = '' }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between gap-3 pt-4 text-sm ${className}`}>
      <p className="text-muted-foreground text-xs">
        {total} résultat{total > 1 ? 's' : ''} · page {page}/{totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-2 rounded-lg hover:bg-accent disabled:opacity-100 disabled:text-[var(--app-disabled-text)]"
          aria-label="Page précédente"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-2 rounded-lg hover:bg-accent disabled:opacity-100 disabled:text-[var(--app-disabled-text)]"
          aria-label="Page suivante"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

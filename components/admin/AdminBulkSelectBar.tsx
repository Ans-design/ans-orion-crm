'use client';

import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  disabled?: boolean;
  busy?: boolean;
  deleteLabel?: string;
  className?: string;
};

/**
 * Barre sélection multiple — Tout sélectionner + Supprimer sélection (modèle Corbeille matières).
 */
export function AdminBulkSelectBar({
  allSelected,
  someSelected,
  onToggleAll,
  selectedCount,
  onDeleteSelected,
  disabled = false,
  busy = false,
  deleteLabel = 'Supprimer sélection',
  className,
}: Props) {
  if (disabled) return null;

  return (
    <div className={cn('orion-admin-bulk-bar', className)}>
      <label className="orion-admin-bulk-select-all">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected && !allSelected;
          }}
          onChange={onToggleAll}
          aria-label="Tout sélectionner"
        />
        Tout sélectionner
      </label>
      <button
        type="button"
        className="orion-admin-bulk-delete"
        disabled={selectedCount === 0 || busy}
        onClick={onDeleteSelected}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deleteLabel}
      </button>
      {selectedCount > 0 ? (
        <span className="orion-admin-bulk-count tabular-nums">
          {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
        </span>
      ) : null}
    </div>
  );
}

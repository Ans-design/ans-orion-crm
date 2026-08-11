'use client';

import { useState } from 'react';
import { Copy, Pencil, Trash2, type LucideIcon } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { MaterialPriceUnifiedRow } from './types';

type UnifiedRow = MaterialPriceUnifiedRow;

type Props = {
  row: UnifiedRow;
  canEdit: boolean;
  onChanged: () => void;
  onQuickEdit: (row: UnifiedRow) => void;
  /** Legacy — fiche ouverte via clic sur la matière (menu « … » masqué). */
  onViewDetails?: (row: UnifiedRow) => void;
  onViewUsage?: (row: UnifiedRow) => void;
  onLinkStock?: (row: UnifiedRow) => void;
};

export async function archiveMaterialToCorbeille(
  row: UnifiedRow,
  onChanged: () => void,
  _skipConfirm = false,
): Promise<void> {
  const isPrintOnly = row.id.startsWith('print-');
  if (isPrintOnly) {
    uxToast.error('Créez d\'abord une matière liée depuis stock ou catalogue');
    return;
  }

  const r = await fetch(`/api/admin-backoffice/pricing/base-materials/${row.id}/archive`, { method: 'POST' });
  const d = await r.json();
  if (r.ok && d.ok) {
    uxToast.success('Matière déplacée vers la corbeille');
    onChanged();
  } else {
    uxToast.error(d.error?.message ?? d.error ?? 'Déplacement impossible');
  }
}

export async function duplicateMaterialRow(row: UnifiedRow, onChanged: () => void): Promise<void> {
  const isPrintOnly = row.id.startsWith('print-');
  if (isPrintOnly) {
    uxToast.error('Créez d\'abord une matière liée depuis stock ou catalogue');
    return;
  }

  const r = await fetch(`/api/admin-backoffice/pricing/base-materials/${row.id}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grammage: row.grammage }),
  });
  const d = await r.json();
  if (r.ok && d.ok) {
    uxToast.success('Matière dupliquée');
    onChanged();
  } else {
    uxToast.error(typeof d.error === 'string' ? d.error : d.error?.message ?? 'Erreur duplication');
  }
}

function ActionBtn({
  icon: Icon,
  title,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: LucideIcon;
  title: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`mp-row-action-btn${danger ? ' is-danger' : ''}${disabled ? ' is-disabled' : ''}`}
      title={title}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled || !onClick) return;
        onClick();
      }}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

export function MaterialPriceRowActions({
  row,
  canEdit,
  onChanged,
  onQuickEdit,
}: Props) {
  const isPrintOnly = row.id.startsWith('print-');
  const denied = 'Action non autorisée';
  const printHint = 'Créez d\'abord une matière catalogue depuis stock';
  const [deleteOpen, setDeleteOpen] = useState(false);
  const usedInPos = row.visiblePOS || (row.linkedArticlesCount ?? 0) > 0;

  return (
    <div className="mp-row-actions">
      <ActionBtn
        icon={Pencil}
        title={!canEdit ? denied : 'Modifier'}
        label={`Modifier ${row.name}`}
        disabled={!canEdit}
        onClick={() => onQuickEdit(row)}
      />
      <ActionBtn
        icon={Copy}
        title={!canEdit ? denied : isPrintOnly ? printHint : 'Dupliquer'}
        label={`Dupliquer ${row.name}`}
        disabled={!canEdit || isPrintOnly}
        onClick={() => void duplicateMaterialRow(row, onChanged)}
      />
      <ActionBtn
        icon={Trash2}
        title={!canEdit ? denied : isPrintOnly ? printHint : 'Archiver (corbeille)'}
        label={`Archiver ${row.name}`}
        disabled={!canEdit || isPrintOnly}
        danger
        onClick={() => setDeleteOpen(true)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Archiver la matière"
        description={
          usedInPos
            ? `« ${row.name} » est utilisée dans le POS ou des articles. Elle sera envoyée en corbeille (restauration possible).`
            : `« ${row.name} » sera déplacée vers la corbeille. Vous pourrez la restaurer ensuite.`
        }
        confirmLabel="Archiver"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={async () => {
          setDeleteOpen(false);
          await archiveMaterialToCorbeille(row, onChanged);
        }}
      />
    </div>
  );
}

'use client';

import { Copy, Pencil, RefreshCw, Trash2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      className={cn('mp-row-action-btn', danger && 'is-danger', disabled && 'is-disabled')}
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
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

export type AdminRowActionsProps = {
  itemLabel: string;
  canEdit?: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  /** Masque le bouton Dupliquer */
  hideDuplicate?: boolean;
  /** Masque le bouton Modifier */
  hideEdit?: boolean;
  editTitle?: string;
  editLabel?: string;
  /** Icône du 1er bouton — `sync` = RefreshCw (Resync POS / Publier) */
  editIcon?: 'edit' | 'sync';
  duplicateTitle?: string;
  deleteTitle?: string;
  deleteLabel?: string;
  className?: string;
};

/**
 * Actions ligne standard — Modifier · Dupliquer · Supprimer (corbeille).
 * Classes : `.mp-row-actions` / `.mp-row-action-btn` (master-data.css).
 */
export function AdminRowActions({
  itemLabel,
  canEdit = true,
  onEdit,
  onDuplicate,
  onDelete,
  hideDuplicate = false,
  hideEdit = false,
  editTitle = 'Modifier',
  editLabel,
  editIcon = 'edit',
  duplicateTitle = 'Dupliquer',
  deleteTitle = 'Supprimer vers la corbeille',
  deleteLabel,
  className,
}: AdminRowActionsProps) {
  const denied = 'Action non autorisée';
  const EditIcon = editIcon === 'sync' ? RefreshCw : Pencil;

  return (
    <div className={cn('mp-row-actions', className)}>
      {!hideEdit ? (
        <ActionBtn
          icon={EditIcon}
          title={!canEdit || !onEdit ? denied : editTitle}
          label={editLabel ?? `${editTitle} ${itemLabel}`}
          disabled={!canEdit || !onEdit}
          onClick={onEdit}
        />
      ) : null}
      {!hideDuplicate ? (
        <ActionBtn
          icon={Copy}
          title={!canEdit || !onDuplicate ? denied : duplicateTitle}
          label={`Dupliquer ${itemLabel}`}
          disabled={!canEdit || !onDuplicate}
          onClick={onDuplicate}
        />
      ) : null}
      <ActionBtn
        icon={Trash2}
        title={!canEdit || !onDelete ? denied : deleteTitle}
        label={deleteLabel ?? `${deleteTitle} ${itemLabel}`}
        disabled={!canEdit || !onDelete}
        danger
        onClick={onDelete}
      />
    </div>
  );
}

/** En-tête de colonne ACTIONS — centré, uppercase. */
export function AdminActionsColumnHeader({ label = 'Actions' }: { label?: string }) {
  return (
    <th className="orion-admin-actions-th" scope="col">
      {label}
    </th>
  );
}

'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { MaterialPriceUnifiedRow } from './types';
import { archiveMaterialToCorbeille } from './MaterialPriceRowActions';

type UnifiedRow = MaterialPriceUnifiedRow;

export async function deleteMaterialRow(row: UnifiedRow, onChanged: () => void): Promise<void> {
  await archiveMaterialToCorbeille(row, onChanged);
}

type Props = {
  row: UnifiedRow;
  canEdit: boolean;
  onChanged: () => void;
};

export function MaterialRowDeleteButton({ row, canEdit, onChanged }: Props) {
  const isPrintOnly = row.id.startsWith('print-');
  const [open, setOpen] = useState(false);
  if (!canEdit || isPrintOnly) {
    return <span className="orion-master-muted">—</span>;
  }

  return (
    <>
      <button
        type="button"
        className="mp-row-delete-btn"
        title="Supprimer"
        aria-label={`Supprimer ${row.name}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Confirmer la suppression"
        description={`Cette action va supprimer « ${row.name} ». La matière ira en corbeille.`}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={async () => {
          setOpen(false);
          await archiveMaterialToCorbeille(row, onChanged, true);
        }}
      />
    </>
  );
}

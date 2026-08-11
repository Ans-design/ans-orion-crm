'use client';

/**
 * Alias legacy — la modification rapide passe par la fiche matière unifiée.
 * Conservé pour les imports historiques (zéro suppression de surface).
 */

import { MaterialSheet } from './MaterialSheet';
import type { MaterialPriceUnifiedRow } from './types';

type Props = {
  row: MaterialPriceUnifiedRow | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function MaterialQuickEditModal({ row, canEdit, onClose, onSaved }: Props) {
  if (!row) return null;
  return (
    <MaterialSheet
      open
      mode="edit"
      row={row}
      canEdit={canEdit}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

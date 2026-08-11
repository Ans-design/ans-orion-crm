'use client';

/**
 * Alias legacy — la fiche détail passe par MaterialSheet (consultation / édition).
 * Conservé pour les imports historiques (zéro suppression de surface).
 */

import { useState } from 'react';
import { MaterialSheet, type MaterialSheetMode } from './MaterialSheet';
import type { MaterialPriceUnifiedRow } from './types';

type Props = {
  row: MaterialPriceUnifiedRow | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDuplicate?: () => void;
};

export function MaterialPriceEditDrawer({ row, canEdit, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<MaterialSheetMode>(canEdit ? 'view' : 'view');
  if (!row) return null;
  return (
    <MaterialSheet
      open
      mode={mode}
      row={row}
      canEdit={canEdit}
      onClose={onClose}
      onModeChange={setMode}
      onSaved={onSaved}
    />
  );
}

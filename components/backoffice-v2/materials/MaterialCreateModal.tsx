'use client';

/**
 * Création matière — délègue à la fiche unifiée MaterialSheet (mode create).
 * Conservé comme point d’entrée legacy (MaterialNewMaterialMenu, BaseMaterialsTable).
 */

import { MaterialSheet } from '../pricing-custom/material-prices/MaterialSheet';
import { AppButton } from '@/components/ui/app-ui';
import { Plus } from 'lucide-react';
import { useState } from 'react';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

/** Formulaire création manuelle — ouvert depuis « + Nouvelle matière » */
export function MaterialCreateManualDialog({ open, onClose, onCreated }: DialogProps) {
  return (
    <MaterialSheet
      open={open}
      mode="create"
      row={null}
      canEdit
      onClose={onClose}
      onSaved={() => {
        onCreated();
      }}
      onCreatedRow={() => {
        onCreated();
        onClose();
      }}
    />
  );
}

export function MaterialCreateModal({ canEdit, onCreated }: { canEdit: boolean; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;
  return (
    <>
      <AppButton
        type="button"
        variant="default"
        className="orion-material-new-btn"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Nouvelle matière
      </AppButton>
      <MaterialCreateManualDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          onCreated();
        }}
      />
    </>
  );
}

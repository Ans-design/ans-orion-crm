'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSameClient: () => void;
  onOtherClient: () => void;
};

export function PosNewOrderDialog({ open, onOpenChange, onSameClient, onOtherClient }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Nouvelle commande</AlertDialogTitle>
          <AlertDialogDescription>
            Le panier sera réinitialisé. Souhaitez-vous conserver le client actuel ou en choisir un autre ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="mt-0">Annuler</AlertDialogCancel>
          <button
            type="button"
            onClick={() => {
              onOtherClient();
              onOpenChange(false);
            }}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Autre client
          </button>
          <button
            type="button"
            onClick={() => {
              onSameClient();
              onOpenChange(false);
            }}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Pour ce client
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

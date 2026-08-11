'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { AppButton } from '@/components/ui/app-ui';
import { ORION_RADIUS } from '@/lib/design/tokens';
import { cn } from '@/lib/utils';

type AppFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  maxWidthClass?: string;
};

/** Modale formulaire unifiée ANS ORION (7px, Dialog Radix). */
export function AppFormModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  maxWidthClass = 'max-w-md',
}: AppFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(maxWidthClass, className)}
        style={{ borderRadius: ORION_RADIUS.md }}
      >
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-base">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-3">{children}</div>
        {footer ? (
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type FooterProps = {
  onCancel: () => void;
  onSubmit: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  submitDisabled?: boolean;
  submitVariant?: 'default' | 'destructive' | 'outline';
  loading?: boolean;
};

export function AppFormModalFooter({
  onCancel,
  onSubmit,
  cancelLabel = 'Annuler',
  submitLabel = 'Enregistrer',
  submitDisabled,
  submitVariant = 'default',
  loading,
}: FooterProps) {
  return (
    <>
      <AppButton type="button" variant="outline" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </AppButton>
      <AppButton
        type="button"
        variant={submitVariant}
        onClick={onSubmit}
        disabled={submitDisabled || loading}
      >
        {submitLabel}
      </AppButton>
    </>
  );
}

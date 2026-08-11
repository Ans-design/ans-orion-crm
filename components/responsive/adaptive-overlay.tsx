'use client';

import type { ReactNode } from 'react';
import { useResponsiveMode } from '@/lib/responsive/use-responsive-mode';
import {
  resolveOverlayPresentation,
  type OverlayTask,
} from '@/lib/responsive/resolve-overlay';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: OverlayTask;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Force présentation (tests / exceptions documentées) */
  forcePresentation?: ReturnType<typeof resolveOverlayPresentation>;
};

/**
 * Overlay piloté par mode + type de tâche — primitives Dialog/Sheet/Alert existantes.
 */
export function AdaptiveOverlay({
  open,
  onOpenChange,
  task,
  title,
  description,
  children,
  className,
  forcePresentation,
}: Props) {
  const { mode } = useResponsiveMode();
  const presentation = forcePresentation ?? resolveOverlayPresentation(mode, task);

  if (presentation === 'alert') {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className={cn('max-h-[min(90dvh,900px)] overflow-y-auto', className)}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          {children}
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (presentation === 'dialog') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn('max-h-[min(90dvh,900px)] overflow-y-auto', className)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  const side = presentation === 'sheet-bottom' ? 'bottom' : 'right';
  const sheetClass =
    presentation === 'fullscreen'
      ? 'inset-0 h-[100dvh] w-full max-w-none rounded-none'
      : presentation === 'sheet-bottom'
        ? 'max-h-[min(88dvh,900px)] rounded-t-[8px]'
        : 'h-full max-h-[100dvh]';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={cn(sheetClass, 'overflow-y-auto', className)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="mt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

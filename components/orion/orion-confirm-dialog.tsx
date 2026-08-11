'use client';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export type OrionConfirmDialogProps = React.ComponentProps<typeof ConfirmDialog>;

export function OrionConfirmDialog(props: OrionConfirmDialogProps) {
  return <ConfirmDialog {...props} />;
}

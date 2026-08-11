'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type OrionButtonProps = ButtonProps & {
  authVariant?: 'primary' | 'gold';
};

/** Bouton auth — styles ANS ORION (primary / gold). */
export function OrionButton({
  authVariant = 'primary',
  className,
  size = 'lg',
  ...props
}: OrionButtonProps) {
  return (
    <Button
      size={size}
      className={cn(
        'w-full h-11',
        authVariant === 'gold' ? 'ans-btn-gold' : 'ans-btn-primary',
        className,
      )}
      {...props}
    />
  );
}

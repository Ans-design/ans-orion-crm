import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ORION_CARD_PAD } from '@/lib/design/spacing-system';

export function OrionCard({
  children,
  className,
  interactive = false,
  elevated = false,
  padded = true,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  elevated?: boolean;
  padded?: boolean;
  as?: ElementType;
}) {
  return (
    <Tag
      className={cn(
        'orion-ds-card',
        interactive && 'orion-ds-card--interactive orion-ds-hover cursor-pointer',
        elevated && 'orion-ds-card--elevated',
        padded && ORION_CARD_PAD,
        className,
      )}
    >
      {children}
    </Tag>
  );
}

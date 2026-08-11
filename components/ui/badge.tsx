import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/85',
        secondary:
          'border-[var(--border-standard)] bg-[var(--bg-chip)] text-[var(--neutral-badge-text)] hover:bg-[var(--bg-row-hover)]',
        destructive:
          'border-[color-mix(in_srgb,var(--destructive)_22%,transparent)] bg-[var(--danger-bg)] text-[var(--danger-text)]',
        outline:
          'border-[var(--border-standard)] bg-transparent text-foreground hover:bg-[var(--bg-row-hover)]',
        success:
          'border-[color-mix(in_srgb,var(--success)_22%,transparent)] bg-[var(--success-bg)] text-[var(--success-text)]',
        warning:
          'border-[color-mix(in_srgb,var(--warning)_24%,transparent)] bg-[var(--warning-bg)] text-[var(--warning-text)]',
        info:
          'border-[color-mix(in_srgb,var(--info)_22%,transparent)] bg-[var(--info-bg)] text-[var(--info-text)]',
        neutral:
          'border-[var(--border-standard)] bg-[var(--bg-chip)] text-[var(--neutral-badge-text)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

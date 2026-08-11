import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-sm transition-all duration-fast placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)]',
  {
    variants: {
      variant: {
        default: 'border-input hover:border-ring/50 focus-visible:border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        error: 'border-input text-destructive font-semibold hover:border-ring/40 focus-visible:border-[var(--border-focus-field,#94a3b8)] focus-visible:ring-2 focus-visible:ring-slate-400/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        success: 'border-input text-emerald-600 dark:text-emerald-400 font-medium hover:border-emerald-500/40 focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        ghost: 'border-transparent bg-muted/50 hover:bg-muted focus-visible:bg-background focus-visible:border-input focus-visible:ring-2 focus-visible:ring-slate-400/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };

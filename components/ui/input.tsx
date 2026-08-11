import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-lg border bg-[var(--bg-card)] text-sm text-[var(--text-main)] transition-all duration-fast file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-placeholder)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)]",
  {
    variants: {
      variant: {
        default: "border-[var(--border-standard)] hover:border-[var(--border-active-soft)] focus-visible:border-[var(--border-active)] focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        error: "border-[var(--border-standard)] text-destructive font-semibold hover:border-[var(--border-active-soft)] focus-visible:border-[var(--border-focus-field,#94a3b8)] focus-visible:ring-2 focus-visible:ring-slate-400/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        success: "border-[var(--border-standard)] text-emerald-600 dark:text-emerald-400 font-medium hover:border-emerald-500/40 focus-visible:border-emerald-500/50 focus-visible:ring-2 focus-visible:ring-emerald-500/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        ghost: "border-transparent bg-muted/50 hover:bg-muted focus-visible:bg-background focus-visible:border-input focus-visible:ring-2 focus-visible:ring-slate-400/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      },
      size: {
        default: "h-10 px-3 py-2",
        sm: "h-8 px-2.5 py-1 text-xs rounded-md",
        lg: "h-12 px-4 py-3 text-base rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, size, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
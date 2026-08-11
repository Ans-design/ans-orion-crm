import * as React from "react"
import { Slot, Slottable } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-ui,7px)] text-[11px] font-semibold leading-none transition-all duration-fast orion-ux-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)] disabled:border disabled:border-[var(--app-border)] disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md font-semibold",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md font-semibold",
        outline:
          "border-0 bg-[color-mix(in_srgb,var(--bg-card-soft,#f8fafc)_92%,transparent)] text-[var(--app-text)] shadow-none hover:bg-[color-mix(in_srgb,var(--brand-primary,#cc0033)_8%,var(--bg-card,#fff))] hover:text-[var(--app-text)]",
        secondary:
          "border-0 bg-[color-mix(in_srgb,var(--bg-card-soft,#f8fafc)_92%,transparent)] text-[var(--app-text)] shadow-none hover:bg-[var(--bg-hover)]",
        ghost:
          "border-0 text-[var(--app-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--app-text)]",
        "glass-dark":
          "bg-white/10 backdrop-blur-md border-0 text-foreground shadow-sm hover:bg-white/25 hover:shadow-lg focus-visible:ring-white/50 focus-visible:ring-ring/0",
        "glass-light":
          "bg-surface-card/70 backdrop-blur-md border-0 text-foreground shadow-sm hover:bg-surface-hover hover:shadow-md focus-visible:ring-[var(--primary)]/30 focus-visible:ring-ring/0",
        link:
          "text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:ring-0 focus-visible:ring-offset-0",
        warning:
          "bg-[var(--app-warning)] text-slate-900 shadow-sm hover:brightness-105 font-semibold",
      },
      size: {
        default: "h-8 min-h-8 max-h-8 px-4 py-0",
        xs: "h-8 min-h-8 max-h-8 px-4 py-0",
        sm: "h-8 min-h-8 max-h-8 px-4 py-0",
        lg: "h-8 min-h-8 max-h-8 px-4 py-0",
        icon: "h-8 w-8 min-h-8 max-h-8 p-0",
        "icon-sm": "h-8 w-8 min-h-8 max-h-8 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <Slottable>{loading && asChild ? null : children}</Slottable>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
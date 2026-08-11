import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-[var(--orion-radius)] border-0 bg-[var(--bg-card)] text-card-foreground shadow-[var(--shadow-card)] dark:shadow-none dark:border dark:border-[var(--border-soft)]",
  {
    variants: {
      variant: {
        default: "",
        interactive:
          "transition-all duration-normal hover:bg-[var(--bg-card-soft)] hover:border-[var(--border-standard)]",
        "glass-dark":
          "bg-white/10 backdrop-blur-xl border border-white/20 shadow-md [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.15)]",
        "glass-dark-interactive":
          "bg-white/10 backdrop-blur-xl border border-white/20 shadow-md [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.15)] transition-all duration-normal hover:bg-white/15 hover:border-white/30 hover:shadow-lg hover:-translate-y-0.5",
        "glass-light":
          "bg-surface-card/80 backdrop-blur-md border border-[var(--border-soft)] shadow-sm text-foreground",
        "glass-light-interactive":
          "bg-surface-card/80 backdrop-blur-md border border-[var(--border-soft)] shadow-sm text-foreground transition-all duration-normal hover:bg-surface-hover hover:border-[var(--border)] hover:shadow-md hover:-translate-y-0.5",
        ghost:
          "border-transparent shadow-none bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-semibold leading-snug tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, cardVariants, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border-2 px-2.5 py-0.5 text-xs font-mono uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary/10 text-primary",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive bg-destructive/10 text-destructive",
        outline:
          "border-border text-foreground",
        processing:
          "border-line bg-line/10 text-line animate-blueprint-pulse",
        success:
          "border-success bg-success/10 text-success",
        warning:
          "border-annotation bg-annotation/10 text-annotation",
        draft:
          "border-muted-foreground bg-muted text-muted-foreground border-dashed",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

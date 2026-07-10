import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-xl border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-150 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_0_0_0_rgba(59,130,246,0)] hover:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] dark:hover:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:dark:bg-opacity-70 dark:hover:bg-opacity-70",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 hover:bg-destructive/15 dark:hover:bg-destructive/25 shadow-none",
        outline:
          "border-border text-foreground hover:bg-muted dark:hover:bg-muted/50 shadow-none",
        ghost:
          "hover:bg-muted/80 hover:text-muted-foreground dark:hover:bg-muted/50 shadow-none",
        link: "text-primary underline-offset-4 hover:underline shadow-none",
        muted: "bg-muted text-muted-foreground dark:bg-muted/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

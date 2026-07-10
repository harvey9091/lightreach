import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-transparent bg-input/50 px-3 py-2 text-base transition-all duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-input focus-visible:shadow-[0_0_0_3px_oklch(0.60_0.22_255/0.08)] dark:focus-visible:shadow-[0_0_0_3px_oklch(0.60_0.22_255/0.12)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

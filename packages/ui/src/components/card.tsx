import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-[min(var(--radius-4xl),20px)] bg-card text-card-foreground shadow-[0_1px_4px_rgba(0,0,0,0.04),0_0_1px_rgba(0,0,0,0.02)] ring-1 ring-foreground/[0.04] py-(--card-spacing) text-sm transition-all duration-300 [--card-spacing:--spacing(5)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] dark:shadow-[0_0_0_0_rgba(0,0,0,0)] dark:shadow-sm dark:ring-foreground/[0.06] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:ring-foreground/[0.08] dark:hover:ring-foreground/[0.12] hover:-translate-y-[1px] *:[img:first-child]:rounded-t-[min(var(--radius-4xl),20px)] *:[img:last-child]:rounded-b-[min(var(--radius-4xl),20px)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-t-[min(var(--radius-4xl),20px)] px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-heading text-base font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-[min(var(--radius-4xl),20px)] px-(--card-spacing) [.border-t]:pt-(--card-spacing)]",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

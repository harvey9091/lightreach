"use client"

import * as React from "react"
import { useAppearance } from "@/hooks/use-appearance"
import { cn } from "@workspace/ui/lib/utils"
import { IconGripVertical } from "@tabler/icons-react"
import {
  SidebarProvider,
} from "@workspace/ui/components/sidebar"

const PERSIST_KEY = "lightreach-sidebar-width"
const SNAP_WIDTHS = [220, 260, 300, 340] as const

function loadPersistedWidth(): number {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (raw) {
      const w = parseInt(raw, 10)
      if ((SNAP_WIDTHS as readonly number[]).includes(w)) return w
    }
  } catch {
    // ignore localStorage errors
  }
  return 260
}

export function ResizableSidebar({ children, className, ...props }: React.ComponentProps<"div">) {
  const { settings, update } = useAppearance()
  const [width, setWidth] = React.useState<number>(loadPersistedWidth)
  const [isDragging, setIsDragging] = React.useState(false)
  const dragRef = React.useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 260 })

  React.useEffect(() => {
    const arr = SNAP_WIDTHS as readonly number[]
    const snapped = arr.reduce((prev: number, curr: number) =>
      Math.abs(curr - settings.sidebarWidth) < Math.abs(prev - settings.sidebarWidth) ? curr : prev,
    )
    setWidth(snapped)
  }, [settings.sidebarWidth])

  React.useEffect(() => {
    if (!isDragging) {
      try { localStorage.setItem(PERSIST_KEY, String(width)) } catch {}
      update({ sidebarWidth: width })
    }
  }, [width, isDragging, update])

  React.useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent | TouchEvent) => {
      const cx = "touches" in e ? (e as TouchEvent).touches[0]?.clientX ?? 0 : (e as MouseEvent).clientX
      const { startX, startWidth } = dragRef.current
      const raw = startWidth + (cx - startX)
      const arr = SNAP_WIDTHS as readonly number[]
      const snapped = arr.reduce((prev: number, curr: number) =>
        Math.abs(curr - raw) < Math.abs(prev - raw) ? curr : prev,
      )
      setWidth(snapped)
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("touchmove", onMove, { passive: true })
    window.addEventListener("touchend", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onUp)
    }
  }, [isDragging])

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const cx = "touches" in e ? (e as React.TouchEvent).touches[0]?.clientX ?? 0 : (e as React.MouseEvent).clientX
    dragRef.current = { startX: cx, startWidth: width }
    setIsDragging(true)
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${width}px`,
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
      className={cn("group/sidebar-wrapper", className)}
      {...props}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        tabIndex={0}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className={cn(
          "fixed inset-y-0 z-40 hidden w-4 cursor-ew-resize flex-col items-center justify-center transition-opacity duration-150 md:flex",
          isDragging ? "opacity-100" : "opacity-0 group-hover/sidebar-wrapper:opacity-100",
        )}
      >
        <div
          className="flex size-5 items-center justify-center rounded-full border border-border/40 bg-background/80 shadow-sm backdrop-blur-sm transition-colors hover:border-foreground/15 dark:bg-card/80"
          style={{ left: `calc(${width}px - 10px)` }}
        >
          <IconGripVertical className="text-muted-foreground size-3" />
        </div>
      </div>
    </SidebarProvider>
  )
}

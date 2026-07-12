"use client"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@workspace/ui/components/button"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Separator } from "@workspace/ui/components/separator"
import { IconSun, IconMoon, IconRocket } from "@tabler/icons-react"
import { usePathname } from "next/navigation"

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/connections": "Connections",
  "/leads": "Leads",
  "/sequences": "Sequences",
  "/templates": "Templates",
  "/campaigns": "Campaigns",
  "/emails": "Emails",
  "/inbox": "Inbox",
  "/analytics": "Analytics",
  "/mcp": "MCP",
  "/settings": "Settings",
}

const routeBreadcrumbs: Record<string, string[]> = {
  "/sequences/new": ["Sequences", "New"],
  "/sequences": ["Sequences"],
  "/campaigns/new": ["Campaigns", "New"],
  "/campaigns": ["Campaigns"],
  "/mcp": ["Integrations", "MCP"],
}

export function AppHeader() {
  const { resolvedTheme, setTheme } = useTheme()
  const pathname = usePathname()

  const label =
    Object.entries(routeLabels).find(([route]) =>
      route === "/" ? pathname === "/" : pathname.startsWith(route),
    )?.[1] ?? "Lightreach"

  const crumbs = routeBreadcrumbs[pathname] ?? [label]

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/70 px-4 backdrop-blur-2xl backdrop-brightness-125">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 h-8 w-8 rounded-lg" />
        <Separator orientation="vertical" className="mr-1 h-4 bg-border/60" />
        <div className="flex items-center gap-2">
          {crumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-2">
              {idx > 0 && (
                <span className="text-muted-foreground/40 text-xs">/</span>
              )}
              <span
                className={`text-sm ${
                  idx === crumbs.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }
          aria-label="Toggle theme"
          className="rounded-lg"
        >
          {resolvedTheme === "dark" ? (
            <IconSun className="size-4 text-amber-400" />
          ) : (
            <IconMoon className="size-4 text-indigo-500" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}

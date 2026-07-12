"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { Label } from "@workspace/ui/components/label"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  IconShield,
  IconSettings,
  IconPalette,
  IconSend,
  IconTypeface,
  IconLayoutSidebar,
  IconBlur,
  IconSparkles,
  IconBoxMultiple,
  IconGitBranch,
  IconLoader,
  IconDeviceFloppy,
  IconChartArea,
  IconLink,
  IconEye,
} from "@tabler/icons-react"
import { useAppearance, type AppearanceSettings } from "@/hooks/use-appearance"
import { toast } from "sonner"

const themes = [
  { id: "hermes-dark", name: "Hermes Dark", bg: "#0A0A0B", accent: "#3B82F6", text: "#E4E4E7" },
  { id: "midnight", name: "Midnight", bg: "#0F172A", accent: "#6366F1", text: "#F1F5F9" },
  { id: "graphite", name: "Graphite", bg: "#18181B", accent: "#8B5CF6", text: "#FAFAFA" },
  { id: "slate", name: "Slate", bg: "#1E293B", accent: "#3B82F6", text: "#F8FAFC" },
  { id: "oled", name: "OLED", bg: "#000000", accent: "#3B82F6", text: "#FFFFFF" },
  { id: "nord", name: "Nord", bg: "#2E3440", accent: "#88C0D0", text: "#ECEFF4" },
  { id: "dracula", name: "Dracula", bg: "#282A36", accent: "#BD93F9", text: "#F8F8F2" },
  { id: "catppuccin-mocha", name: "Catppuccin Mocha", bg: "#1E1E2E", accent: "#CBA6F7", text: "#CDD6F4" },
  { id: "tokyo-night", name: "Tokyo Night", bg: "#1A1B26", accent: "#7AA2F7", text: "#C0CAF5" },
  { id: "github-dark", name: "GitHub Dark", bg: "#0D1117", accent: "#58A6FF", text: "#C9D1D9" },
]

const encKeySet = !!process.env["APP_ENCRYPTION_KEY"]

function AppearanceControls() {
  const { settings, update, dirty, persist } = useAppearance()
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      persist(settings)
      setSaving(false)
      toast.success("Preferences saved")
    }, 400)
  }

  const handleReset = () => {
    const defaults: AppearanceSettings = {
      theme: "hermes-dark",
      radius: 12,
      fontSize: 14,
      sidebarWidth: 260,
      animationSpeed: 50,
      compactMode: false,
      glassMode: false,
      sidebarTransparency: false,
      highDensity: false,
    }
    Object.keys(defaults).forEach((key) => {
      update({ [key]: (defaults as AppearanceSettings)[key as keyof AppearanceSettings] })
    })
    toast.success("Preferences reset to defaults")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
            <IconTypeface className="text-primary size-4" />
          </div>
          <div>
            <CardTitle className="text-heading">Appearance controls</CardTitle>
            <CardDescription className="mt-0.5">
              Fine-tune the interface to your preference.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="radius" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Border radius
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="radius"
                type="range"
                min={0}
                max={24}
                value={settings.radius}
                onChange={(e) => update({ radius: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground font-mono w-8 text-right">{settings.radius}px</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-size" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Font size
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="font-size"
                type="range"
                min={12}
                max={16}
                value={settings.fontSize}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground font-mono w-8 text-right">{settings.fontSize}px</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sidebar-width" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sidebar width
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="sidebar-width"
                type="range"
                min={220}
                max={340}
                step={20}
                value={settings.sidebarWidth}
                onChange={(e) => update({ sidebarWidth: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground font-mono w-10 text-right">{settings.sidebarWidth}px</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="animation-speed" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Animation speed
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="animation-speed"
                type="range"
                min={0}
                max={100}
                value={settings.animationSpeed}
                onChange={(e) => update({ animationSpeed: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground font-mono w-8 text-right">{settings.animationSpeed}%</span>
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBoxMultiple className="text-muted-foreground size-4" />
              <div>
                <Label htmlFor="compact-mode" className="text-sm font-medium">
                  Compact mode
                </Label>
                <p className="text-muted-foreground text-xs">Reduce spacing and padding</p>
              </div>
            </div>
            <Switch
              id="compact-mode"
              checked={settings.compactMode}
              onCheckedChange={(v) => update({ compactMode: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBlur className="text-muted-foreground size-4" />
              <div>
                <Label htmlFor="glass-effect" className="text-sm font-medium">
                  Glass effect
                </Label>
                <p className="text-muted-foreground text-xs">Enable glassmorphism on cards</p>
              </div>
            </div>
            <Switch
              id="glass-effect"
              checked={settings.glassMode}
              onCheckedChange={(v) => update({ glassMode: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconLayoutSidebar className="text-muted-foreground size-4" />
              <div>
                <Label htmlFor="sidebar-transparency" className="text-sm font-medium">
                  Sidebar transparency
                </Label>
                <p className="text-muted-foreground text-xs">Blur the sidebar background</p>
              </div>
            </div>
            <Switch
              id="sidebar-transparency"
              checked={settings.sidebarTransparency}
              onCheckedChange={(v) => update({ sidebarTransparency: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconSparkles className="text-muted-foreground size-4" />
              <div>
                <Label htmlFor="density" className="text-sm font-medium">
                  High density
                </Label>
                <p className="text-muted-foreground text-xs">Fit more content per screen</p>
              </div>
            </div>
            <Switch
              id="density"
              checked={settings.highDensity}
              onCheckedChange={(v) => update({ highDensity: v })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset to defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving} className="gap-1.5">
            {saving ? (
              <IconLoader className="size-3.5 animate-spin" />
            ) : (
              <IconDeviceFloppy className="size-3.5" />
            )}
            {saving ? "Saving..." : "Save preferences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TrackingControls() {
  const [openTracking, setOpenTracking] = useState(true)
  const [linkTracking, setLinkTracking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/settings/tracking")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.enable_open_tracking === "boolean") setOpenTracking(data.enable_open_tracking)
        if (typeof data.enable_link_tracking === "boolean") setLinkTracking(data.enable_link_tracking)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch("/api/settings/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable_open_tracking: openTracking, enable_link_tracking: linkTracking }),
      })
      toast.success("Tracking preferences saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
            <IconChartArea className="text-primary size-4" />
          </div>
          <div>
            <CardTitle className="text-heading">Tracking</CardTitle>
            <CardDescription className="mt-0.5">
              Control email open and link click tracking for sent campaigns.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IconEye className="text-muted-foreground size-4" />
            <div>
              <Label htmlFor="open-tracking" className="text-sm font-medium">
                Enable open tracking
              </Label>
              <p className="text-muted-foreground text-xs">
                Appends a 1×1 pixel to HTML emails to detect opens. Note: some
                privacy tools (Apple MPP, corporate scanners) may inflate counts.
              </p>
            </div>
          </div>
          <Switch id="open-tracking" checked={openTracking} onCheckedChange={setOpenTracking} />
        </div>

        <Separator className="bg-border" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IconLink className="text-muted-foreground size-4" />
            <div>
              <Label htmlFor="link-tracking" className="text-sm font-medium">
                Enable link tracking
              </Label>
              <p className="text-muted-foreground text-xs">
                Rewrites every HTTP/HTTPS link in the email body to route clicks
                through Lightreach. Disable if your domains are listed in the
                tracking blacklist.
              </p>
            </div>
          </div>
          <Switch id="link-tracking" checked={linkTracking} onCheckedChange={setLinkTracking} />
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? (
              <IconLoader className="size-3.5 animate-spin" />
            ) : (
              <IconDeviceFloppy className="size-3.5" />
            )}
            {saving ? "Saving..." : "Save tracking preferences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { settings, update } = useAppearance()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-title">Settings</h1>
        <p className="text-body mt-1">
          App-level configuration, defaults, and appearance.
        </p>
      </div>

      <Tabs defaultValue="environment" className="w-full">
        <TabsList variant="default" className="w-full sm:w-auto">
          <TabsTrigger value="environment" className="gap-1.5">
            <IconShield className="size-3.5" />
            <span className="hidden sm:inline">Environment</span>
          </TabsTrigger>
          <TabsTrigger value="sending" className="gap-1.5">
            <IconSend className="size-3.5" />
            <span className="hidden sm:inline">Sending</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <IconPalette className="size-3.5" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-1.5">
            <IconGitBranch className="size-3.5" />
            <span className="hidden sm:inline">About</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Environment ──────────────────────────────────────────── */}
        <TabsContent value="environment" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
                  <IconShield className="text-primary size-4" />
                </div>
                <div>
                  <CardTitle className="text-heading">Environment status</CardTitle>
                  <CardDescription className="mt-0.5">
                    Required environment variables for Lightreach to function.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3.5 transition-colors hover:bg-muted/30">
                <div>
                  <p className="text-sm font-medium font-mono">APP_ENCRYPTION_KEY</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    AES-256 key for SMTP password encryption. 64 hex characters.
                  </p>
                </div>
                {encKeySet ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 gap-1.5">
                    <span className="status-dot status-dot-success" />
                    Set
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/10 text-destructive border border-destructive/20 gap-1.5">
                    <span className="status-dot status-dot-error" />
                    Missing
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3.5 transition-colors hover:bg-muted/30">
                <div>
                  <p className="text-sm font-medium font-mono">DATABASE_URL</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    SQLite database path. Defaults to <code className="font-mono text-xs">file:./data.db</code>.
                  </p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 gap-1.5">
                  <span className="status-dot status-dot-success" />
                  {process.env["DATABASE_URL"] ?? "file:./data.db (default)"}
                </Badge>
              </div>

              {!encKeySet && (
                <div className="bg-destructive/5 border-destructive/20 rounded-xl border p-4">
                  <p className="text-sm font-medium text-destructive">Action required</p>
                  <p className="text-muted-foreground mt-1.5 text-xs">
                    Generate a key and add it to <code className="font-mono text-xs">.env.local</code>:
                  </p>
                  <pre className="bg-muted/80 mt-3 rounded-lg p-3 font-mono text-xs">
                    openssl rand -hex 32
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sending defaults ─────────────────────────────────────── */}
        <TabsContent value="sending" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
                  <IconSettings className="text-primary size-4" />
                </div>
                <div>
                  <CardTitle className="text-heading">Sending defaults</CardTitle>
                  <CardDescription className="mt-0.5">
                    Default values used when creating new campaigns.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="send-start" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Send window start
                  </Label>
                  <Input id="send-start" type="time" defaultValue="09:00" disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="send-end" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Send window end
                  </Label>
                  <Input id="send-end" type="time" defaultValue="17:00" disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min-delay" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Min delay between sends (seconds)
                  </Label>
                  <Input id="min-delay" type="number" defaultValue={60} min={10} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max-delay" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Max delay between sends (seconds)
                  </Label>
                  <Input id="max-delay" type="number" defaultValue={300} min={10} disabled />
                </div>
              </div>

              <Separator className="my-6 bg-border" />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weekend-send" className="text-sm font-medium">
                    Allow weekend sends
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Enable Saturday/Sunday in the default day-of-week schedule.
                  </p>
                </div>
                <Switch id="weekend-send" disabled />
              </div>

              <Separator className="my-6 bg-border" />

              <div className="flex justify-end">
                <Button size="sm" disabled>
                  Save defaults
                </Button>
              </div>
            </CardContent>
          </Card>

          <TrackingControls />
        </TabsContent>

        {/* ── Appearance ──────────────────────────────────────────── */}
        <TabsContent value="appearance" className="mt-6 space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
                  <IconPalette className="text-primary size-4" />
                </div>
                <div>
                  <CardTitle className="text-heading">Theme</CardTitle>
                  <CardDescription className="mt-0.5">
                    Choose your preferred color scheme. Press <kbd className="bg-muted rounded-md px-1.5 py-0.5 font-mono text-xs border border-border">d</kbd> to toggle dark/light mode.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => update({ theme: theme.id as AppearanceSettings["theme"] })}
                    className={[
                      "group flex flex-col items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-200",
                      settings.theme === theme.id
                        ? "border-primary/40 bg-primary/5 shadow-[0_0_0_1px_var(--primary-soft)]"
                        : "border-border bg-muted/10 hover:border-foreground/15 hover:bg-muted/20",
                    ].join(" ")}
                  >
                    <div
                      className="flex size-10 items-center justify-center rounded-full border-2 border-white/10 shadow-lg transition-transform duration-200 group-hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.accent}22 100%)`,
                      }}
                    >
                      <div className="flex gap-0.5">
                        <div className="h-2 w-2 rounded-full" style={{ background: theme.accent }} />
                        <div className="h-2 w-2 rounded-full" style={{ background: theme.text }} />
                        <div className="h-2 w-2 rounded-full" style={{ background: theme.bg, border: "1px solid " + theme.text + "40" }} />
                      </div>
                    </div>
                    <span className={`text-center text-xs font-medium ${settings.theme === theme.id ? "text-foreground" : "text-foreground/70"}`}>
                      {theme.name}
                    </span>
                    {settings.theme === theme.id && (
                      <span className="text-primary text-[10px] font-medium">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <AppearanceControls />
        </TabsContent>

        {/* ── About ───────────────────────────────────────────────── */}
        <TabsContent value="about" className="mt-6">
          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-xl">
                  <IconGitBranch className="text-primary size-4" />
                </div>
                <CardTitle className="text-heading">About Lightreach</CardTitle>
              </div>
              <CardDescription className="mt-1.5">
                Free, open-source, self-hosted cold-email outreach platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2.5 text-sm">
              <p>No SaaS fees. Your credentials never leave your machine.</p>
              <p className="mt-3">
                <a
                  href="https://github.com/nahumoore/lightreach"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1.5 transition-colors"
                >
                  View on GitHub
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

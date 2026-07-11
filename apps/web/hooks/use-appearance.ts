"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "lightreach-appearance"

export type AppearanceSettings = {
  theme: string
  radius: number
  fontSize: number
  sidebarWidth: number
  animationSpeed: number
  compactMode: boolean
  glassMode: boolean
  sidebarTransparency: boolean
  highDensity: boolean
}

const DEFAULTS: AppearanceSettings = {
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

function loadSettings(): AppearanceSettings {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppearanceSettings>) }
  } catch {
    // ignore localStorage errors
  }
  return DEFAULTS
}

export const SNAP_SIDEBAR_WIDTHS = [220, 260, 300, 340] as const

export const THEME_IDS = [
  "hermes-dark",
  "midnight",
  "graphite",
  "slate",
  "oled",
  "nord",
  "dracula",
  "catppuccin-mocha",
  "tokyo-night",
  "github-dark",
] as const

export function useAppearance() {
  const [settings, setSettings] = useState<AppearanceSettings>(loadSettings)

  const dirty = settings.theme !== DEFAULTS.theme ||
    settings.radius !== DEFAULTS.radius ||
    settings.fontSize !== DEFAULTS.fontSize ||
    settings.sidebarWidth !== DEFAULTS.sidebarWidth ||
    settings.animationSpeed !== DEFAULTS.animationSpeed ||
    settings.compactMode !== DEFAULTS.compactMode ||
    settings.glassMode !== DEFAULTS.glassMode ||
    settings.sidebarTransparency !== DEFAULTS.sidebarTransparency ||
    settings.highDensity !== DEFAULTS.highDensity

  // Apply CSS variables to :root whenever settings change (always live-preview)
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute("data-theme", settings.theme)
    root.style.setProperty("--radius", `${settings.radius / 16}rem`)
    root.style.setProperty("--font-size-base", `${settings.fontSize / 16}rem`)

    const animDuration = 0.1 + (settings.animationSpeed / 100) * 0.4
    root.style.setProperty("--anim-duration", `${animDuration}s`)

    root.classList.toggle("appearance-compact", settings.compactMode)
    root.classList.toggle("appearance-density", settings.highDensity)
    root.classList.toggle("appearance-glass", settings.glassMode)
    root.classList.toggle(
      "appearance-sidebar-transparent",
      settings.sidebarTransparency,
    )
  }, [settings])

  const persist = useCallback((next: AppearanceSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }, [])

  const update = useCallback((partial: Partial<AppearanceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      persist(next)
      return next
    })
  }, [persist])

  const reset = useCallback(() => {
    setSettings(DEFAULTS)
  }, [])

  return { settings, update, persist, reset, dirty, SNAP_SIDEBAR_WIDTHS, THEME_IDS }
}

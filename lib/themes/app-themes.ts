export type AppThemeId = "arcane" | "parchment" | "stone" | "moss" | "sands"

export const APP_THEME_STORAGE_KEY = "dump-stat-app-theme"

export type AppThemeMeta = {
  id: AppThemeId
  label: string
  description: string
  /** Preview swatches for the settings picker */
  swatches: [string, string, string]
}

export const APP_THEMES: AppThemeMeta[] = [
  {
    id: "arcane",
    label: "Arcane",
    description: "Dark purple base with neon lime and magenta highlights",
    swatches: ["oklch(0.62 0.26 290)", "oklch(0.84 0.26 132)", "oklch(0.11 0.015 280)"],
  },
  {
    id: "parchment",
    label: "Parchment",
    description: "Warm paper tones with sepia ink and muted gold",
    swatches: ["oklch(0.52 0.09 65)", "oklch(0.78 0.06 85)", "oklch(0.94 0.02 90)"],
  },
  {
    id: "stone",
    label: "Stone",
    description: "Cool granite grays with slate blue and soft sage",
    swatches: ["oklch(0.48 0.04 250)", "oklch(0.62 0.05 145)", "oklch(0.22 0.01 250)"],
  },
  {
    id: "moss",
    label: "Moss",
    description: "Forest floor greens with bark brown and amber light",
    swatches: ["oklch(0.55 0.1 145)", "oklch(0.72 0.12 85)", "oklch(0.18 0.03 145)"],
  },
  {
    id: "sands",
    label: "Sands",
    description: "Desert warmth with terracotta and sun-baked sand",
    swatches: ["oklch(0.55 0.14 45)", "oklch(0.7 0.08 75)", "oklch(0.25 0.03 55)"],
  },
]

export function isAppThemeId(value: string): value is AppThemeId {
  return APP_THEMES.some((t) => t.id === value)
}

/** Maps legacy stored theme ids (e.g. clay → sands). */
export function normalizeAppThemeId(value: string): AppThemeId | null {
  if (value === "clay") return "sands"
  return isAppThemeId(value) ? value : null
}

export const DEFAULT_APP_THEME: AppThemeId = "parchment"

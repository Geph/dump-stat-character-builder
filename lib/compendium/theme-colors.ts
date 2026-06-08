/** Theme palette slots — values follow the active app theme (see globals.css). */
export type CompendiumThemeColorId =
  | "primary"
  | "secondary"
  | "accent"
  | "lime"
  | "lemon"
  | "orange"
  | "magenta"

export const COMPENDIUM_THEME_COLORS: { id: CompendiumThemeColorId; label: string }[] = [
  { id: "primary", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "accent", label: "Accent" },
  { id: "lime", label: "Lime" },
  { id: "lemon", label: "Lemon" },
  { id: "orange", label: "Orange" },
  { id: "magenta", label: "Magenta" },
]

const COLOR_IDS = new Set<string>(COMPENDIUM_THEME_COLORS.map((c) => c.id))

export function isCompendiumThemeColorId(value: string): value is CompendiumThemeColorId {
  return COLOR_IDS.has(value)
}

export function getCompendiumItemAccentColor(
  item: Record<string, unknown>,
): CompendiumThemeColorId | null {
  const raw = item.accent_color
  if (typeof raw === "string" && isCompendiumThemeColorId(raw)) return raw
  return null
}

const ICON_TEXT: Record<CompendiumThemeColorId, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  lime: "text-lime",
  lemon: "text-lemon",
  orange: "text-orange",
  magenta: "text-magenta",
}

const HOVER_BORDER: Record<CompendiumThemeColorId, string> = {
  primary: "hover:border-primary",
  secondary: "hover:border-secondary",
  accent: "hover:border-accent",
  lime: "hover:border-lime",
  lemon: "hover:border-lemon",
  orange: "hover:border-orange",
  magenta: "hover:border-magenta",
}

const TITLE_HOVER: Record<CompendiumThemeColorId, string> = {
  primary: "hover:text-primary",
  secondary: "hover:text-secondary",
  accent: "hover:text-accent",
  lime: "hover:text-lime",
  lemon: "hover:text-lemon",
  orange: "hover:text-orange",
  magenta: "hover:text-magenta",
}

const EDIT_HOVER: Record<CompendiumThemeColorId, string> = {
  primary: "hover:text-primary hover:border-primary hover:bg-primary/10",
  secondary: "hover:text-secondary hover:border-secondary hover:bg-secondary/10",
  accent: "hover:text-accent hover:border-accent hover:bg-accent/10",
  lime: "hover:text-lime hover:border-lime hover:bg-lime/10",
  lemon: "hover:text-lemon hover:border-lemon hover:bg-lemon/10",
  orange: "hover:text-orange hover:border-orange hover:bg-orange/10",
  magenta: "hover:text-magenta hover:border-magenta hover:bg-magenta/10",
}

const SWATCH_BG: Record<CompendiumThemeColorId, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  lime: "bg-lime",
  lemon: "bg-lemon",
  orange: "bg-orange",
  magenta: "bg-magenta",
}

const SWATCH_RING: Record<CompendiumThemeColorId, string> = {
  primary: "ring-primary",
  secondary: "ring-secondary",
  accent: "ring-accent",
  lime: "ring-lime",
  lemon: "ring-lemon",
  orange: "ring-orange",
  magenta: "ring-magenta",
}

export function compendiumAccentColorStyles(colorId: CompendiumThemeColorId | null) {
  const id = colorId ?? "primary"
  return {
    iconText: ICON_TEXT[id],
    hoverBorder: HOVER_BORDER[id],
    titleHover: TITLE_HOVER[id],
    editHover: EDIT_HOVER[id],
  }
}

export function compendiumThemeColorSwatchClass(
  colorId: CompendiumThemeColorId,
  selected: boolean,
): string {
  return [
    "w-6 h-6 rounded-full border border-border/60 shrink-0 transition-transform hover:scale-110",
    SWATCH_BG[colorId],
    selected ? `ring-2 ring-offset-2 ring-offset-card ${SWATCH_RING[colorId]}` : "",
  ]
    .filter(Boolean)
    .join(" ")
}

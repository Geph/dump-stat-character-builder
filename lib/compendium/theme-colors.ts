/** Theme palette slots — values follow the active app theme (see globals.css). */
export type CompendiumThemeColorId =
  | "primary"
  | "secondary"
  | "accent"
  | "lime"
  | "lemon"
  | "orange"
  | "magenta"
  | "cyan"
  | "sky"
  | "violet"

export const COMPENDIUM_THEME_COLORS: { id: CompendiumThemeColorId; label: string }[] = [
  { id: "primary", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "accent", label: "Accent" },
  { id: "lime", label: "Lime" },
  { id: "lemon", label: "Lemon" },
  { id: "orange", label: "Orange" },
  { id: "magenta", label: "Magenta" },
  { id: "cyan", label: "Cyan" },
  { id: "sky", label: "Sky" },
  { id: "violet", label: "Violet" },
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
  cyan: "text-cyan",
  sky: "text-sky",
  violet: "text-violet",
}

const HOVER_BORDER: Record<CompendiumThemeColorId, string> = {
  primary: "hover:border-primary",
  secondary: "hover:border-secondary",
  accent: "hover:border-accent",
  lime: "hover:border-lime",
  lemon: "hover:border-lemon",
  orange: "hover:border-orange",
  magenta: "hover:border-magenta",
  cyan: "hover:border-cyan",
  sky: "hover:border-sky",
  violet: "hover:border-violet",
}

const TITLE_HOVER: Record<CompendiumThemeColorId, string> = {
  primary: "hover:text-primary",
  secondary: "hover:text-secondary",
  accent: "hover:text-accent",
  lime: "hover:text-lime",
  lemon: "hover:text-lemon",
  orange: "hover:text-orange",
  magenta: "hover:text-magenta",
  cyan: "hover:text-cyan",
  sky: "hover:text-sky",
  violet: "hover:text-violet",
}

const EDIT_HOVER: Record<CompendiumThemeColorId, string> = {
  primary: "hover:text-primary hover:border-primary hover:bg-primary/10",
  secondary: "hover:text-secondary hover:border-secondary hover:bg-secondary/10",
  accent: "hover:text-accent hover:border-accent hover:bg-accent/10",
  lime: "hover:text-lime hover:border-lime hover:bg-lime/10",
  lemon: "hover:text-lemon hover:border-lemon hover:bg-lemon/10",
  orange: "hover:text-orange hover:border-orange hover:bg-orange/10",
  magenta: "hover:text-magenta hover:border-magenta hover:bg-magenta/10",
  cyan: "hover:text-cyan hover:border-cyan hover:bg-cyan/10",
  sky: "hover:text-sky hover:border-sky hover:bg-sky/10",
  violet: "hover:text-violet hover:border-violet hover:bg-violet/10",
}

const SWATCH_BG: Record<CompendiumThemeColorId, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  lime: "bg-lime",
  lemon: "bg-lemon",
  orange: "bg-orange",
  magenta: "bg-magenta",
  cyan: "bg-cyan",
  sky: "bg-sky",
  violet: "bg-violet",
}

const SWATCH_RING: Record<CompendiumThemeColorId, string> = {
  primary: "ring-primary",
  secondary: "ring-secondary",
  accent: "ring-accent",
  lime: "ring-lime",
  lemon: "ring-lemon",
  orange: "ring-orange",
  magenta: "ring-magenta",
  cyan: "ring-cyan",
  sky: "ring-sky",
  violet: "ring-violet",
}

/** Dark strip tinted with the item accent — high contrast for white body text. */
const DETAIL_STRIP_BG: Record<CompendiumThemeColorId, string> = {
  primary: "bg-[color-mix(in_oklch,var(--primary)_32%,black_68%)]",
  secondary: "bg-[color-mix(in_oklch,var(--secondary)_32%,black_68%)]",
  accent: "bg-[color-mix(in_oklch,var(--accent)_32%,black_68%)]",
  lime: "bg-[color-mix(in_oklch,var(--lime)_28%,black_72%)]",
  lemon: "bg-[color-mix(in_oklch,var(--lemon)_28%,black_72%)]",
  orange: "bg-[color-mix(in_oklch,var(--orange)_30%,black_70%)]",
  magenta: "bg-[color-mix(in_oklch,var(--magenta)_30%,black_70%)]",
  cyan: "bg-[color-mix(in_oklch,var(--cyan)_28%,black_72%)]",
  sky: "bg-[color-mix(in_oklch,var(--sky)_28%,black_72%)]",
  violet: "bg-[color-mix(in_oklch,var(--violet)_30%,black_70%)]",
}

const DETAIL_STRIP_BORDER: Record<CompendiumThemeColorId, string> = {
  primary: "border-primary/40",
  secondary: "border-secondary/40",
  accent: "border-accent/40",
  lime: "border-lime/40",
  lemon: "border-lemon/40",
  orange: "border-orange/40",
  magenta: "border-magenta/40",
  cyan: "border-cyan/40",
  sky: "border-sky/40",
  violet: "border-violet/40",
}

/** Lighter palette picks for labels/buttons on dark selection-card footers. */
const CARD_FOOTER_TEXT: Record<CompendiumThemeColorId, string> = {
  primary: "text-lemon",
  secondary: "text-sky",
  accent: "text-lemon",
  lime: "text-lime",
  lemon: "text-lemon",
  orange: "text-lemon",
  magenta: "text-sky",
  cyan: "text-cyan",
  sky: "text-sky",
  violet: "text-sky",
}

const CARD_FOOTER_BORDER: Record<CompendiumThemeColorId, string> = {
  primary: "border-lemon/75",
  secondary: "border-sky/75",
  accent: "border-lemon/75",
  lime: "border-lime/75",
  lemon: "border-lemon/75",
  orange: "border-lemon/75",
  magenta: "border-sky/75",
  cyan: "border-cyan/75",
  sky: "border-sky/75",
  violet: "border-sky/75",
}

const CARD_FOOTER_SELECT_HOVER: Record<CompendiumThemeColorId, string> = {
  primary: "hover:bg-lemon/15",
  secondary: "hover:bg-sky/15",
  accent: "hover:bg-lemon/15",
  lime: "hover:bg-lime/15",
  lemon: "hover:bg-lemon/15",
  orange: "hover:bg-lemon/15",
  magenta: "hover:bg-sky/15",
  cyan: "hover:bg-cyan/15",
  sky: "hover:bg-sky/15",
  violet: "hover:bg-sky/15",
}

export function compendiumAccentColorStyles(colorId: CompendiumThemeColorId | null) {
  const id = colorId ?? "primary"
  return {
    iconText: ICON_TEXT[id],
    /** Icons on dark image-card badges and overlays — lightest readable accent tone. */
    imageCardIconText: CARD_FOOTER_TEXT[id],
    hoverBorder: HOVER_BORDER[id],
    titleHover: TITLE_HOVER[id],
    editHover: EDIT_HOVER[id],
    detailStripBg: DETAIL_STRIP_BG[id],
    detailStripBorder: DETAIL_STRIP_BORDER[id],
    cardFooterText: CARD_FOOTER_TEXT[id],
    cardFooterBorder: CARD_FOOTER_BORDER[id],
    cardFooterSelectHover: CARD_FOOTER_SELECT_HOVER[id],
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

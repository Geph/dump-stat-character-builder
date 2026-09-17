export const NAME_FONT_IDS = [
  "classic",
  "storybook",
  "small-caps",
  "clean",
  "elegant",
  "archaic",
] as const

export type NameFontId = (typeof NAME_FONT_IDS)[number]

export const DEFAULT_NAME_FONT_ID: NameFontId = "classic"

/** Stored on `characters.appearance` so builder save / PDF physical fields stay intact. */
export const NAME_FONT_APPEARANCE_KEY = "name_font"

export type NameFontOption = {
  id: NameFontId
  label: string
  description: string
  cssFamily: string
  letterSpacing: string
  fontWeight?: number
}

export const NAME_FONTS: NameFontOption[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Condensed title caps",
    cssFamily: "var(--font-nodesto), var(--font-display), system-ui, sans-serif",
    letterSpacing: "0.02em",
  },
  {
    id: "storybook",
    label: "Cursive",
    description: "Elegant script",
    cssFamily: "var(--font-great-vibes), 'Segoe Script', cursive",
    letterSpacing: "0.02em",
    fontWeight: 400,
  },
  {
    id: "small-caps",
    label: "Goofy",
    description: "Comic handwritten",
    cssFamily: "var(--font-comic-neue), 'Comic Sans MS', cursive",
    letterSpacing: "0",
    fontWeight: 700,
  },
  {
    id: "clean",
    label: "Sci-Fi",
    description: "Futuristic display",
    cssFamily: "var(--font-orbitron), 'Segoe UI', sans-serif",
    letterSpacing: "0.06em",
  },
  {
    id: "elegant",
    label: "Elegant",
    description: "High-contrast serif",
    cssFamily: "var(--font-cinzel), Palatino, serif",
    letterSpacing: "0.04em",
  },
  {
    id: "archaic",
    label: "Archaic",
    description: "Hand-cut display",
    cssFamily: "var(--font-medieval-sharp), Georgia, serif",
    letterSpacing: "0.01em",
  },
]

const NAME_FONT_BY_ID = new Map(NAME_FONTS.map((font) => [font.id, font]))

export function isNameFontId(value: string | null | undefined): value is NameFontId {
  return !!value && NAME_FONT_BY_ID.has(value as NameFontId)
}

export function normalizeNameFontId(value: string | null | undefined): NameFontId {
  return isNameFontId(value) ? value : DEFAULT_NAME_FONT_ID
}

export function getNameFont(id: string | null | undefined): NameFontOption {
  return NAME_FONT_BY_ID.get(normalizeNameFontId(id)) ?? NAME_FONTS[0]
}

export function readNameFontId(appearance: Record<string, string> | null | undefined): NameFontId {
  return normalizeNameFontId(appearance?.[NAME_FONT_APPEARANCE_KEY])
}

export function withNameFont(
  appearance: Record<string, string> | null | undefined,
  fontId: string,
): Record<string, string> {
  return {
    ...(appearance ?? {}),
    [NAME_FONT_APPEARANCE_KEY]: normalizeNameFontId(fontId),
  }
}

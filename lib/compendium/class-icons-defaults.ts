/** Default game-icons.net slugs for SRD classes (from bundled seed / local MySQL export). */
export const SRD_CLASS_ICONS_BY_NAME: Record<string, string> = {
  Barbarian: "sharp-axe",
  Bard: "musical-notes",
  Cleric: "kneeling",
  Druid: "falling-leaf",
  Fighter: "axe-sword",
  Monk: "lotus",
  Paladin: "knight-banner",
  Ranger: "flat-paw-print",
  Rogue: "domino-mask",
  Sorcerer: "rolling-energy",
  Warlock: "warlock-eye",
  Wizard: "spell-book",
}

/** Curated homebrew class icons (exact name match). */
export const HOMEBREW_CLASS_ICONS_BY_NAME: Record<string, string> = {
  Psion: "rear-aura",
  "KibblesTasty Psion": "rear-aura",
}

const PSION_ICON = "rear-aura"

/** Resolve a default game-icons slug for a class name when none is stored. */
export function defaultClassIconForName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return null

  const exact =
    SRD_CLASS_ICONS_BY_NAME[trimmed] ?? HOMEBREW_CLASS_ICONS_BY_NAME[trimmed] ?? null
  if (exact) return exact

  // Kibbles'Tasty Psion and similar publisher-prefixed names.
  if (/\bkibbles/i.test(trimmed) && /\bpsion\b/i.test(trimmed)) return PSION_ICON

  return null
}

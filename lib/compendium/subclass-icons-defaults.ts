import { defaultClassIconForName } from "@/lib/compendium/class-icons-defaults"

/** Default game-icons.net slugs for SRD subclasses (from bundled seed / local MySQL export). */
export const SRD_SUBCLASS_ICONS_BY_NAME: Record<string, string> = {
  Champion: "mounted-knight",
  "Circle of the Land": "hills",
  "College of Lore": "bookmark",
  "Draconic Sorcery": "sea-dragon",
  Evoker: "spiky-explosion",
  "Fiend Patron": "devil-mask",
  Hunter: "mantrap",
  "Life Domain": "heart-plus",
  "Oath of Devotion": "tarot-11-justice",
  "Path of the Berserker": "enrage",
  "Path of the Wild Heart": "heart-inside",
  "Path of the World Tree": "tree-door",
  "Path of the Zealot": "church",
  Thief: "robin-hood-hat",
  "Warrior of the Open Hand": "black-hand-shield",
}

/** Subclass-specific icon when mapped; otherwise the parent class icon. */
export function defaultSubclassIconForName(
  subclassName: string,
  className?: string | null,
): string | null {
  const trimmed = subclassName.trim()
  if (!trimmed) return defaultClassIconForName(String(className ?? ""))
  return SRD_SUBCLASS_ICONS_BY_NAME[trimmed] ?? defaultClassIconForName(String(className ?? ""))
}

/** Keep a stored icon; otherwise apply subclass-then-class defaults. */
export function applySubclassIcon(
  row: Record<string, unknown>,
  className?: string | null,
): Record<string, unknown> {
  if (typeof row.icon === "string" && row.icon.trim()) {
    return { ...row, icon: row.icon.trim() }
  }
  return { ...row, icon: defaultSubclassIconForName(String(row.name ?? ""), className) }
}

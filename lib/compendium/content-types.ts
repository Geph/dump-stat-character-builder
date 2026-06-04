export type CompendiumContentType =
  | "species"
  | "classes"
  | "subclasses"
  | "backgrounds"
  | "spells"
  | "feats"
  | "equipment"
  | "abilities"

const CONTENT_TYPES: CompendiumContentType[] = [
  "species",
  "classes",
  "subclasses",
  "backgrounds",
  "spells",
  "feats",
  "equipment",
  "abilities",
]

export function isCompendiumContentType(value: string): value is CompendiumContentType {
  return (CONTENT_TYPES as string[]).includes(value)
}

/** Default game-icons.net slug when an item has no custom icon saved. */
export const COMPENDIUM_DEFAULT_ICONS: Record<CompendiumContentType, string> = {
  classes: "pointy-sword",
  subclasses: "templar-shield",
  species: "character",
  backgrounds: "bookshelf",
  spells: "round-potion",
  feats: "achievement",
  equipment: "briefcase",
  abilities: "magic-trident",
}

export function compendiumListHref(tab: CompendiumContentType): string {
  return `/compendium?tab=${tab}`
}

export function getCompendiumItemIcon(
  tab: CompendiumContentType,
  item: Record<string, unknown>,
): string {
  const icon = item.icon
  if (typeof icon === "string" && icon.trim()) return icon
  return COMPENDIUM_DEFAULT_ICONS[tab]
}

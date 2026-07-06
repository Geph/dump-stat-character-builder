import { weaponIconSlug } from "@/lib/compendium/weapon-icons"
import { SRD_ARMOR_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"

export type CompendiumContentType =
  | "species"
  | "classes"
  | "subclasses"
  | "backgrounds"
  | "spells"
  | "feats"
  | "equipment"
  | "magic_items"
  | "languages"
  | "tools"
  | "class_resources"
  | "abilities"

const CONTENT_TYPES: CompendiumContentType[] = [
  "species",
  "classes",
  "subclasses",
  "backgrounds",
  "spells",
  "feats",
  "equipment",
  "magic_items",
  "languages",
  "tools",
  "class_resources",
  "abilities",
]

/** Browser tab that reads/writes the equipment table. */
export function isEquipmentBrowserTab(
  tab: CompendiumContentType,
): tab is "equipment" | "magic_items" {
  return tab === "equipment" || tab === "magic_items"
}

/** DB table / editor type for a compendium browser tab. */
export function compendiumStorageContentType(tab: CompendiumContentType): CompendiumContentType {
  return tab === "magic_items" ? "equipment" : tab
}

export function isCompendiumContentType(value: string): value is CompendiumContentType {
  return (CONTENT_TYPES as string[]).includes(value)
}

/** Default game-icons.net slug when an item has no custom icon saved. */
export const COMPENDIUM_DEFAULT_ICONS: Record<CompendiumContentType, string> = {
  classes: "pointy-sword",
  subclasses: "templar-shield",
  species: "character",
  backgrounds: "bookshelf",
  spells: "bookmarklet",
  feats: "mighty-force",
  equipment: "battle-gear",
  magic_items: "sparkles",
  languages: "conversation",
  tools: "toolbox",
  class_resources: "energy-arrow",
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
  if (typeof icon === "string" && icon.trim()) return icon.trim()
  if (
    (tab === "equipment" || tab === "magic_items") &&
    item.category === "Weapon"
  ) {
    const name = String(item.name ?? "").trim()
    if (name) return weaponIconSlug(name)
  }
  if (
    (tab === "equipment" || tab === "magic_items") &&
    item.category === "Armor"
  ) {
    const armorIcon = SRD_ARMOR_ICONS_BY_NAME[String(item.name ?? "")]
    if (armorIcon) return armorIcon
  }
  return COMPENDIUM_DEFAULT_ICONS[tab]
}

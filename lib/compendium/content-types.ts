import { defaultAbilityIconForItem } from "@/lib/compendium/ability-icons-defaults"
import { defaultClassIconForName } from "@/lib/compendium/class-icons-defaults"
import { defaultCreatureIconForItem } from "@/lib/compendium/creature-icons-defaults"
import { defaultSubclassIconForName } from "@/lib/compendium/subclass-icons-defaults"
import { weaponIconSlug } from "@/lib/compendium/weapon-icons"
import {
  SRD_ARMOR_ICONS_BY_NAME,
  SRD_BACKGROUND_ICONS_BY_NAME,
  SRD_FEAT_ICONS_BY_NAME,
  SRD_SPECIES_ICONS_BY_NAME,
} from "@/lib/compendium/srd-item-icons-defaults"

export type CompendiumContentType =
  | "species"
  | "classes"
  | "subclasses"
  | "backgrounds"
  | "spells"
  | "feats"
  | "creatures"
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
  "creatures",
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
  creatures: "wolf-head",
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
  item: object,
): string {
  const record = item as Record<string, unknown>
  const icon = typeof record.icon === "string" ? record.icon.trim() : ""
  // `gunshot` was stamped on Gunslinger content, but the SVG is not shipped.
  // Treat it as unset so name / class defaults can fill in.
  if (icon && icon !== "gunshot") return icon
  if (tab === "classes") {
    const classIcon = defaultClassIconForName(String(record.name ?? ""))
    if (classIcon) return classIcon
  }
  if (tab === "subclasses") {
    const className =
      (typeof record.class_name === "string" && record.class_name) ||
      (typeof record.parent_class_name === "string" && record.parent_class_name) ||
      ""
    const subclassIcon = defaultSubclassIconForName(String(record.name ?? ""), className)
    if (subclassIcon) return subclassIcon
  }
  if (tab === "feats") {
    const featIcon = SRD_FEAT_ICONS_BY_NAME[String(record.name ?? "").trim()]
    if (featIcon) return featIcon
  }
  if (tab === "species") {
    const speciesIcon = SRD_SPECIES_ICONS_BY_NAME[String(record.name ?? "").trim()]
    if (speciesIcon) return speciesIcon
  }
  if (tab === "backgrounds") {
    const backgroundIcon = SRD_BACKGROUND_ICONS_BY_NAME[String(record.name ?? "").trim()]
    if (backgroundIcon) return backgroundIcon
  }
  if (tab === "creatures") {
    const creatureIcon = defaultCreatureIconForItem(record)
    if (creatureIcon) return creatureIcon
  }
  if (tab === "abilities") {
    const abilityIcon = defaultAbilityIconForItem({ ...record, icon: icon || undefined })
    if (abilityIcon) return abilityIcon
  }
  if (
    (tab === "equipment" || tab === "magic_items") &&
    record.category === "Weapon"
  ) {
    const name = String(record.name ?? "").trim()
    if (name) return weaponIconSlug(name)
  }
  if (
    (tab === "equipment" || tab === "magic_items") &&
    record.category === "Armor"
  ) {
    const armorIcon = SRD_ARMOR_ICONS_BY_NAME[String(record.name ?? "")]
    if (armorIcon) return armorIcon
  }
  return COMPENDIUM_DEFAULT_ICONS[tab]
}

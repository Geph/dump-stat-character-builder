export const COMPENDIUM_TABLES = [
  "classes",
  "subclasses",
  "species",
  "backgrounds",
  "spells",
  "feats",
  "equipment",
  "languages",
  "class_resources",
  "custom_abilities",
] as const

export type CompendiumTable = (typeof COMPENDIUM_TABLES)[number]

/** UI tab id "abilities" maps to the custom_abilities table. */
export function resolveTable(name: string): CompendiumTable | "characters" | null {
  if (name === "abilities") return "custom_abilities"
  if (name === "characters") return "characters"
  if ((COMPENDIUM_TABLES as readonly string[]).includes(name)) return name as CompendiumTable
  return null
}

export function isCompendiumTable(name: string): name is CompendiumTable {
  return (COMPENDIUM_TABLES as readonly string[]).includes(name)
}

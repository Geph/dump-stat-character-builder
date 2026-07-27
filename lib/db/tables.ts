export const COMPENDIUM_TABLES = [
  "classes",
  "subclasses",
  "species",
  "backgrounds",
  "spells",
  "feats",
  "creatures",
  "equipment",
  "languages",
  "tools",
  "class_resources",
  "custom_abilities",
] as const

export type CompendiumTable = (typeof COMPENDIUM_TABLES)[number]

/** Non-compendium app tables that use the generic data client / IndexedDB stores. */
export const APP_DATA_TABLES = ["parties", "character_snapshots"] as const
export type AppDataTable = (typeof APP_DATA_TABLES)[number]

export type ResolvableTable = CompendiumTable | "characters" | AppDataTable

/** UI tab id "abilities" maps to the custom_abilities table. */
export function resolveTable(name: string): ResolvableTable | null {
  if (name === "abilities") return "custom_abilities"
  if (name === "characters") return "characters"
  if ((APP_DATA_TABLES as readonly string[]).includes(name)) return name as AppDataTable
  if ((COMPENDIUM_TABLES as readonly string[]).includes(name)) return name as CompendiumTable
  return null
}

export function isCompendiumTable(name: string): name is CompendiumTable {
  return (COMPENDIUM_TABLES as readonly string[]).includes(name)
}

export function isAppDataTable(name: string): name is AppDataTable {
  return (APP_DATA_TABLES as readonly string[]).includes(name)
}

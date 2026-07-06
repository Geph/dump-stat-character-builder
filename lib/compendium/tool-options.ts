import toolsSeed from "@/lib/srd/seed-data/tools.json"
import type { Tool, ToolCheckAbility, ToolGroup } from "@/lib/types"

export type ToolSeedRow = (typeof toolsSeed)[number]

const seedRows = toolsSeed as ToolSeedRow[]

const seedByName = new Map(seedRows.map((row) => [row.name.toLowerCase(), row]))

export function getSeedTools(): ToolSeedRow[] {
  return seedRows
}

/** Proficiency-level tool names from the bundled SRD (category + specific items). */
export function getAllSeedToolNames(): string[] {
  return seedRows.map((row) => row.name)
}

/** Names suitable for generic "tool proficiency" pickers (SRD PHB category list). */
export function getStandardProficiencyToolNames(): string[] {
  return [
    ...getArtisansToolNames(),
    ...getOtherToolNames(),
    ...getVehicleToolNames(),
    "Musical Instrument",
    "Gaming Set",
  ].sort((a, b) => a.localeCompare(b))
}

export function getArtisansToolNames(): string[] {
  return seedRows.filter((row) => row.tool_group === "artisans").map((row) => row.name)
}

export function getMusicalInstrumentNames(): string[] {
  return seedRows
    .filter((row) => row.tool_group === "musical" && row.name !== "Musical Instrument")
    .map((row) => row.name)
}

export function getGamingSetNames(): string[] {
  return seedRows
    .filter((row) => row.tool_group === "gaming" && row.name !== "Gaming Set")
    .map((row) => row.name)
}

export function getVehicleToolNames(): string[] {
  return seedRows.filter((row) => row.tool_group === "vehicle").map((row) => row.name)
}

export function getOtherToolNames(): string[] {
  return seedRows.filter((row) => row.tool_group === "other").map((row) => row.name)
}

/** Merge compendium rows with bundled seed names (deduped, sorted). */
export function mergeToolNameLists(
  compendiumRows: Array<Pick<Tool, "name"> | { name: string }> = [],
): string[] {
  const names = new Set<string>([
    ...getAllSeedToolNames(),
    ...compendiumRows.map((row) => row.name).filter(Boolean),
  ])
  return [...names].sort((a, b) => a.localeCompare(b))
}

export type ToolChoicePool = "all" | "artisans" | "musical" | "gaming" | "other" | "vehicle"

export function toolNamesForPool(
  pool: ToolChoicePool | null | undefined,
  allNames: string[],
): string[] {
  switch (pool) {
    case "artisans":
      return allNames.filter((name) =>
        getArtisansToolNames().some((entry) => entry.toLowerCase() === name.toLowerCase()),
      )
    case "musical":
      return allNames.filter(
        (name) =>
          name.toLowerCase() === "musical instrument" ||
          getMusicalInstrumentNames().some((entry) => entry.toLowerCase() === name.toLowerCase()),
      )
    case "gaming":
      return allNames.filter(
        (name) =>
          name.toLowerCase() === "gaming set" ||
          getGamingSetNames().some((entry) => entry.toLowerCase() === name.toLowerCase()),
      )
    case "other":
      return allNames.filter((name) =>
        getOtherToolNames().some((entry) => entry.toLowerCase() === name.toLowerCase()),
      )
    case "vehicle":
      return allNames.filter((name) =>
        getVehicleToolNames().some((entry) => entry.toLowerCase() === name.toLowerCase()),
      )
    case "all":
    default:
      return allNames
  }
}

export function toolNamesForPools(
  pools: ToolChoicePool[],
  allNames: string[] = mergeToolNameLists(),
): string[] {
  const out = new Set<string>()
  for (const pool of pools) {
    for (const name of toolNamesForPool(pool, allNames)) out.add(name)
  }
  return [...out].sort((a, b) => a.localeCompare(b))
}

export function resolveToolCheckAbility(
  toolName: string,
  catalog: Array<Pick<Tool, "name" | "check_ability">> = [],
): ToolCheckAbility {
  const fromCatalog = catalog.find((row) => row.name.toLowerCase() === toolName.toLowerCase())
  if (fromCatalog?.check_ability) return fromCatalog.check_ability
  const fromSeed = seedByName.get(toolName.toLowerCase())
  if (fromSeed?.check_ability) return fromSeed.check_ability as ToolCheckAbility
  return "intelligence"
}

export function resolveToolExpansions(
  toolName: string,
  catalog: Array<Pick<Tool, "name" | "expands_to">> = [],
): string[] {
  const fromCatalog = catalog.find((row) => row.name.toLowerCase() === toolName.toLowerCase())
  if (fromCatalog?.expands_to?.length) return fromCatalog.expands_to
  const fromSeed = seedByName.get(toolName.toLowerCase())
  if (fromSeed?.expands_to?.length) return fromSeed.expands_to
  return [toolName]
}

export function isKnownToolName(name: string, allNames: readonly string[] = getAllSeedToolNames()): boolean {
  const normalized = name.trim().toLowerCase()
  return allNames.some((entry) => entry.toLowerCase() === normalized)
}

export function toolGroupLabel(group: ToolGroup): string {
  switch (group) {
    case "artisans":
      return "Artisan's Tools"
    case "musical":
      return "Musical Instruments"
    case "gaming":
      return "Gaming Sets"
    case "vehicle":
      return "Vehicles"
    case "other":
      return "Other Tools"
    default:
      return group
  }
}

export type ToolOptionGroup = {
  key: string
  label: string
  names: string[]
}

function seedSubcategoryForName(name: string): string | null {
  const row = seedByName.get(name.toLowerCase())
  return row?.subcategory?.trim() || null
}

function seedGroupForName(name: string): ToolGroup | null {
  const row = seedByName.get(name.toLowerCase())
  return (row?.tool_group as ToolGroup | undefined) ?? null
}

/** Group tool proficiency options for accordion pickers (artisans / musical pools). */
export function groupToolOptionsForPicker(
  names: string[],
  pool?: ToolChoicePool | null,
): ToolOptionGroup[] {
  const unique = [...new Set(names.filter((name) => name.trim().length > 0))].sort((a, b) =>
    a.localeCompare(b),
  )
  if (unique.length === 0) return []

  const shouldGroup =
    pool === "artisans" ||
    pool === "musical" ||
    pool === "gaming" ||
    pool === "vehicle" ||
    pool === "other" ||
    pool === "all"

  if (!shouldGroup) {
    return [{ key: "all", label: "Tools", names: unique }]
  }

  const buckets = new Map<string, ToolOptionGroup>()
  for (const name of unique) {
    const group = seedGroupForName(name)
    const subcategory = seedSubcategoryForName(name)
    const label =
      subcategory ||
      (group ? toolGroupLabel(group) : null) ||
      (name.toLowerCase() === "musical instrument"
        ? "Musical Instruments"
        : name.toLowerCase() === "gaming set"
          ? "Gaming Sets"
          : "Other Tools")
    const key = `${group ?? "misc"}::${label}`
    const existing = buckets.get(key)
    if (existing) {
      existing.names.push(name)
    } else {
      buckets.set(key, { key, label, names: [name] })
    }
  }

  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label))
}

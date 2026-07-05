import {
  getAllSeedToolNames,
  getArtisansToolNames,
  getGamingSetNames,
  getMusicalInstrumentNames,
  getStandardProficiencyToolNames,
  mergeToolNameLists,
  toolNamesForPool,
  type ToolChoicePool,
} from "@/lib/compendium/tool-options"

/** Standard tool names from the D&D 5.5e SRD (proficiency-level entries). */
export const SRD_TOOL_NAMES = getStandardProficiencyToolNames()

/** Specific artisan's tools from the SRD. */
export const SRD_ARTISANS_TOOLS = getArtisansToolNames()

/** Specific musical instruments from the SRD. */
export const SRD_MUSICAL_INSTRUMENTS = getMusicalInstrumentNames()

/** Specific gaming sets from the SRD. */
export const SRD_GAMING_SETS = getGamingSetNames()

/** All bundled SRD tool compendium names (includes specific sub-items). */
export const SRD_TOOLS = getAllSeedToolNames()

export type { ToolChoicePool }

export {
  getAllSeedToolNames,
  getArtisansToolNames,
  getGamingSetNames,
  getMusicalInstrumentNames,
  getStandardProficiencyToolNames,
  mergeToolNameLists,
  toolNamesForPool,
  toolNamesForPools,
} from "@/lib/compendium/tool-options"

/** Tools a player may pick from for a given pool, excluding already-granted ones. */
export function toolOptionsForPool(
  pool: ToolChoicePool | null | undefined,
  exclude: string[] = [],
  allTools: readonly string[] = mergeToolNameLists(),
): string[] {
  const excludeSet = new Set(exclude.map((name) => name.toLowerCase()))
  return toolNamesForPool(pool ?? "all", [...allTools]).filter(
    (name) => !excludeSet.has(name.toLowerCase()),
  )
}

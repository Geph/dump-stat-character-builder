import { getBackgroundFeatPickSlots } from "@/lib/builder/background-feat-options"
import { getFeatPickSlots } from "@/lib/builder/class-feat-features"
import { getSpeciesFeatPickSlots } from "@/lib/builder/species-feat-options"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { Background, DndClass, Species, Subclass } from "@/lib/types"

/** All feat-pick slot keys that could exist for this build (used to prune stale feat picks only). */
export function collectFeatPickSlotKeys(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  catalog: ModifierCatalogEntry[]
  totalLevel: number
  subclasses: Subclass[]
  subclassByClassId: Record<string, string>
  species?: Species
  speciesTraitPicks: Record<string, string[]>
  background?: Background
}): Set<string> {
  const keys = new Set<string>()

  for (const slot of getFeatPickSlots(
    params.classLevels,
    params.classes,
    params.catalog,
    params.totalLevel,
    params.subclasses,
    params.subclassByClassId,
  )) {
    keys.add(slot.key)
  }

  for (const slot of getSpeciesFeatPickSlots(
    params.species,
    params.speciesTraitPicks,
    params.catalog,
  )) {
    keys.add(slot.key)
  }

  for (const slot of getBackgroundFeatPickSlots(params.background, params.catalog)) {
    keys.add(slot.key)
  }

  return keys
}

/** Feat slot keys at max level — stale picks not in the active set should be removed. */
export function collectMaxLevelFeatPickSlotKeys(
  params: Omit<Parameters<typeof collectFeatPickSlotKeys>[0], "totalLevel" | "classLevels"> & {
    classLevels: { classId: string; level: number }[]
  },
): Set<string> {
  const maxClassLevels = params.classLevels.map((entry) => ({
    classId: entry.classId,
    level: Math.max(entry.level, 20),
  }))
  const maxTotal = Math.max(
    20,
    ...params.classLevels.map((entry) => entry.level),
    maxClassLevels.reduce((sum, entry) => sum + entry.level, 0),
  )

  const keys = collectFeatPickSlotKeys({
    ...params,
    classLevels: maxClassLevels,
    totalLevel: maxTotal,
  })

  if (params.species?.traits) {
    for (const slot of getSpeciesFeatPickSlots(params.species, {}, params.catalog)) {
      keys.add(slot.key)
    }
    params.species.traits.forEach((trait, index) => {
      if (!trait.isChoice || !trait.choices?.options?.length) return
      for (const option of trait.choices.options) {
        for (const slot of getSpeciesFeatPickSlots(
          params.species,
          { [String(index)]: [option.name] },
          params.catalog,
        )) {
          keys.add(slot.key)
        }
      }
    })
  }

  return keys
}

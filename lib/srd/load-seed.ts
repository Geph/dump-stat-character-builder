import backgrounds from "./seed-data/backgrounds.json"
import classes from "./seed-data/classes.json"
import equipment from "./seed-data/equipment.json"
import magicItems from "./seed-data/magic-items.json"
import feats from "./seed-data/feats.json"
import languages from "./seed-data/languages.json"
import manifest from "./seed-data/manifest.json"
import species from "./seed-data/species.json"
import spells from "./seed-data/spells.json"
import subclasses from "./seed-data/subclasses.json"

export type SrdSeedManifest = typeof manifest

export type SrdClassRow = (typeof classes)[number]
export type SrdSubclassRow = (typeof subclasses)[number] & { class_name: string }

export function getSrdSeedData() {
  return {
    manifest,
    classes: classes as SrdClassRow[],
    subclasses: subclasses as SrdSubclassRow[],
    species: species as Record<string, unknown>[],
    backgrounds: backgrounds as Record<string, unknown>[],
    spells: spells as Record<string, unknown>[],
    feats: feats as Record<string, unknown>[],
    equipment: equipment as Record<string, unknown>[],
    magicItems: magicItems as Record<string, unknown>[],
    languages: languages as Record<string, unknown>[],
  }
}

import { countBundledClassResources } from "@/lib/compendium/seed-class-resources"

export function getSrdSeedTotals() {
  const data = getSrdSeedData()
  const classResourceCount = countBundledClassResources()
  const total =
    data.classes.length +
    data.subclasses.length +
    data.species.length +
    data.backgrounds.length +
    data.spells.length +
    data.feats.length +
    data.equipment.length +
    data.magicItems.length +
    data.languages.length +
    classResourceCount

  return {
    total,
    breakdown: {
      classes: data.classes.length,
      subclasses: data.subclasses.length,
      species: data.species.length,
      backgrounds: data.backgrounds.length,
      spells: data.spells.length,
      feats: data.feats.length,
      equipment: data.equipment.length + data.magicItems.length,
      magic_items: data.magicItems.length,
      languages: data.languages.length,
      class_resources: classResourceCount,
    },
  }
}

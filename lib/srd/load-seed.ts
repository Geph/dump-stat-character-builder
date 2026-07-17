import backgrounds from "./seed-data/backgrounds.json"
import classes from "./seed-data/classes.json"
import creaturesDocument from "./seed-data/creatures.json"
import equipment from "./seed-data/equipment.json"
import magicItems from "./seed-data/magic-items.json"
import feats from "./seed-data/feats.json"
import languages from "./seed-data/languages.json"
import tools from "./seed-data/tools.json"
import manifest from "./seed-data/manifest.json"
import species from "./seed-data/species.json"
import spells from "./seed-data/spells.json"
import subclasses from "./seed-data/subclasses.json"
import { countBundledClassResources } from "@/lib/compendium/seed-class-resources"

export type SrdSeedManifest = typeof manifest

export type SrdClassRow = (typeof classes)[number]
export type SrdSubclassRow = (typeof subclasses)[number] & { class_name: string }

export function getSrdSeedData() {
  return {
    manifest,
    classes: classes as SrdClassRow[],
    subclasses: subclasses as SrdSubclassRow[],
    species: species as unknown as Record<string, unknown>[],
    backgrounds: backgrounds as unknown as Record<string, unknown>[],
    spells: spells as unknown as Record<string, unknown>[],
    feats: feats as unknown as Record<string, unknown>[],
    equipment: equipment as unknown as Record<string, unknown>[],
    magicItems: magicItems as unknown as Record<string, unknown>[],
    languages: languages as unknown as Record<string, unknown>[],
    tools: tools as unknown as Record<string, unknown>[],
    creaturesDocument: creaturesDocument as {
      schema_version: string
      creatures: Record<string, unknown>[]
    },
  }
}

export function getSrdSeedTotals() {
  const data = getSrdSeedData()
  const classResourceCount = countBundledClassResources()
  const creatureCount = data.creaturesDocument.creatures.length
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
    data.tools.length +
    creatureCount +
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
      tools: data.tools.length,
      creatures: creatureCount,
      class_resources: classResourceCount,
    },
  }
}

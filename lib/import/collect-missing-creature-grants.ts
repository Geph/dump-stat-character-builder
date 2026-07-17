import { grantCreaturesFromLinkedModifiers } from "@/lib/compendium/grant-creature-catalog"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"
import creaturesSeed from "@/lib/srd/seed-data/creatures.json"

export type KnownCreature = { name: string }

/** A feature's creature/companion grant whose creatures are not available yet. */
export type MissingCreatureGrant = {
  /** Creature name that could not be resolved. */
  name: string
  /** "Class :: Feature" style labels of the features that need it. */
  sources: string[]
}

type FeatureLike = {
  name?: string | null
  companion_creature_names?: string[] | null
  linkedModifiers?: LinkedModifierInstance[] | null
  modifierRefs?: string[] | null
}

/**
 * Feature names whose modifier presets grant companions by creature name at
 * enrichment time (the import batch may not carry the linked modifiers yet).
 */
const PRESET_CREATURE_DEPENDENCIES: { pattern: RegExp; creatureNames: string[] }[] = [
  {
    pattern: /^primal companion$/i,
    creatureNames: ["Beast of the Land", "Beast of the Sea", "Beast of the Sky"],
  },
  {
    pattern: /^faithful steed$/i,
    creatureNames: ["Otherworldly Steed"],
  },
]

function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function collectKnownCreatureNames(
  content: ImportContent,
  libraryCreatures: KnownCreature[] = [],
): Set<string> {
  const known = new Set<string>()
  const seed = creaturesSeed as { creatures: { name: string }[] }
  for (const creature of seed.creatures) {
    known.add(normalizeNameKey(creature.name))
  }
  for (const creature of content.creatures ?? []) {
    const name = (creature as { name?: string }).name
    if (name?.trim()) known.add(normalizeNameKey(name))
  }
  for (const creature of libraryCreatures) {
    if (creature.name?.trim()) known.add(normalizeNameKey(creature.name))
  }
  return known
}

function creatureNamesForFeature(feature: FeatureLike): string[] {
  const names: string[] = [...(feature.companion_creature_names ?? [])]

  for (const grant of grantCreaturesFromLinkedModifiers(
    [],
    feature.linkedModifiers,
    feature.modifierRefs,
  )) {
    names.push(...grant.creatureNames)
  }

  const featureName = (feature.name ?? "").trim()
  if (featureName) {
    for (const dependency of PRESET_CREATURE_DEPENDENCIES) {
      if (dependency.pattern.test(featureName)) {
        names.push(...dependency.creatureNames)
      }
    }
  }

  return [...new Set(names.map((name) => name.trim()).filter(Boolean))]
}

/**
 * Creature/companion names referenced by imported class and subclass features
 * (companion_creature_names, grant_creature modifiers, or known companion
 * presets like Beast Master's Primal Companion) that are missing from the
 * import batch, the SRD seed, and the caller-provided creature library.
 *
 * Surfaced as an import dependency: the Companions tab entry cannot resolve
 * until the creature is imported.
 */
export function collectMissingCreatureGrants(
  content: ImportContent,
  libraryCreatures: KnownCreature[] = [],
): MissingCreatureGrant[] {
  const known = collectKnownCreatureNames(content, libraryCreatures)
  const byKey = new Map<string, { name: string; sources: Set<string> }>()

  const record = (creatureName: string, sourceLabel: string) => {
    if (known.has(normalizeNameKey(creatureName))) return
    const key = normalizeNameKey(creatureName)
    const existing = byKey.get(key)
    if (existing) {
      existing.sources.add(sourceLabel)
    } else {
      byKey.set(key, { name: creatureName, sources: new Set([sourceLabel]) })
    }
  }

  const scan = (features: FeatureLike[] | undefined, ownerLabel: string) => {
    for (const feature of features ?? []) {
      const featureLabel = feature.name?.trim()
        ? `${ownerLabel} (${feature.name.trim()})`
        : ownerLabel
      for (const creatureName of creatureNamesForFeature(feature)) {
        record(creatureName, featureLabel)
      }
    }
  }

  for (const row of content.classes ?? []) {
    scan(row.features as FeatureLike[] | undefined, row.name)
  }
  for (const row of content.subclasses ?? []) {
    scan(row.features as FeatureLike[] | undefined, row.name)
  }

  return [...byKey.values()]
    .map((entry) => ({ name: entry.name, sources: [...entry.sources].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

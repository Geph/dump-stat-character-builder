import type { ImportContent } from "@/lib/import/content-schema"

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const byName = new Map<string, T>()
  for (const item of items) {
    const key = item.name.trim().toLowerCase()
    const existing = byName.get(key)
    if (!existing) {
      byName.set(key, item)
      continue
    }
    const existingFeatures = (existing as { features?: unknown[] }).features?.length ?? 0
    const nextFeatures = (item as { features?: unknown[] }).features?.length ?? 0
    if (nextFeatures >= existingFeatures) {
      byName.set(key, item)
    }
  }
  return [...byName.values()]
}

function dedupeSubclassByName<T extends { name: string; class_name: string }>(items: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const item of items) {
    const key = `${item.class_name.trim().toLowerCase()}::${item.name.trim().toLowerCase()}`
    byKey.set(key, item)
  }
  return [...byKey.values()]
}

function dedupeClassResource<T extends { class_name: string; resource_key: string }>(items: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const item of items) {
    const key = `${item.class_name.trim().toLowerCase()}::${item.resource_key.trim().toLowerCase()}`
    byKey.set(key, item)
  }
  return [...byKey.values()]
}

function dedupeProposedResource<T extends { proposal_id: string }>(items: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const item of items) {
    byKey.set(item.proposal_id.trim().toLowerCase(), item)
  }
  return [...byKey.values()]
}

function dedupeProposedAbility<T extends { proposal_id: string }>(items: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const item of items) {
    byKey.set(item.proposal_id.trim().toLowerCase(), item)
  }
  return [...byKey.values()]
}

/** Merge multiple AI extraction passes into one import payload. */
export function mergeImportContent(chunks: ImportContent[]): ImportContent {
  const merged: ImportContent = {}

  const species = chunks.flatMap((chunk) => chunk.species ?? [])
  if (species.length) merged.species = dedupeByName(species)

  const classes = chunks.flatMap((chunk) => chunk.classes ?? [])
  if (classes.length) merged.classes = dedupeByName(classes)

  const subclasses = chunks.flatMap((chunk) => chunk.subclasses ?? [])
  if (subclasses.length) merged.subclasses = dedupeSubclassByName(subclasses)

  const backgrounds = chunks.flatMap((chunk) => chunk.backgrounds ?? [])
  if (backgrounds.length) merged.backgrounds = dedupeByName(backgrounds)

  const spells = chunks.flatMap((chunk) => chunk.spells ?? [])
  if (spells.length) merged.spells = dedupeByName(spells)

  const feats = chunks.flatMap((chunk) => chunk.feats ?? [])
  if (feats.length) merged.feats = dedupeByName(feats)

  const equipment = chunks.flatMap((chunk) => chunk.equipment ?? [])
  if (equipment.length) merged.equipment = dedupeByName(equipment)

  const abilities = chunks.flatMap((chunk) => chunk.abilities ?? [])
  if (abilities.length) merged.abilities = dedupeByName(abilities)

  const classResources = chunks.flatMap((chunk) => chunk.class_resources ?? [])
  if (classResources.length) merged.class_resources = dedupeClassResource(classResources)

  const proposalResources = chunks.flatMap(
    (chunk) => chunk.import_proposals?.class_resources ?? [],
  )
  const proposalAbilities = chunks.flatMap(
    (chunk) => chunk.import_proposals?.custom_abilities ?? [],
  )
  if (proposalResources.length || proposalAbilities.length) {
    merged.import_proposals = {
      ...(proposalResources.length
        ? { class_resources: dedupeProposedResource(proposalResources) }
        : {}),
      ...(proposalAbilities.length
        ? { custom_abilities: dedupeProposedAbility(proposalAbilities) }
        : {}),
    }
  }

  return merged
}

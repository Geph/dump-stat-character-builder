import { creatureNamesFromFeature } from "@/lib/compendium/grant-creature-catalog"
import {
  contentTypeToTable,
  isProtectedSystemCompendiumItem,
  tableToContentType,
  type CompendiumToggleTarget,
} from "@/lib/compendium/compendium-toggle"
import { isMagicItem } from "@/lib/compendium/equipment-attunement"
import type { Feature } from "@/lib/types"
import type { DataClient } from "@/lib/db/client"
import { asCompendiumRow, asCompendiumRows } from "@/lib/data/types"
import type { CompendiumTable } from "@/lib/db/tables"
import type { CompendiumContentType } from "@/lib/compendium/content-types"
import { prerequisiteMentionsName } from "@/lib/compendium/prerequisite-match"

export type RelatedCascadeGroup = {
  feats: CompendiumToggleTarget[]
  creatures: CompendiumToggleTarget[]
  abilities: CompendiumToggleTarget[]
}

export const EMPTY_RELATED_CASCADE: RelatedCascadeGroup = {
  feats: [],
  creatures: [],
  abilities: [],
}

export { prerequisiteMentionsName }

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function addTarget(
  targets: CompendiumToggleTarget[],
  seen: Set<string>,
  table: CompendiumTable,
  rowId: string,
  name: string,
) {
  if (!rowId || !name.trim()) return
  if (isProtectedSystemCompendiumItem(table, rowId)) return
  const key = `${table}:${rowId}`
  if (seen.has(key)) return
  seen.add(key)
  targets.push({
    table,
    contentType: tableToContentType(table),
    id: rowId,
    name,
  })
}

function idsInclude(value: unknown, id: string): boolean {
  return Array.isArray(value) && value.some((entry) => entry === id)
}

function asFeatureCarrier(value: unknown): Feature | null {
  if (!value || typeof value !== "object") return null
  const row = value as Feature & {
    linked_modifiers?: Feature["linkedModifiers"]
    companion_creature_names?: string[] | null
  }
  return {
    ...row,
    linkedModifiers: row.linkedModifiers ?? row.linked_modifiers,
    companion_creature_names: row.companion_creature_names,
  } as Feature
}

function collectCreatureNamesFromFeatureTree(feature: Feature): string[] {
  const names = creatureNamesFromFeature(feature)
  for (const option of feature.choices?.options ?? []) {
    const optionFeature = asFeatureCarrier(option)
    if (optionFeature) names.push(...creatureNamesFromFeature(optionFeature))
  }
  return names
}

function collectCreatureNamesFromFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return []
  const out: string[] = []
  for (const feature of features) {
    const normalized = asFeatureCarrier(feature)
    if (!normalized) continue
    out.push(...collectCreatureNamesFromFeatureTree(normalized))
  }
  return out
}

async function findCreaturesByNames(
  db: DataClient,
  names: Iterable<string>,
): Promise<CompendiumToggleTarget[]> {
  const wanted = new Set([...names].map(normalizeName).filter(Boolean))
  if (!wanted.size) return []

  const { data } = await db.from("creatures").select("id, name")
  const targets: CompendiumToggleTarget[] = []
  const seen = new Set<string>()
  for (const row of asCompendiumRows(data)) {
    const name = typeof row.name === "string" ? row.name : ""
    if (!wanted.has(normalizeName(name))) continue
    addTarget(targets, seen, "creatures", row.id as string, name)
  }
  return targets.sort((a, b) => a.name.localeCompare(b.name))
}

async function findRelatedFeatsForParent(
  db: DataClient,
  opts: {
    id: string
    name: string
    idField: "prerequisite_class_ids" | "prerequisite_species_ids"
  },
): Promise<CompendiumToggleTarget[]> {
  const { data } = await db
    .from("feats")
    .select("id, name, prerequisite, prerequisite_class_ids, prerequisite_species_ids")
  const targets: CompendiumToggleTarget[] = []
  const seen = new Set<string>()
  for (const row of asCompendiumRows(data)) {
    const byId = idsInclude(row[opts.idField], opts.id)
    const byText = prerequisiteMentionsName(
      typeof row.prerequisite === "string" ? row.prerequisite : null,
      opts.name,
    )
    if (!byId && !byText) continue
    addTarget(targets, seen, "feats", row.id as string, row.name as string)
  }
  return targets.sort((a, b) => a.name.localeCompare(b.name))
}

async function findAttachedAbilities(
  db: DataClient,
  attachType: string,
  attachIds: ReadonlySet<string> | readonly string[],
): Promise<CompendiumToggleTarget[]> {
  const idSet = attachIds instanceof Set ? attachIds : new Set(attachIds)
  if (!idSet.size) return []

  const { data } = await db
    .from("custom_abilities")
    .select("id, name, attached_to_type, attached_to_id")
  const targets: CompendiumToggleTarget[] = []
  const seen = new Set<string>()
  for (const row of asCompendiumRows(data)) {
    if (row.attached_to_type !== attachType) continue
    const attachedId = typeof row.attached_to_id === "string" ? row.attached_to_id : ""
    if (!idSet.has(attachedId)) continue
    addTarget(targets, seen, "custom_abilities", row.id as string, row.name as string)
  }
  return targets.sort((a, b) => a.name.localeCompare(b.name))
}

/** Equipment disable matches abilities by id, name, or category. */
async function findEquipmentAttachedAbilities(
  db: DataClient,
  rows: ReadonlyArray<{ id: string; name?: string | null; category?: string | null }>,
): Promise<CompendiumToggleTarget[]> {
  const keys = new Set<string>()
  for (const row of rows) {
    if (row.id) keys.add(row.id)
    if (row.name?.trim()) keys.add(row.name.trim())
    if (row.category?.trim()) keys.add(row.category.trim())
  }
  if (!keys.size) return []

  const { data } = await db
    .from("custom_abilities")
    .select("id, name, attached_to_type, attached_to_id")
  const targets: CompendiumToggleTarget[] = []
  const seen = new Set<string>()
  for (const row of asCompendiumRows(data)) {
    if (row.attached_to_type !== "equipment" && row.attached_to_type !== "item") continue
    const attachedId = typeof row.attached_to_id === "string" ? row.attached_to_id : ""
    if (!keys.has(attachedId)) continue
    addTarget(targets, seen, "custom_abilities", row.id as string, row.name as string)
  }
  return targets.sort((a, b) => a.name.localeCompare(b.name))
}

async function collectGrantedCreatureNamesForClass(
  db: DataClient,
  classId: string,
): Promise<string[]> {
  const names: string[] = []
  const { data: cls } = await db.from("classes").select("features").eq("id", classId).single()
  const clsRow = asCompendiumRow(cls)
  names.push(...collectCreatureNamesFromFeatures(clsRow?.features))

  const { data: subclasses } = await db
    .from("subclasses")
    .select("features")
    .eq("class_id", classId)
  for (const row of asCompendiumRows(subclasses)) {
    names.push(...collectCreatureNamesFromFeatures(row.features))
  }

  const { data: abilities } = await db
    .from("custom_abilities")
    .select(
      "companion_creature_names, linked_modifiers, linkedModifiers, modifierRefs, attached_to_type, attached_to_id",
    )
  for (const row of asCompendiumRows(abilities)) {
    if (row.attached_to_type !== "class" || row.attached_to_id !== classId) continue
    names.push(
      ...creatureNamesFromFeature({
        name: "",
        description: "",
        companion_creature_names: row.companion_creature_names as string[] | null | undefined,
        linkedModifiers: (row.linked_modifiers ?? row.linkedModifiers) as Feature["linkedModifiers"],
        modifierRefs: row.modifierRefs as string[] | null | undefined,
      } as Feature),
    )
  }

  return names
}

async function collectGrantedCreatureNamesForSpecies(
  db: DataClient,
  speciesId: string,
): Promise<string[]> {
  const names: string[] = []
  const { data: species } = await db
    .from("species")
    .select("traits, linked_modifiers, linkedModifiers, modifierRefs, companion_creature_names")
    .eq("id", speciesId)
    .single()
  const row = asCompendiumRow(species)
  if (!row) return names

  names.push(...collectCreatureNamesFromFeatures(row.traits))
  names.push(
    ...creatureNamesFromFeature({
      name: "",
      description: "",
      companion_creature_names: row.companion_creature_names as string[] | null | undefined,
      linkedModifiers: (row.linked_modifiers ?? row.linkedModifiers) as Feature["linkedModifiers"],
      modifierRefs: row.modifierRefs as string[] | null | undefined,
    } as Feature),
  )

  const { data: abilities } = await db
    .from("custom_abilities")
    .select(
      "companion_creature_names, linked_modifiers, linkedModifiers, modifierRefs, attached_to_type, attached_to_id",
    )
  for (const ability of asCompendiumRows(abilities)) {
    if (ability.attached_to_type !== "species" || ability.attached_to_id !== speciesId) continue
    names.push(
      ...creatureNamesFromFeature({
        name: "",
        description: "",
        companion_creature_names: ability.companion_creature_names as string[] | null | undefined,
        linkedModifiers: (ability.linked_modifiers ??
          ability.linkedModifiers) as Feature["linkedModifiers"],
        modifierRefs: ability.modifierRefs as string[] | null | undefined,
      } as Feature),
    )
  }

  return names
}

function mergeAbilityLists(
  ...groups: CompendiumToggleTarget[][]
): CompendiumToggleTarget[] {
  const seen = new Set<string>()
  const out: CompendiumToggleTarget[] = []
  for (const group of groups) {
    for (const target of group) {
      const key = `${target.table}:${target.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(target)
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/** Feats / companions / attached abilities soft-linked to a class or species. */
export async function findRelatedFeatsAndCompanions(
  db: DataClient,
  contentType: "classes" | "species",
  id: string,
): Promise<RelatedCascadeGroup> {
  const table = contentTypeToTable(contentType)
  const { data } = await db.from(table).select("name").eq("id", id).single()
  const row = asCompendiumRow(data)
  const name = typeof row?.name === "string" ? row.name : ""
  if (!name) return { ...EMPTY_RELATED_CASCADE }

  if (contentType === "classes") {
    const { data: subclassRows } = await db.from("subclasses").select("id").eq("class_id", id)
    const subclassIds = asCompendiumRows(subclassRows).map((r) => r.id as string)

    const [feats, creatures, classAbilities, subclassAbilities] = await Promise.all([
      findRelatedFeatsForParent(db, {
        id,
        name,
        idField: "prerequisite_class_ids",
      }),
      findCreaturesByNames(db, await collectGrantedCreatureNamesForClass(db, id)),
      findAttachedAbilities(db, "class", [id]),
      findAttachedAbilities(db, "subclass", subclassIds),
    ])
    return {
      feats,
      creatures,
      abilities: mergeAbilityLists(classAbilities, subclassAbilities),
    }
  }

  const [feats, creatures, abilities] = await Promise.all([
    findRelatedFeatsForParent(db, {
      id,
      name,
      idField: "prerequisite_species_ids",
    }),
    findCreaturesByNames(db, await collectGrantedCreatureNamesForSpecies(db, id)),
    findAttachedAbilities(db, "species", [id]),
  ])
  return { feats, creatures, abilities }
}

/** Aggregate optional cascade targets when clearing an entire classes/species section. */
export async function findRelatedFeatsAndCompanionsForSection(
  db: DataClient,
  contentType: "classes" | "species",
): Promise<RelatedCascadeGroup> {
  const table = contentTypeToTable(contentType)
  const { data } = await db.from(table).select("id")
  const ids = asCompendiumRows(data)
    .map((row) => row.id as string)
    .filter(Boolean)

  const featSeen = new Set<string>()
  const creatureSeen = new Set<string>()
  const abilitySeen = new Set<string>()
  const feats: CompendiumToggleTarget[] = []
  const creatures: CompendiumToggleTarget[] = []
  const abilities: CompendiumToggleTarget[] = []

  for (const id of ids) {
    const related = await findRelatedFeatsAndCompanions(db, contentType, id)
    for (const feat of related.feats) {
      const key = `${feat.table}:${feat.id}`
      if (featSeen.has(key)) continue
      featSeen.add(key)
      feats.push(feat)
    }
    for (const creature of related.creatures) {
      const key = `${creature.table}:${creature.id}`
      if (creatureSeen.has(key)) continue
      creatureSeen.add(key)
      creatures.push(creature)
    }
    for (const ability of related.abilities) {
      const key = `${ability.table}:${ability.id}`
      if (abilitySeen.has(key)) continue
      abilitySeen.add(key)
      abilities.push(ability)
    }
  }

  return {
    feats: feats.sort((a, b) => a.name.localeCompare(b.name)),
    creatures: creatures.sort((a, b) => a.name.localeCompare(b.name)),
    abilities: abilities.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

/**
 * Attached custom abilities that would be orphaned when clearing a section
 * other than classes/species (those use findRelatedFeatsAndCompanionsForSection).
 */
export async function findAttachedAbilitiesForSectionClear(
  db: DataClient,
  contentType: CompendiumContentType,
): Promise<CompendiumToggleTarget[]> {
  if (contentType === "classes" || contentType === "species") return []
  if (contentType === "abilities" || contentType === "creatures") return []
  if (contentType === "languages" || contentType === "tools") return []
  if (contentType === "class_resources") return []

  if (contentType === "equipment" || contentType === "magic_items") {
    const { data } = await db.from("equipment").select("*")
    const rows = asCompendiumRows(data)
    const filtered = rows.filter((row) =>
      contentType === "magic_items"
        ? isMagicItem(row as never)
        : !isMagicItem(row as never),
    )
    return findEquipmentAttachedAbilities(
      db,
      filtered.map((row) => ({
        id: row.id as string,
        name: typeof row.name === "string" ? row.name : null,
        category: typeof row.category === "string" ? row.category : null,
      })),
    )
  }

  const table = contentTypeToTable(contentType)
  const { data } = await db.from(table).select("id")
  const ids = asCompendiumRows(data)
    .map((row) => row.id as string)
    .filter(Boolean)

  const attachType =
    contentType === "subclasses"
      ? "subclass"
      : contentType === "backgrounds"
        ? "background"
        : contentType === "feats"
          ? "feat"
          : contentType === "spells"
            ? "spell"
            : null

  if (!attachType) return []
  return findAttachedAbilities(db, attachType, ids)
}

export async function deleteCompendiumTargets(
  db: DataClient,
  targets: readonly CompendiumToggleTarget[],
): Promise<void> {
  for (const target of targets) {
    if (isProtectedSystemCompendiumItem(target.table, target.id)) continue
    const { error } = await db.from(target.table).delete().eq("id", target.id)
    if (error) throw new Error(error.message ?? `Failed to delete ${target.name}`)
  }
}

export function flattenRelatedCascade(
  group: RelatedCascadeGroup,
  opts: {
    includeFeats: boolean
    includeCreatures: boolean
    includeAbilities?: boolean
  },
): CompendiumToggleTarget[] {
  return [
    ...(opts.includeFeats ? group.feats : []),
    ...(opts.includeCreatures ? group.creatures : []),
    ...(opts.includeAbilities ? group.abilities : []),
  ]
}

export function relatedCascadeHasOptions(group: RelatedCascadeGroup): boolean {
  return group.feats.length > 0 || group.creatures.length > 0 || group.abilities.length > 0
}

export function summarizeRelatedNames(targets: readonly CompendiumToggleTarget[], limit = 8): string {
  const names = targets.map((t) => t.name)
  if (names.length <= limit) return names.join(", ")
  return `${names.slice(0, limit).join(", ")} +${names.length - limit} more`
}

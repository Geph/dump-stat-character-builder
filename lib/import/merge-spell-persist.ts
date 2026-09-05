import {
  collectClassSpellLists,
  spellNameMatchKeys,
  stampClassSpellListsOntoSpellRows,
  unionSpellClassNames,
} from "@/lib/import/class-spell-lists"
import { isSrdSource } from "@/lib/srd/source"

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)
}

function firstFilled(...values: unknown[]): unknown {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value
    if (Array.isArray(value) && value.length) return value
    if (value != null && value !== "" && typeof value !== "string" && !Array.isArray(value)) {
      return value
    }
  }
  return undefined
}

function unionClasses(existing: unknown, incoming: unknown): string[] {
  return unionSpellClassNames(asStringArray(existing), asStringArray(incoming))
}

function asSourceString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function isEmptyWriteup(value: unknown): boolean {
  return typeof value !== "string" || !value.trim()
}

/**
 * Keep the catalog row's publisher label unless the importer explicitly overwrote
 * this spell. Class-list stubs must not relabel an SRD (or other existing) row.
 * An SRD re-seed may restore the SRD label onto a stub that previously stole it.
 */
export function mergeSpellSource(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  replaceSource = false,
): unknown {
  if (replaceSource) {
    return firstFilled(incoming.source, existing.source) ?? incoming.source
  }
  const existingSource = asSourceString(existing.source)
  const incomingSource = asSourceString(incoming.source)
  if (existingSource && isSrdSource(existingSource) && !isSrdSource(incomingSource)) {
    return existing.source
  }
  if (
    incomingSource &&
    isSrdSource(incomingSource) &&
    isEmptyWriteup(existing.description) &&
    !isEmptyWriteup(incoming.description)
  ) {
    return incoming.source
  }
  return firstFilled(existing.source, incoming.source) ?? incoming.source
}

function nameMatchesReplaceSet(name: unknown, replaceNames: Set<string> | undefined): boolean {
  if (!replaceNames?.size) return false
  const raw = String(name ?? "").trim()
  if (replaceNames.has(raw.toLowerCase())) return true
  return spellNameMatchKeys(raw).some((key) => replaceNames.has(key))
}

/**
 * Keep a richer catalog row (SRD write-up) when a later class import only has a
 * list stub. Always union `classes` so Investigator (and similar) tags stick.
 */
export function mergeSpellRowForPersist(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  options?: { replaceSource?: boolean },
): Record<string, unknown> {
  const preferIncoming = options?.replaceSource === true
  const pick = (existingValue: unknown, incomingValue: unknown) =>
    preferIncoming
      ? firstFilled(incomingValue, existingValue) ?? incomingValue
      : firstFilled(existingValue, incomingValue) ?? incomingValue
  return {
    ...existing,
    ...incoming,
    id: existing.id,
    name: existing.name ?? incoming.name,
    created_at: existing.created_at ?? incoming.created_at,
    description: pick(existing.description, incoming.description),
    casting_time: pick(existing.casting_time, incoming.casting_time),
    range: pick(existing.range, incoming.range),
    components: pick(existing.components, incoming.components),
    duration: pick(existing.duration, incoming.duration),
    material: pick(existing.material, incoming.material),
    higher_levels: pick(existing.higher_levels, incoming.higher_levels),
    school: pick(existing.school, incoming.school),
    source: mergeSpellSource(existing, incoming, preferIncoming),
    classes: unionClasses(existing.classes, incoming.classes),
    enabled: "enabled" in existing ? existing.enabled : incoming.enabled,
  }
}

export function mergeIncomingSpellsWithExisting(
  incoming: Record<string, unknown>[],
  existing: Record<string, unknown>[],
  options?: { replaceSourceNames?: Iterable<string> },
): Record<string, unknown>[] {
  const replaceNames = new Set(
    [...(options?.replaceSourceNames ?? [])].map((name) => String(name).trim().toLowerCase()).filter(Boolean),
  )
  const byName = new Map<string, Record<string, unknown>>()
  for (const row of existing) {
    for (const key of spellNameMatchKeys(String(row.name ?? ""))) {
      if (key && !byName.has(key)) byName.set(key, row)
    }
  }
  return incoming.map((row) => {
    const prev = spellNameMatchKeys(String(row.name ?? ""))
      .map((key) => byName.get(key))
      .find((entry): entry is Record<string, unknown> => Boolean(entry))
    return prev
      ? mergeSpellRowForPersist(prev, row, {
          replaceSource: nameMatchesReplaceSet(row.name ?? prev.name, replaceNames),
        })
      : row
  })
}

/**
 * Catalog patches for linked/skipped existing spells, plus incoming rows after
 * merge + class-list stamps. Call on every class or spell persist.
 */
export function spellRowsToUpsertForClassLists(params: {
  existingSpells: Record<string, unknown>[]
  existingClasses?: Record<string, unknown>[]
  incomingClasses?: Record<string, unknown>[]
  incomingSpells?: Record<string, unknown>[]
  /** Lowercased (or match-key) names the importer explicitly chose to overwrite. */
  replaceSourceNames?: Iterable<string>
}): { catalogPatches: Record<string, unknown>[]; incoming: Record<string, unknown>[] } {
  const lists = collectClassSpellLists([
    ...(params.existingClasses ?? []),
    ...(params.incomingClasses ?? []),
  ])
  const incomingMerged = params.incomingSpells?.length
    ? mergeIncomingSpellsWithExisting(params.incomingSpells, params.existingSpells, {
        replaceSourceNames: params.replaceSourceNames,
      })
    : []
  const incomingKeys = new Set(
    incomingMerged.flatMap((row) => spellNameMatchKeys(String(row.name ?? ""))),
  )
  const catalogPatches = stampClassSpellListsOntoSpellRows(params.existingSpells, lists).changed.filter(
    (row) => !spellNameMatchKeys(String(row.name ?? "")).some((key) => incomingKeys.has(key)),
  )
  const incoming = stampClassSpellListsOntoSpellRows(incomingMerged, lists).all
  return { catalogPatches, incoming }
}

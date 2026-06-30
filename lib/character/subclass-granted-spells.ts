import type { Feature, Subclass } from "@/lib/types"
import { featureChoiceKey } from "@/lib/builder/choices"
import {
  isSubclassSpellTableFeature,
  parseSubclassSpellTable,
  resolveSpellNamesToIds,
} from "@/lib/import/subclass-spell-table"

export type GrantedSpell = {
  spellId: string
  /** Class level at which the spell becomes always prepared. */
  unlocksAtClassLevel: number
}

type SpellCatalogEntry = { id: string; name: string }

/** Read always-prepared spell IDs already populated on a feature's spells_known modifiers. */
function spellsFromFeatureModifiers(feature: Feature, classLevel: number): GrantedSpell[] {
  const out: GrantedSpell[] = []
  for (const instance of feature.linkedModifiers ?? []) {
    for (const char of instance.characteristics ?? []) {
      if (char.type !== "spells_known") continue
      if (!char.alwaysPrepared && !(char.spells ?? []).some((entry) => entry.alwaysPrepared)) {
        continue
      }
      for (const entry of char.spells ?? []) {
        if (!entry.spellId) continue
        const unlocks = entry.unlocksAtClassLevel ?? feature.level
        if (unlocks > classLevel) continue
        out.push({ spellId: entry.spellId, unlocksAtClassLevel: unlocks })
      }
    }
  }
  return out
}

/** Resolve always-prepared spell IDs from a feature's spell table prose/HTML. */
function spellsFromFeatureTable(
  feature: Feature,
  classLevel: number,
  spellCatalog: SpellCatalogEntry[],
): GrantedSpell[] {
  const name = feature.name ?? ""
  const description = feature.description ?? ""
  if (!isSubclassSpellTableFeature(name, description)) return []
  const parsed = parseSubclassSpellTable(description)
  if (!parsed) return []

  const out: GrantedSpell[] = []
  for (const row of parsed.rows) {
    if (row.unlocksAtClassLevel > classLevel) continue
    const { resolved } = resolveSpellNamesToIds(row.spellNames, spellCatalog)
    for (const spell of resolved) {
      out.push({ spellId: spell.spellId, unlocksAtClassLevel: row.unlocksAtClassLevel })
    }
  }
  return out
}

/** Always-prepared spells from the player's chosen option(s) of a rest-swappable choice feature. */
function spellsFromChosenOptions(
  feature: Feature,
  classLevel: number,
  spellCatalog: SpellCatalogEntry[],
  classId: string,
  featureChoicePicks: Record<string, string[]>,
): GrantedSpell[] {
  if (!feature.isChoice || !feature.choices?.options?.length) return []
  const key = featureChoiceKey(classId, feature.name, feature.level)
  const picked = featureChoicePicks[key] ?? []
  if (!picked.length) return []

  const out: GrantedSpell[] = []
  for (const optionName of picked) {
    const option = feature.choices.options.find((entry) => entry.name === optionName)
    if (!option) continue
    // Spell IDs wired directly onto the option's modifiers.
    for (const instance of option.linkedModifiers ?? []) {
      for (const char of instance.characteristics ?? []) {
        if (char.type !== "spells_known") continue
        if (!char.alwaysPrepared && !(char.spells ?? []).some((entry) => entry.alwaysPrepared)) continue
        for (const entry of char.spells ?? []) {
          if (!entry.spellId) continue
          const unlocks = entry.unlocksAtClassLevel ?? feature.level
          if (unlocks > classLevel) continue
          out.push({ spellId: entry.spellId, unlocksAtClassLevel: unlocks })
        }
      }
    }
    // Spell table embedded in the option description (e.g. each Circle of the Land land table).
    const description = option.description ?? ""
    if (!isSubclassSpellTableFeature(feature.name ?? "", description)) continue
    const parsed = parseSubclassSpellTable(description)
    if (!parsed) continue
    for (const row of parsed.rows) {
      if (row.unlocksAtClassLevel > classLevel) continue
      const { resolved } = resolveSpellNamesToIds(row.spellNames, spellCatalog)
      for (const spell of resolved) {
        out.push({ spellId: spell.spellId, unlocksAtClassLevel: row.unlocksAtClassLevel })
      }
    }
  }
  return out
}

/**
 * Collect a subclass's always-prepared (domain/oath/etc.) spells for a given class level.
 * Prefers spell IDs already wired onto the feature's spells_known modifiers, and falls back
 * to parsing the feature's spell table when those modifiers are unpopulated (e.g. SRD seed
 * placeholders). Spells gated by `unlocksAtClassLevel` above the current level are excluded.
 *
 * When a feature is a rest-swappable choice (e.g. Circle of the Land's land type), the spells
 * come from the player's chosen option rather than the feature's combined description.
 */
export function collectSubclassAlwaysPreparedSpells(
  subclassFeatures: Feature[] | null | undefined,
  classLevel: number,
  spellCatalog: SpellCatalogEntry[],
  options?: { classId?: string; featureChoicePicks?: Record<string, string[]> },
): GrantedSpell[] {
  if (!subclassFeatures?.length) return []

  const byId = new Map<string, GrantedSpell>()
  const add = (grant: GrantedSpell) => {
    const existing = byId.get(grant.spellId)
    if (!existing || grant.unlocksAtClassLevel < existing.unlocksAtClassLevel) {
      byId.set(grant.spellId, grant)
    }
  }

  const classId = options?.classId ?? ""
  const featureChoicePicks = options?.featureChoicePicks ?? {}

  for (const feature of subclassFeatures) {
    if (feature.level > classLevel) continue

    // Rest-swappable choice feature: spells follow the active option only.
    if (feature.isChoice && feature.choices?.swappableOnRest && feature.choices.options?.length) {
      spellsFromChosenOptions(feature, classLevel, spellCatalog, classId, featureChoicePicks).forEach(add)
      continue
    }

    const fromModifiers = spellsFromFeatureModifiers(feature, classLevel)
    if (fromModifiers.length) {
      fromModifiers.forEach(add)
      continue
    }
    spellsFromFeatureTable(feature, classLevel, spellCatalog).forEach(add)
  }

  return [...byId.values()]
}

/** Convenience: collect granted spell IDs across all of a character's subclasses. */
export function collectSubclassAlwaysPreparedSpellIds(
  entries: { subclass: Subclass | null | undefined; classLevel: number }[],
  spellCatalog: SpellCatalogEntry[],
): string[] {
  const ids = new Set<string>()
  for (const entry of entries) {
    const features = (entry.subclass?.features as Feature[] | undefined) ?? []
    for (const grant of collectSubclassAlwaysPreparedSpells(features, entry.classLevel, spellCatalog)) {
      ids.add(grant.spellId)
    }
  }
  return [...ids]
}

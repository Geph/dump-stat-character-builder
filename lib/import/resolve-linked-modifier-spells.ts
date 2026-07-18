import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import {
  resolvePreferredNameMatch,
  type NamedSourceRow,
} from "@/lib/compendium/prefer-same-source"
import { isAliasRoutableSpellName } from "@/lib/compendium/spell-name-aliases"
import { resolveSpellNamesToIds } from "@/lib/import/subclass-spell-table"
import type { Feature, FeatureChoice } from "@/lib/types"

export const IMPORT_SPELL_NAME_PREFIX = "import_spell_name:"

export function spellNamePlaceholder(spellName: string): string {
  return `${IMPORT_SPELL_NAME_PREFIX}${spellName.trim()}`
}

function isSpellNamePlaceholder(spellId: string): boolean {
  return spellId.startsWith(IMPORT_SPELL_NAME_PREFIX)
}

function spellNameFromPlaceholder(spellId: string): string {
  return spellId.slice(IMPORT_SPELL_NAME_PREFIX.length).trim()
}

/** True when spellId is already a real catalog row id. */
function isCatalogSpellId(spellId: string, catalogIds: Set<string>): boolean {
  return catalogIds.has(spellId)
}

/**
 * Resolve a stored spellId to a catalog id.
 * Handles import placeholders (`import_spell_name:Fireball`) and bare names left
 * on spells_known entries when auto-wiring never ran a catalog pass.
 * Alias stubs already stored as catalog ids (e.g. Feeblemind) redirect to the
 * canonical filled row (Befuddlement) when present.
 */
function resolveSpellIdEntry(
  spellId: string,
  catalog: NamedSourceRow[],
  catalogIds: Set<string>,
  preferredSource?: string | null,
): string {
  if (!spellId.trim()) return spellId

  if (isCatalogSpellId(spellId, catalogIds)) {
    const row = catalog.find((entry) => entry.id === spellId)
    if (row && isAliasRoutableSpellName(row.name)) {
      const routed = resolvePreferredNameMatch(row.name, catalog, preferredSource)
      if (routed?.id) return routed.id
    }
    return spellId
  }

  const name = isSpellNamePlaceholder(spellId)
    ? spellNameFromPlaceholder(spellId)
    : spellId.trim()
  if (!name) return spellId

  const { resolved } = resolveSpellNamesToIds([name], catalog, preferredSource)
  return resolved[0]?.spellId ?? spellId
}

/** Resolve import spell-name placeholders on linked modifiers to catalog spell IDs. */
export function resolveLinkedModifierSpells(
  linkedModifiers: LinkedModifierInstance[] | undefined,
  catalog: NamedSourceRow[],
  preferredSource?: string | null,
): LinkedModifierInstance[] | undefined {
  if (!linkedModifiers?.length || !catalog.length) return linkedModifiers

  const catalogIds = new Set(
    catalog.map((row) => row.id).filter((id): id is string => Boolean(id)),
  )

  return linkedModifiers.map((instance) => ({
    ...instance,
    characteristics: instance.characteristics?.map((char) => {
      if (char.type !== "spells_known") return char

      const spells = (char.spells ?? []).map((entry) => {
        if (!entry.spellId) return entry
        const nextId = resolveSpellIdEntry(
          entry.spellId,
          catalog,
          catalogIds,
          preferredSource,
        )
        if (nextId === entry.spellId) return entry
        return { ...entry, spellId: nextId }
      })

      return { ...char, spells }
    }),
  }))
}

function resolveChoiceOptionSpells(
  choices: FeatureChoice | null | undefined,
  catalog: NamedSourceRow[],
  preferredSource?: string | null,
): FeatureChoice | null | undefined {
  if (!choices?.options?.length) return choices
  return {
    ...choices,
    options: choices.options.map((option) => {
      const linkedModifiers = resolveLinkedModifierSpells(
        option.linkedModifiers,
        catalog,
        preferredSource,
      )
      if (linkedModifiers === option.linkedModifiers) return option
      return { ...option, linkedModifiers }
    }),
  }
}

/** Resolve spells_known placeholders on a feature and its choice options. */
export function resolveFeatureLinkedSpells(
  feature: Feature,
  catalog: NamedSourceRow[],
  preferredSource?: string | null,
): Feature {
  if (!catalog.length) return feature
  const linkedModifiers = resolveLinkedModifierSpells(
    feature.linkedModifiers,
    catalog,
    preferredSource,
  )
  const choices = resolveChoiceOptionSpells(feature.choices, catalog, preferredSource)
  if (linkedModifiers === feature.linkedModifiers && choices === feature.choices) {
    return feature
  }
  return {
    ...feature,
    ...(linkedModifiers !== undefined ? { linkedModifiers } : {}),
    ...(choices !== undefined ? { choices: choices ?? undefined } : {}),
  }
}

/** Resolve spells_known on a FeatureChoice's options (ability talents / specializations). */
export function resolveFeatureChoiceLinkedSpells(
  choices: FeatureChoice | null | undefined,
  catalog: NamedSourceRow[],
  preferredSource?: string | null,
): FeatureChoice | null | undefined {
  return resolveChoiceOptionSpells(choices, catalog, preferredSource)
}

/** Resolve spells_known on every feature in a list (class/subclass/species traits). */
export function resolveFeatureListLinkedSpells(
  features: Feature[] | null | undefined,
  catalog: NamedSourceRow[],
  preferredSource?: string | null,
): Feature[] | null | undefined {
  if (!features?.length || !catalog.length) return features
  return features.map((feature) =>
    resolveFeatureLinkedSpells(feature, catalog, preferredSource),
  )
}

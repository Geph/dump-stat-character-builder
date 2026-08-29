import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import {
  resolvePreferredNameMatch,
  type NamedSourceRow,
} from "@/lib/compendium/prefer-same-source"
import { isAliasRoutableSpellName } from "@/lib/compendium/spell-name-aliases"
import { resolveSpellNamesToIds } from "@/lib/import/subclass-spell-table"
import type { Feature, FeatureChoice, Species, Trait } from "@/lib/types"

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

const IMPORT_SLUG_PREFIX = /^import:/i
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Print-name lookup key stored as `import:hold person` or `import_spell_name:Hold Person`. */
export function spellLookupNameFromId(spellId: string): string {
  const trimmed = spellId.trim()
  if (isSpellNamePlaceholder(trimmed)) return spellNameFromPlaceholder(trimmed)
  if (IMPORT_SLUG_PREFIX.test(trimmed)) return trimmed.replace(IMPORT_SLUG_PREFIX, "").trim()
  return trimmed
}

function titleCaseSpellWords(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
}

function looksLikeStoredSpellId(value: string): boolean {
  const trimmed = value.trim()
  return (
    !trimmed ||
    IMPORT_SLUG_PREFIX.test(trimmed) ||
    isSpellNamePlaceholder(trimmed) ||
    UUID_RE.test(trimmed)
  )
}

/** Human label for a stored spell grant (catalog id, import slug, or print name). */
export function formatSpellGrantDisplayName(
  spellId: string,
  catalog: NamedSourceRow[] = [],
): string {
  const trimmed = spellId.trim()
  if (!trimmed) return ""
  const printableCatalogName = (name: string | null | undefined): string => {
    const value = name?.trim() ?? ""
    return value && !looksLikeStoredSpellId(value) ? value : ""
  }
  const byId = catalog.find((row) => row.id === trimmed)
  const fromId = printableCatalogName(byId?.name)
  if (fromId) return fromId
  if (catalog.length) {
    const resolved = resolveSpellIdAgainstCatalog(trimmed, catalog)
    const row = catalog.find((entry) => entry.id === resolved)
    const fromResolved = printableCatalogName(row?.name)
    if (fromResolved) return fromResolved
  }
  const lookup = spellLookupNameFromId(trimmed)
  if (UUID_RE.test(lookup)) return ""
  if (lookup && lookup !== trimmed) return titleCaseSpellWords(lookup)
  if (looksLikeStoredSpellId(trimmed)) return ""
  return titleCaseSpellWords(lookup)
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
export function resolveSpellIdEntry(
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

  const name = spellLookupNameFromId(spellId)
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

/** Resolve a stored spell id or print name to a catalog row id when possible. */
export function resolveSpellIdAgainstCatalog(
  spellId: string,
  catalog: NamedSourceRow[],
  preferredSource?: string | null,
): string {
  const catalogIds = new Set(
    catalog.map((row) => row.id).filter((id): id is string => Boolean(id)),
  )
  return resolveSpellIdEntry(spellId, catalog, catalogIds, preferredSource)
}

/** Resolve name-based species trait / option spell grants to catalog ids. */
export function resolveSpeciesLinkedSpells(
  species: Species | null | undefined,
  catalog: NamedSourceRow[],
): Species | null | undefined {
  if (!species || !catalog.length) return species
  const preferredSource = species.source
  const existing = species.linkedModifiers ?? undefined
  const linkedModifiers = resolveLinkedModifierSpells(existing, catalog, preferredSource)
  const traits = resolveFeatureListLinkedSpells(
    species.traits as Feature[] | undefined,
    catalog,
    preferredSource,
  ) as Trait[] | undefined
  if (linkedModifiers === existing && traits === species.traits) {
    return species
  }
  return {
    ...species,
    ...(linkedModifiers !== undefined ? { linkedModifiers } : {}),
    ...(traits !== undefined ? { traits } : {}),
  }
}

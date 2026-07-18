import type { SpellsKnownEntry } from "@/lib/compendium/characteristic-modifiers"
import { FEAT_MODIFIER_CATALOG } from "@/lib/compendium/enrich-srd-feats"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import {
  parseSubclassSpellTable,
  resolveSpellNamesToIds,
} from "@/lib/import/subclass-spell-table"
import type { Feature, FeatureChoice } from "@/lib/types"

function modId(label: string): string {
  return `mod_${label.replace(/\s+/g, "_").toLowerCase()}`
}

function spellsKnownModifier(
  label: string,
  spellEntries: SpellsKnownEntry[],
  instanceKey: string,
): LinkedModifierInstance {
  return {
    instanceId: `modinst_subclass_spells_${instanceKey}`,
    catalogRefId: FEAT_MODIFIER_CATALOG.spellsKnown,
    characteristics: [
      {
        id: modId(`subclass_spells_${instanceKey}`),
        type: "spells_known",
        spells: spellEntries,
        alwaysPrepared: true,
        label,
      },
    ],
  }
}

function mergeSpellEntries(
  existing: SpellsKnownEntry[],
  additions: SpellsKnownEntry[],
): SpellsKnownEntry[] {
  const merged = [...existing]
  for (const entry of additions) {
    const duplicate = merged.find(
      (item) =>
        item.spellId === entry.spellId &&
        (item.unlocksAtClassLevel ?? 0) === (entry.unlocksAtClassLevel ?? 0),
    )
    if (!duplicate) merged.push(entry)
  }
  return merged
}

function upsertSpellsKnownOnLinked(
  linked: LinkedModifierInstance[] | undefined,
  label: string,
  spellEntries: SpellsKnownEntry[],
  instanceKey: string,
): LinkedModifierInstance[] {
  if (spellEntries.length === 0) return linked ?? []

  const next = [...(linked ?? [])]
  const spellsKnownIndex = next.findIndex((instance) =>
    (instance.characteristics ?? []).some((char) => char.type === "spells_known"),
  )

  if (spellsKnownIndex >= 0) {
    const instance = next[spellsKnownIndex]
    const characteristics = (instance.characteristics ?? []).map((char) => {
      if (char.type !== "spells_known") return char
      return {
        ...char,
        alwaysPrepared: true,
        spells: mergeSpellEntries(char.spells ?? [], spellEntries),
        label: char.label ?? label,
      }
    })
    next[spellsKnownIndex] = { ...instance, characteristics }
  } else {
    next.push(spellsKnownModifier(label, spellEntries, instanceKey))
  }
  return next
}

function upsertSpellsKnownModifier(
  feature: Feature,
  spellEntries: SpellsKnownEntry[],
): Feature {
  if (spellEntries.length === 0) return feature
  const label = (feature.name ?? "Subclass spells").replace(/\s*spells$/i, " spells").trim()
  const instanceKey = label.replace(/\s+/g, "_")
  return syncModifierRefs({
    ...feature,
    linkedModifiers: upsertSpellsKnownOnLinked(
      feature.linkedModifiers,
      label,
      spellEntries,
      instanceKey,
    ),
  })
}

function spellEntriesFromTableDescription(
  description: string,
  spellCatalog: { id: string; name: string; source?: string | null }[],
  preferredSource?: string | null,
): SpellsKnownEntry[] {
  const parsed = parseSubclassSpellTable(description)
  if (!parsed || parsed.ambiguousMultiTable || !parsed.rows.length) return []

  const spellEntries: SpellsKnownEntry[] = []
  for (const tableRow of parsed.rows) {
    const { resolved } = resolveSpellNamesToIds(
      tableRow.spellNames,
      spellCatalog,
      preferredSource,
    )
    for (const spell of resolved) {
      spellEntries.push({
        spellId: spell.spellId,
        prepared: true,
        alwaysPrepared: true,
        unlocksAtClassLevel: tableRow.unlocksAtClassLevel,
      })
    }
  }
  return spellEntries
}

/**
 * Drop empty always-prepared Spells Known placeholders on choice features once
 * real spell lists live on the chosen options (e.g. Circle of the Land land types).
 */
function clearEmptyFeatureSpellsKnownPlaceholder(feature: Feature): Feature {
  if (!feature.choices?.swappableOnRest) return feature
  const linked = feature.linkedModifiers ?? []
  if (!linked.length) return feature

  const filtered = linked.filter((instance) => {
    const chars = instance.characteristics ?? []
    if (!chars.length) return true
    const onlyEmptySpellsKnown = chars.every(
      (char) => char.type === "spells_known" && !(char.spells?.length),
    )
    return !onlyEmptySpellsKnown
  })
  if (filtered.length === linked.length) return feature
  return syncModifierRefs({ ...feature, linkedModifiers: filtered })
}

/**
 * Wire spells_known onto feature choice options whose descriptions embed a spell table
 * (Circle of the Land land types, and similar rest-swappable subtype lists).
 */
export function enrichSubclassChoiceOptionSpells(
  feature: Feature,
  spellCatalog: { id: string; name: string; source?: string | null }[],
  preferredSource?: string | null,
): Feature {
  const choices = feature.choices
  if (!choices?.options?.length || !spellCatalog.length) return feature

  let wiredAny = false
  const options = choices.options.map((option) => {
    const description = option.description ?? ""
    if (!/<table/i.test(description) && !/\bspell/i.test(description)) return option

    const spellEntries = spellEntriesFromTableDescription(
      description,
      spellCatalog,
      preferredSource,
    )
    if (!spellEntries.length) return option

    wiredAny = true
    const label = `${option.name} spells`
    const instanceKey = `${(feature.name ?? "feature").replace(/\s+/g, "_")}_${option.name}`.toLowerCase()
    return {
      ...option,
      linkedModifiers: upsertSpellsKnownOnLinked(
        option.linkedModifiers,
        label,
        spellEntries,
        instanceKey,
      ),
    }
  })

  if (!wiredAny) return feature

  const next: Feature = {
    ...feature,
    isChoice: true,
    choices: { ...choices, options } satisfies FeatureChoice,
  }
  return clearEmptyFeatureSpellsKnownPlaceholder(next)
}

/** Parse subclass spell tables and attach always-prepared spell links to features. */
export function enrichSubclassSpellTableFeatures(
  row: Record<string, unknown>,
  spellCatalog: { id: string; name: string; source?: string | null }[],
  preferredSource?: string | null,
): Record<string, unknown> {
  const features = row.features
  if (!Array.isArray(features) || !spellCatalog.length) return row

  const nextFeatures = features.map((raw) => {
    let feature = raw as Feature

    // Rest-swappable / multi-subtype choice: wire each option's own table.
    if (feature.choices?.options?.length) {
      feature = enrichSubclassChoiceOptionSpells(feature, spellCatalog, preferredSource)
    }

    const name = feature.name ?? ""
    const description = feature.description ?? ""
    // Feature-level single table (domain/oath/circle with one list).
    if (/\bspells\b/i.test(name)) {
      const spellEntries = spellEntriesFromTableDescription(
        description,
        spellCatalog,
        preferredSource,
      )
      if (spellEntries.length) {
        feature = upsertSpellsKnownModifier(feature, spellEntries)
      }
    }

    return feature
  })

  return { ...row, features: nextFeatures }
}

import type { SpellsKnownEntry } from "@/lib/compendium/characteristic-modifiers"
import { FEAT_MODIFIER_CATALOG } from "@/lib/compendium/enrich-srd-feats"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import {
  isSubclassSpellTableFeature,
  parseSubclassSpellTable,
  resolveSpellNamesToIds,
} from "@/lib/import/subclass-spell-table"
import type { Feature } from "@/lib/types"

function modId(label: string): string {
  return `mod_${label.replace(/\s+/g, "_").toLowerCase()}`
}

function spellsKnownModifier(
  featureName: string,
  spellEntries: SpellsKnownEntry[],
): LinkedModifierInstance {
  const label = featureName.replace(/\s*spells$/i, " spells").trim()
  const instanceKey = label.replace(/\s+/g, "_")
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

function upsertSpellsKnownModifier(
  feature: Feature,
  spellEntries: SpellsKnownEntry[],
): Feature {
  if (spellEntries.length === 0) return feature

  const linked = [...(feature.linkedModifiers ?? [])]
  const spellsKnownIndex = linked.findIndex((instance) =>
    (instance.characteristics ?? []).some((char) => char.type === "spells_known"),
  )

  if (spellsKnownIndex >= 0) {
    const instance = linked[spellsKnownIndex]
    const characteristics = (instance.characteristics ?? []).map((char) => {
      if (char.type !== "spells_known") return char
      return {
        ...char,
        alwaysPrepared: true,
        spells: mergeSpellEntries(char.spells ?? [], spellEntries),
      }
    })
    linked[spellsKnownIndex] = { ...instance, characteristics }
  } else {
    linked.push(spellsKnownModifier(feature.name ?? "Subclass spells", spellEntries))
  }

  return syncModifierRefs({
    ...feature,
    linkedModifiers: linked,
  })
}

/** Parse subclass spell tables and attach always-prepared spell links to features. */
export function enrichSubclassSpellTableFeatures(
  row: Record<string, unknown>,
  spellCatalog: { id: string; name: string }[],
): Record<string, unknown> {
  const features = row.features
  if (!Array.isArray(features)) return row

  const nextFeatures = features.map((raw) => {
    const feature = raw as Feature
    const name = feature.name ?? ""
    const description = feature.description ?? ""
    if (!isSubclassSpellTableFeature(name, description)) return feature

    const parsed = parseSubclassSpellTable(description)
    if (!parsed || parsed.ambiguousMultiTable) return feature

    const spellEntries: SpellsKnownEntry[] = []
    for (const tableRow of parsed.rows) {
      const { resolved } = resolveSpellNamesToIds(tableRow.spellNames, spellCatalog)
      for (const spell of resolved) {
        spellEntries.push({
          spellId: spell.spellId,
          prepared: true,
          alwaysPrepared: true,
          unlocksAtClassLevel: tableRow.unlocksAtClassLevel,
        })
      }
    }

    return upsertSpellsKnownModifier(feature, spellEntries)
  })

  return { ...row, features: nextFeatures }
}

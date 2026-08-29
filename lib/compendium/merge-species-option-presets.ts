import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { canonicalSpellLookupKey } from "@/lib/compendium/spell-name-aliases"
import { IMPORT_SPELL_NAME_PREFIX } from "@/lib/import/resolve-linked-modifier-spells"

function spellLookupKey(spellId: string): string {
  const trimmed = spellId.trim()
  const name = trimmed.startsWith(IMPORT_SPELL_NAME_PREFIX)
    ? trimmed.slice(IMPORT_SPELL_NAME_PREFIX.length)
    : trimmed
  return canonicalSpellLookupKey(name)
}

function characteristicTypes(instance: LinkedModifierInstance): Set<string> {
  return new Set((instance.characteristics ?? []).map((char) => char.type))
}

/** Canonical spell keys already present on an option (names, placeholders, or ids). */
export function collectSpellKeysFromModifiers(
  instances: LinkedModifierInstance[] | undefined,
): Set<string> {
  const keys = new Set<string>()
  for (const instance of instances ?? []) {
    for (const char of instance.characteristics ?? []) {
      if (char.type !== "spells_known") continue
      for (const entry of char.spells ?? []) {
        if (!entry.spellId?.trim()) continue
        keys.add(spellLookupKey(entry.spellId))
      }
    }
  }
  return keys
}

/**
 * Add lineage/legacy preset modifiers the option is missing. Import detection often
 * attaches speed or resistance first, which used to block the full spell grant.
 */
export function mergeOptionPresetModifiers(
  existing: LinkedModifierInstance[] | undefined,
  preset: LinkedModifierInstance[],
): LinkedModifierInstance[] {
  if (!preset.length) return existing ?? []

  const original = existing ?? []
  const result = [...original]
  let changed = false
  const haveSpells = collectSpellKeysFromModifiers(result)

  for (const instance of preset) {
    const types = characteristicTypes(instance)
    if (types.has("spells_known")) {
      const presetEntries = (instance.characteristics ?? []).flatMap((char) =>
        char.type === "spells_known" ? (char.spells ?? []) : [],
      )
      const presetByKey = new Map(
        presetEntries
          .filter((entry) => entry.spellId)
          .map((entry) => [spellLookupKey(entry.spellId), entry] as const),
      )
      const missingEntries = [...presetByKey.entries()]
        .filter(([key]) => !haveSpells.has(key))
        .map(([, entry]) => entry)

      const existingSpellIndex = result.findIndex((entry) =>
        characteristicTypes(entry).has("spells_known"),
      )
      if (existingSpellIndex >= 0) {
        const target = result[existingSpellIndex]!
        let patched = false
        const nextCharacteristics = (target.characteristics ?? []).map((char) => {
          if (char.type !== "spells_known") return char
          const spells = (char.spells ?? []).map((entry) => {
            if (!entry.spellId) return entry
            const presetEntry = presetByKey.get(spellLookupKey(entry.spellId))
            if (!presetEntry) return entry
            const nextFree = presetEntry.freeCastPerLongRest
            if (
              nextFree == null ||
              entry.freeCastPerLongRest === nextFree
            ) {
              return entry
            }
            patched = true
            return { ...entry, freeCastPerLongRest: nextFree }
          })
          if (!missingEntries.length && !patched) return char
          return { ...char, spells: [...spells, ...missingEntries] }
        })
        if (missingEntries.length || patched) {
          result[existingSpellIndex] = { ...target, characteristics: nextCharacteristics }
          changed = true
        }
      } else if (missingEntries.length) {
        result.push(instance)
        changed = true
      }
      for (const key of presetByKey.keys()) haveSpells.add(key)
      continue
    }

    if (types.has("spellcasting_ability")) {
      const hasChoice = result.some((entry) =>
        (entry.characteristics ?? []).some(
          (char) =>
            char.type === "spellcasting_ability" && (char.abilityOptions?.length ?? 0) > 1,
        ),
      )
      if (!hasChoice) {
        result.push(instance)
        changed = true
      }
      continue
    }

    const hasType = result.some((entry) => {
      const existingTypes = characteristicTypes(entry)
      return [...types].some((type) => existingTypes.has(type))
    })
    if (!hasType) {
      result.push(instance)
      changed = true
    }
  }

  return changed ? result : original
}

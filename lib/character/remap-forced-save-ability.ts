import {
  abilityModifierKeyToScoreKey,
  type AbilityModifierKey,
  type AbilityScoreKey,
  type ForcedSaveAbilityRemapCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"

function normalizeSaveAbilityKey(
  value: string | null | undefined,
): AbilityScoreKey | AbilityModifierKey | null {
  if (!value?.trim()) return null
  const raw = value.trim()
  const upper = raw.toUpperCase()
  if (["STR", "DEX", "CON", "INT", "WIS", "CHA"].includes(upper)) {
    return upper as AbilityModifierKey
  }
  const lower = raw.toLowerCase()
  const map: Record<string, AbilityScoreKey> = {
    strength: "strength",
    dexterity: "dexterity",
    constitution: "constitution",
    intelligence: "intelligence",
    wisdom: "wisdom",
    charisma: "charisma",
  }
  return map[lower] ?? null
}

function toModifierKey(value: AbilityScoreKey | AbilityModifierKey): AbilityModifierKey {
  if (value.length === 3) return value as AbilityModifierKey
  const map: Record<AbilityScoreKey, AbilityModifierKey> = {
    strength: "STR",
    dexterity: "DEX",
    constitution: "CON",
    intelligence: "INT",
    wisdom: "WIS",
    charisma: "CHA",
  }
  return map[value as AbilityScoreKey]
}

/**
 * Apply forced-save remaps (e.g. "targets make Int saves instead of Wis against your features").
 * Returns the remapped ability string in the same style as the input when possible.
 */
export function remapForcedSaveAbility(
  saveAbility: string | null | undefined,
  remaps: ForcedSaveAbilityRemapCharacteristic[] | null | undefined,
  scope: ForcedSaveAbilityRemapCharacteristic["scope"] = "your_features",
): string | null | undefined {
  if (!saveAbility || !remaps?.length) return saveAbility
  const normalized = normalizeSaveAbilityKey(saveAbility)
  if (!normalized) return saveAbility

  for (const remap of remaps) {
    if (remap.scope !== "all" && remap.scope !== scope) continue
    const from = remap.fromAbility
    if (from !== "any") {
      const fromKey = abilityModifierKeyToScoreKey(from)
      const normalizedScore =
        typeof normalized === "string" && normalized.length === 3
          ? abilityModifierKeyToScoreKey(normalized as AbilityModifierKey)
          : (normalized as AbilityScoreKey)
      if (fromKey !== normalizedScore && from !== toModifierKey(normalizedScore)) continue
    }
    // Prefer matching the input style (STR vs Strength).
    if (saveAbility.trim().length <= 3) return remap.toAbility
    return abilityModifierKeyToScoreKey(remap.toAbility).replace(/^\w/, (c) => c.toUpperCase())
  }
  return saveAbility
}

import { canonicalSpellLookupKey } from "@/lib/compendium/spell-name-aliases"
import type { Feature } from "@/lib/types"

type FeatureLike = Pick<Feature, "linkedModifiers">

/**
 * Spells a feature lets you cast without expending a slot — "You can cast Identify and Locate
 * Object without a spell slot or components" wires to cast_spell effects with
 * castSpellWithoutSlot, and the sheet waives the slot when one of those spells is cast.
 */
export function collectFreeCastSpellKeys(
  features: Array<FeatureLike | null | undefined>,
): Set<string> {
  const keys = new Set<string>()
  for (const feature of features) {
    for (const instance of feature?.linkedModifiers ?? []) {
      for (const effect of instance.activation?.effects ?? []) {
        if (effect.kind !== "cast_spell" || !effect.castSpellWithoutSlot) continue
        const name = effect.castSpellName?.trim()
        if (!name) continue
        keys.add(canonicalSpellLookupKey(name))
      }
    }
  }
  return keys
}

export function isFreeCastSpell(
  freeCastKeys: Set<string>,
  spellName: string | null | undefined,
): boolean {
  if (!freeCastKeys.size || !spellName?.trim()) return false
  return freeCastKeys.has(canonicalSpellLookupKey(spellName))
}

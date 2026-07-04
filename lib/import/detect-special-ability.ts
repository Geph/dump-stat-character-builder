import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import { detectNonSpellSpecialAbilityFromText } from "@/lib/import/detect-governing-ability"

export type ClassSpecialAbility = {
  save_dc_ability: AbilityScoreKey
  label?: string
  dc_formula?: "8_plus_prof_plus_ability_mod"
}

/** Detect Technique / Psionic save DC governing stat (not spellcasting declarations). */
export function detectSpecialAbilityFromText(
  description: string | null | undefined,
  featuresText?: string,
): ClassSpecialAbility | null {
  return detectNonSpellSpecialAbilityFromText(description, featuresText)
}

export function resolveSpecialAbilitySaveDc(
  specialAbility: ClassSpecialAbility | null | undefined,
  proficiencyBonus: number,
  abilityModifier: number,
): number | null {
  if (!specialAbility) return null
  return 8 + proficiencyBonus + abilityModifier
}

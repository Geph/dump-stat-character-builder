import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

export type ClassSpecialAbility = {
  save_dc_ability: AbilityScoreKey
  label?: string
  dc_formula?: "8_plus_prof_plus_ability_mod"
}

const ABILITY_WORD_TO_KEY: Record<string, AbilityScoreKey> = {
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
}

const SAVE_DC_PHRASE =
  /\b(Technique|Psionic|Spell)(?:\s+ability)?\s+save\s+DC\s*=\s*8\s*\+\s*your\s+proficiency\s+bonus\s*\+\s*your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier/i

function parseAbilityWord(word: string): AbilityScoreKey | null {
  return ABILITY_WORD_TO_KEY[word.trim().toLowerCase()] ?? null
}

/** Detect class-wide special-ability save DC governing stat from class prose. */
export function detectSpecialAbilityFromText(
  description: string | null | undefined,
  featuresText?: string,
): ClassSpecialAbility | null {
  const haystack = `${description ?? ""}\n${featuresText ?? ""}`
  const match = haystack.match(SAVE_DC_PHRASE)
  if (!match) return null

  const ability = parseAbilityWord(match[2])
  if (!ability) return null

  const subsystem =
    match[1].toLowerCase() === "psionic"
      ? "Psionic ability"
      : match[1].toLowerCase() === "spell"
        ? "Spell save DC"
        : "Technique save DC"
  return {
    save_dc_ability: ability,
    label: subsystem,
    dc_formula: "8_plus_prof_plus_ability_mod",
  }
}

export function resolveSpecialAbilitySaveDc(
  specialAbility: ClassSpecialAbility | null | undefined,
  proficiencyBonus: number,
  abilityModifier: number,
): number | null {
  if (!specialAbility) return null
  return 8 + proficiencyBonus + abilityModifier
}

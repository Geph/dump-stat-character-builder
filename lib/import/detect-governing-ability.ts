import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { ClassSpecialAbility } from "@/lib/import/detect-special-ability"

const ABILITY_WORD_TO_KEY: Record<string, AbilityScoreKey> = {
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
}

function parseAbilityWord(word: string): AbilityScoreKey | null {
  return ABILITY_WORD_TO_KEY[word.trim().toLowerCase()] ?? null
}

function titleCaseAbility(key: AbilityScoreKey): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

const SPELLCASTING_DECLARATION =
  /\b(Intelligence|Wisdom|Charisma|Strength|Dexterity|Constitution)\s+is\s+your\s+spellcasting\s+ability\b/i

const SPELLCASTING_DECLARATION_ALT =
  /\byour\s+spellcasting\s+ability\s+is\s+(Intelligence|Wisdom|Charisma|Strength|Dexterity|Constitution)\b/i

const SPELL_SAVE_DC_PHRASE =
  /\b(?:Spell|Your)\s+save\s+DC\s*=\s*8\s*\+\s*your\s+proficiency\s+bonus\s*\+\s*your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier/i

const TECHNIQUE_PSIONIC_SAVE_DC =
  /\b(Technique|Psionic|Maneuver)(?:\s+ability)?\s+save\s+DC\s*=\s*8\s*\+\s*your\s+proficiency\s+bonus\s*\+\s*your\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+modifier/i

const MANEUVER_PROSE_SAVE_DC =
  /If a maneuver requires a saving throw,\s*the DC equals\s*8 plus your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier and Proficiency Bonus/i

/** Detect spellcasting governing ability from class prose (Investigator Ritualist, Wizard, etc.). */
export function detectSpellcastingAbilityFromText(
  description: string | null | undefined,
  featuresText?: string,
): string | null {
  const haystack = `${description ?? ""}\n${featuresText ?? ""}`
  const direct = haystack.match(SPELLCASTING_DECLARATION) ?? haystack.match(SPELLCASTING_DECLARATION_ALT)
  if (direct) {
    const key = parseAbilityWord(direct[1])
    return key ? titleCaseAbility(key) : null
  }

  const saveDc = haystack.match(SPELL_SAVE_DC_PHRASE)
  if (saveDc) {
    const key = parseAbilityWord(saveDc[1])
    return key ? titleCaseAbility(key) : null
  }

  return null
}

/** Technique / Psionic save DC only — not spellcasting declarations. */
export function detectNonSpellSpecialAbilityFromText(
  description: string | null | undefined,
  featuresText?: string,
): ClassSpecialAbility | null {
  const haystack = `${description ?? ""}\n${featuresText ?? ""}`
  const match = haystack.match(TECHNIQUE_PSIONIC_SAVE_DC)
  if (match) {
    const ability = parseAbilityWord(match[2])
    if (!ability) return null
    const kind = match[1].toLowerCase()
    const label =
      kind === "psionic" ? "Psionic ability" : kind === "maneuver" ? "Maneuver save DC" : "Technique save DC"
    return {
      save_dc_ability: ability,
      label,
      dc_formula: "8_plus_prof_plus_ability_mod",
    }
  }

  const prose = haystack.match(MANEUVER_PROSE_SAVE_DC)
  if (prose) {
    const ability = parseAbilityWord(prose[1])
    if (!ability) return null
    return {
      save_dc_ability: ability,
      label: "Maneuver save DC",
      dc_formula: "8_plus_prof_plus_ability_mod",
    }
  }

  return null
}

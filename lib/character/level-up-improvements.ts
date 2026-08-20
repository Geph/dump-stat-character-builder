/** Standard 5E proficiency bonus by character level. */
export function proficiencyBonusAtLevel(level: number): number {
  return Math.floor((Math.max(1, level) - 1) / 4) + 2
}

/** Average HP gained for one class level after 1st (before Constitution). */
export function averageHitDieResult(hitDie: number): number {
  return Math.floor(Math.max(1, hitDie) / 2) + 1
}

export function averageHpGain(hitDie: number, conMod: number): number {
  return averageHitDieResult(hitDie) + conMod
}

/** Roll 1..hitDie then add Constitution (minimum 1 total HP from the level). */
export function rolledHpGain(hitDie: number, conMod: number, natural: number): number {
  const clamped = Math.max(1, Math.min(hitDie, Math.floor(natural)))
  return Math.max(1, clamped + conMod)
}

export function rollHitDie(hitDie: number): number {
  return 1 + Math.floor(Math.random() * Math.max(1, hitDie))
}

export type LevelUpStandardizedNote = {
  id: string
  title: string
  detail: string
}

/** Notes for improvements that always scale with character level (not class features). */
export function buildLevelUpStandardizedNotes(params: {
  fromTotalLevel: number
  toTotalLevel: number
  maxSpellLevelBefore?: number | null
  maxSpellLevelAfter?: number | null
}): LevelUpStandardizedNote[] {
  const notes: LevelUpStandardizedNote[] = []
  const pbBefore = proficiencyBonusAtLevel(params.fromTotalLevel)
  const pbAfter = proficiencyBonusAtLevel(params.toTotalLevel)
  if (pbAfter > pbBefore) {
    notes.push({
      id: "proficiency_bonus",
      title: "Proficiency Bonus",
      detail: `Increases from +${pbBefore} to +${pbAfter}.`,
    })
  }
  const spellBefore = params.maxSpellLevelBefore ?? 0
  const spellAfter = params.maxSpellLevelAfter ?? 0
  if (spellAfter > spellBefore) {
    notes.push({
      id: "spell_level",
      title: "Spell level access",
      detail: `You can now prepare or learn spells of up to level ${spellAfter}.`,
    })
  }
  return notes
}

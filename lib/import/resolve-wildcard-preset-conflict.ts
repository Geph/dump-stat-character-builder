export type WildcardPresetConflict = {
  presetKey: string
  reason: string
}

const CUNNING_STRIKE_SRD_RIDERS = /\b(?:Poison|Trip|Withdraw)\b/i

/** When description contradicts a name-matched wildcard preset, prefer description-driven wiring. */
export function wildcardPresetConflict(
  featureName: string,
  description: string,
  presetKey: string,
): WildcardPresetConflict | null {
  const text = description.trim()
  if (!text) return null

  if (presetKey === "*::Cunning Strike" || presetKey === "*::Improved Cunning Strike") {
    if (!/\bExploits?\b|\bExploit\s+Dice\b|\bExploit\s+Die\b/i.test(text)) return null
    if (CUNNING_STRIKE_SRD_RIDERS.test(text)) return null
    return {
      presetKey,
      reason: `Description references Exploit Dice usage, not SRD Cunning Strike riders (${featureName}).`,
    }
  }

  if (presetKey === "*::Tactical Master") {
    if (/\bmastery\s+property\b|\bweapon\s+mastery\b/i.test(text)) return null
    return {
      presetKey,
      reason: `Description is an ally saving-throw aura, not SRD Fighter's weapon mastery swap (${featureName}).`,
    }
  }

  if (presetKey === "*::Bonus Proficiencies") {
    // College of Lore: "You gain proficiency with three skills of your choice."
    if (isLoreStyleAnySkillBonusProficiencies(text)) return null
    return {
      presetKey,
      reason: `Description is a constrained proficiency grant, not College of Lore's any-three-skills pick (${featureName}).`,
    }
  }

  return null
}

/** SRD College of Lore Bonus Proficiencies wording (and close paraphrases). */
export function isLoreStyleAnySkillBonusProficiencies(description: string): boolean {
  const text = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  if (!text) return false
  return (
    /\b(?:gain|gains)\s+proficiency\s+with\s+three\s+skills?\s+of\s+your\s+choice\b/i.test(text) ||
    /\bproficiency\s+in\s+three\s+skills?\s+of\s+your\s+choice\b/i.test(text) ||
    /\bchoose\s+three\s+skills?\b/i.test(text)
  )
}

/**
 * Lore wildcard shape: empty entries, allowAnySkill, choiceCount >= 2.
 * Used to strip mis-applied presets from homebrew "Bonus Proficiencies" features.
 */
export function isLoreStyleBonusProficienciesSkillMod(mod: {
  type?: string
  choiceCount?: number | null
  allowAnySkill?: boolean
  entries?: unknown[] | null
  label?: string | null
}): boolean {
  if (mod.type !== "skills") return false
  if ((mod.choiceCount ?? 0) < 2) return false
  if (mod.allowAnySkill !== true) return false
  if ((mod.entries ?? []).length > 0) return false
  return true
}

export function shouldSkipWildcardPreset(
  featureName: string,
  description: string,
  presetKey: string,
): boolean {
  return wildcardPresetConflict(featureName, description, presetKey) != null
}

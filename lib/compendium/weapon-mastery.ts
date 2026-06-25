/** 2024 PHB weapon mastery property rules (short reference text). */
export const WEAPON_MASTERY_DESCRIPTIONS: Record<string, string> = {
  Cleave:
    "If you hit a creature with this weapon, you can make an attack against a second creature within 5 feet of the first that is also within your reach.",
  Graze:
    "If your attack roll with this weapon misses a creature, you can deal damage to that creature equal to the ability modifier used for the attack roll. This damage is the same type dealt by the weapon.",
  Nick:
    "When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. You can make this extra attack only once per turn.",
  Push:
    "If you hit a creature with this weapon, you can push the creature up to 10 feet straight away from yourself.",
  Sap:
    "If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn.",
  Slow:
    "If you hit a creature with this weapon and deal damage to it, you can reduce its Speed by 10 feet until the start of your next turn. If the creature is hit more than once by weapons that have this property, the Speed reduction doesn't exceed 10 feet.",
  Topple:
    "If you hit a creature with this weapon, you can force the creature to make a Constitution saving throw (DC 8 plus the ability modifier used to make the attack roll and your Proficiency Bonus). On a failed save, the creature has the Prone condition.",
  Vex:
    "If you hit a creature with this weapon and deal damage to the creature, you have Advantage on your next attack roll against that creature before the end of your next turn.",
}

export function describeWeaponMastery(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const exact = WEAPON_MASTERY_DESCRIPTIONS[trimmed]
  if (exact) return exact
  const match = Object.entries(WEAPON_MASTERY_DESCRIPTIONS).find(
    ([key]) => key.toLowerCase() === trimmed.toLowerCase(),
  )
  return match?.[1] ?? null
}

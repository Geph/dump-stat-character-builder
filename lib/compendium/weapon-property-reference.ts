/** 2024 PHB weapon property rules (reference text for tooltips). */
export const WEAPON_PROPERTY_DESCRIPTIONS: Record<string, string> = {
  Ammunition:
    "You can use a weapon that has the Ammunition property to make a ranged attack only if you have ammunition to fire. Each time you attack with the weapon, you expend one piece of ammunition.",
  Finesse:
    "When making an attack with a Finesse weapon, use your choice of Strength or Dexterity for the attack and damage rolls. You must use the same modifier for both rolls.",
  Heavy:
    "You have Disadvantage on attack rolls with a Heavy weapon if it's a Melee weapon and your size is Small.",
  Light:
    "When you take the Attack action on your turn and attack with a Light weapon, you can make one extra attack as part of the same action with a different Light weapon (once per turn).",
  Loading:
    "You can fire, load, or loose a Loading weapon only once per action, Bonus Action, or Reaction, regardless of the number of attacks you can normally make.",
  Range:
    "A Range weapon has a range in feet shown in parentheses after the Ammunition or Thrown property. The range lists two numbers; the first is normal range and the second is long range. Attacking at long range imposes Disadvantage.",
  Reach:
    "This weapon adds 5 feet to your reach when you attack with it.",
  Special:
    "This weapon has unusual rules described in its entry.",
  Thrown:
    "If a weapon has the Thrown property, you can throw the weapon to make a ranged attack. If it is a melee weapon, use the same ability modifier for thrown ranged attacks that you use for melee attacks.",
  "Two-Handed":
    "This weapon requires two hands when you attack with it.",
  Versatile:
    "This weapon can be used with one or two hands. A damage value in parentheses appears with the property — the weapon's damage when used with two hands to make a melee attack.",
}

export const WEAPON_RANGE_DESCRIPTIONS: Record<string, string> = {
  "Melee reach":
    "You can attack a target within 5 feet of you. A weapon with the Reach property extends that to 10 feet.",
  Ranged:
    "This weapon makes ranged attacks. See the weapon's range in its properties or range field.",
}

export function describeWeaponProperty(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const exact = WEAPON_PROPERTY_DESCRIPTIONS[trimmed]
  if (exact) return exact
  const match = Object.entries(WEAPON_PROPERTY_DESCRIPTIONS).find(
    ([key]) => key.toLowerCase() === trimmed.toLowerCase(),
  )
  return match?.[1] ?? null
}

export function describeWeaponRange(rangeText: string): string | null {
  const trimmed = rangeText.trim()
  if (!trimmed) return null
  if (WEAPON_RANGE_DESCRIPTIONS[trimmed]) return WEAPON_RANGE_DESCRIPTIONS[trimmed]
  if (/^\d+\/\d+\s*ft/i.test(trimmed) || /^\d+\s*ft/i.test(trimmed)) {
    return "Normal range is the first number; long range (Disadvantage) is the second when two numbers are listed."
  }
  if (/thrown/i.test(trimmed)) {
    return "Thrown range — you can make a ranged attack by throwing this weapon."
  }
  return WEAPON_RANGE_DESCRIPTIONS.Ranged
}

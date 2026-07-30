import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { normalizeRampageDieSides } from "@/lib/character/rampage-die"
import { rollDie } from "@/lib/dice/roll-die"

function matchesKnownName(
  names: readonly (string | null | undefined)[],
  pattern: RegExp,
): boolean {
  return names.some((name) => (name ? pattern.test(name.trim()) : false))
}

/** Tantrum (Unleashed Mind talent) steps the Rampage Die on initiative and on taking damage. */
export function characterKnowsTantrum(
  names: readonly (string | null | undefined)[],
): boolean {
  return matchesKnownName(names, /^tantrum$/i)
}

export function characterHasUnstoppableRampage(
  names: readonly (string | null | undefined)[],
): boolean {
  return matchesKnownName(names, /^unstoppable rampage$/i)
}

/** Uncontrollable Mind grants Charmed / Frightened immunity while the Rampage Die is d8+. */
export function characterKnowsUncontrollableMind(
  names: readonly (string | null | undefined)[],
): boolean {
  return matchesKnownName(names, /^uncontrollable mind$/i)
}

/** +INT to damage dealt by a psionic discipline power (Empowered Psionics). */
export function empoweredPsionicsDamageBonus(params: {
  classDetails: CharacterClassDetail[]
  intModifier: number
}): number {
  const known = params.classDetails.some((entry) =>
    [
      ...((entry.class?.features ?? []) as { name?: string; level?: number }[]),
      ...((entry.subclass?.features ?? []) as { name?: string; level?: number }[]),
    ].some(
      (feature) =>
        /^empowered psionics$/i.test(feature.name ?? "") &&
        (feature.level == null || feature.level <= (entry.row.level ?? 1)),
    ),
  )
  if (!known) return 0
  return Math.max(0, params.intModifier)
}

export type UnstoppableRampageResult = {
  dieRolls: number[]
  conModifier: number
  total: number
  excessDamage: number
  /** True when the roll exceeds the excess damage — drop to 1 HP instead of 0. */
  success: boolean
}

/**
 * Unstoppable Rampage: on dropping to 0 HP, roll your Rampage Die + CON against the
 * damage in excess of what dropped you to 0. Optionally spend 2 psi for a second die.
 */
export function rollUnstoppableRampage(params: {
  sides: number
  conModifier: number
  excessDamage: number
  extraDie?: boolean
  roll?: (sides: number) => number
}): UnstoppableRampageResult {
  const sides = normalizeRampageDieSides(params.sides)
  const roll = params.roll ?? rollDie
  const dieRolls = [roll(sides)]
  if (params.extraDie) dieRolls.push(roll(sides))
  const conModifier = params.conModifier
  const total = dieRolls.reduce((sum, value) => sum + value, 0) + conModifier
  const excessDamage = Math.max(0, params.excessDamage)
  return { dieRolls, conModifier, total, excessDamage, success: total > excessDamage }
}

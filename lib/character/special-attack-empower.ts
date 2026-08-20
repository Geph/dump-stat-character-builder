import { resolveFixedValueAtLevel } from "@/lib/compendium/bonus-by-level"
import type { SpecialAttackCharacteristic } from "@/lib/compendium/characteristic-modifiers"

/**
 * An optional "spend N of a class resource to boost this attack" rider, e.g. the Alchemist's
 * Prime Bomb (older printings call it Empowered Bomb): once per turn, spend up to the Prime Bomb
 * column's worth of Reagents for +1d10 damage each, widening an Explode by 5 ft per Reagent.
 */
export type SpecialAttackEmpower = {
  resourceKey: string
  /** Dice added to the damage roll per resource spent. */
  dicePerResource: number
  dieSides: number
  /** Most resources that may be spent on a single use at this level. */
  maxSpend: number
  /** Radius growth per resource, for area attacks. */
  radiusFeetPerResource: number | null
}

function parseDiceExpression(value: string): { count: number; sides: number } | null {
  const match = value.trim().match(/^(\d*)d(\d+)$/i)
  if (!match) return null
  const count = match[1] ? parseInt(match[1], 10) : 1
  const sides = parseInt(match[2], 10)
  if (!Number.isFinite(count) || !Number.isFinite(sides) || count <= 0 || sides <= 0) return null
  return { count, sides }
}

export function resolveSpecialAttackEmpower(
  attack: Pick<
    SpecialAttackCharacteristic,
    | "resourceScaleKey"
    | "bonusDicePerResource"
    | "maxResourcesSpent"
    | "maxResourcesSpentByLevel"
    | "radiusIncreaseFeetPerResource"
  > | null
    | undefined,
  classLevel: number,
): SpecialAttackEmpower | null {
  const resourceKey = attack?.resourceScaleKey?.trim()
  if (!attack || !resourceKey) return null

  const dice = attack.bonusDicePerResource ? parseDiceExpression(attack.bonusDicePerResource) : null
  const radiusFeetPerResource = attack.radiusIncreaseFeetPerResource ?? null
  if (!dice && !radiusFeetPerResource) return null

  const maxSpend =
    resolveFixedValueAtLevel(
      attack.maxResourcesSpentByLevel,
      classLevel,
      attack.maxResourcesSpent ?? null,
    ) ?? 0
  if (maxSpend <= 0) return null

  return {
    resourceKey,
    dicePerResource: dice?.count ?? 0,
    dieSides: dice?.sides ?? 0,
    maxSpend,
    radiusFeetPerResource,
  }
}

/** Human-readable summary of what spending `spend` resources buys. */
export function formatEmpowerEffect(empower: SpecialAttackEmpower, spend: number): string {
  if (spend <= 0) return "No boost"
  const parts: string[] = []
  if (empower.dicePerResource > 0) {
    parts.push(`+${empower.dicePerResource * spend}d${empower.dieSides} damage`)
  }
  if (empower.radiusFeetPerResource) {
    parts.push(`radius up to +${empower.radiusFeetPerResource * spend} ft`)
  }
  return parts.join(", ")
}

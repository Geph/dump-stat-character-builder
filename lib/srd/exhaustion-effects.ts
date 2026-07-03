import type { D20RollMode } from "@/lib/dice/d20-roll"
import type { RollContext } from "@/lib/character/roll-context"

export const EXHAUSTION_MIN_LEVEL = 0
export const EXHAUSTION_MAX_LEVEL = 6
export const EXHAUSTION_DEATH_LEVEL = 6

export function clampExhaustionLevel(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.min(EXHAUSTION_MAX_LEVEL, Math.max(EXHAUSTION_MIN_LEVEL, Math.round(level)))
}

export type ExhaustionDerivedEffects = {
  speedMultiplier: number
  hpMaxMultiplier: number
  speedZero: boolean
  isDead: boolean
}

export function getExhaustionDerivedEffects(level: number): ExhaustionDerivedEffects {
  const clamped = clampExhaustionLevel(level)
  return {
    speedMultiplier: clamped >= 2 && clamped < 5 ? 0.5 : 1,
    hpMaxMultiplier: clamped >= 4 && clamped < EXHAUSTION_DEATH_LEVEL ? 0.5 : 1,
    speedZero: clamped >= 5,
    isDead: clamped >= EXHAUSTION_DEATH_LEVEL,
  }
}

export function collectExhaustionRollModes(
  context: RollContext,
  exhaustionLevel: number,
): D20RollMode[] {
  const level = clampExhaustionLevel(exhaustionLevel)
  const modes: D20RollMode[] = []

  if (level >= 1 && (context.kind === "ability" || context.kind === "skill")) {
    modes.push("disadvantage")
  }
  if (level >= 3 && (context.kind === "attack" || context.kind === "save")) {
    modes.push("disadvantage")
  }

  return modes
}

export function getExhaustionEffectSummary(level: number): string {
  const clamped = clampExhaustionLevel(level)
  if (clamped === 0) return "No exhaustion effects."
  const parts: string[] = []
  if (clamped >= 1) parts.push("Disadvantage on ability checks")
  if (clamped >= 2) parts.push("Speed halved")
  if (clamped >= 3) parts.push("Disadvantage on attack rolls and saving throws")
  if (clamped >= 4) parts.push("Hit point maximum halved")
  if (clamped >= 5) parts.push("Speed reduced to 0")
  if (clamped >= 6) parts.push("Death")
  return parts.join("; ")
}

import type { RollContext } from "@/lib/character/roll-context"
import { collectConditionRollModes } from "@/lib/srd/condition-roll-effects"
import { collectExhaustionRollModes } from "@/lib/srd/exhaustion-effects"
import { combineRollModes, type D20RollMode } from "@/lib/dice/d20-roll"

export type ManualRollOverride = "normal" | "advantage" | "disadvantage"

export type ResolveRollModeInput = {
  context: RollContext
  activeConditions: string[]
  exhaustionLevel: number
  manualOverride?: ManualRollOverride
}

export type ResolvedRollMode = {
  mode: D20RollMode
  sources: string[]
}

export function resolveRollMode(input: ResolveRollModeInput): ResolvedRollMode {
  const { context, activeConditions, exhaustionLevel, manualOverride = "normal" } = input
  const modes: D20RollMode[] = []
  const sources: string[] = []

  for (const mode of collectConditionRollModes(context, activeConditions)) {
    modes.push(mode)
    if (mode === "auto_fail") sources.push("condition")
  }
  for (const mode of collectExhaustionRollModes(context, exhaustionLevel)) {
    modes.push(mode)
    sources.push("exhaustion")
  }

  if (manualOverride === "advantage") {
    modes.push("advantage")
    sources.push("manual")
  } else if (manualOverride === "disadvantage") {
    modes.push("disadvantage")
    sources.push("manual")
  }

  return { mode: combineRollModes(modes), sources }
}

export function rollModeBadgeLabel(mode: D20RollMode): string | null {
  if (mode === "advantage") return "Adv"
  if (mode === "disadvantage") return "Dis"
  if (mode === "auto_fail") return "Auto-fail"
  return null
}

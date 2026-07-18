import { rollDamageWithMode, type DamageRollMode } from "@/lib/dice/damage-roll"

export const MANUAL_DIE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const

export type ManualDieSides = (typeof MANUAL_DIE_SIDES)[number]

export type ManualRollMode = DamageRollMode

export type ManualRollConfig = {
  count: number
  sides: ManualDieSides
  modifier: number
  mode: ManualRollMode
}

export type ManualRollResult = {
  rolls: number[]
  modifier: number
  total: number
  mode: ManualRollMode
  expression: string
  summary: string
}

export function clampManualDiceCount(count: number): number {
  if (!Number.isFinite(count)) return 1
  return Math.min(40, Math.max(1, Math.floor(count)))
}

export function clampManualModifier(modifier: number): number {
  if (!Number.isFinite(modifier)) return 0
  return Math.min(999, Math.max(-999, Math.trunc(modifier)))
}

export function formatManualRollExpression(config: ManualRollConfig): string {
  const count = clampManualDiceCount(config.count)
  const mod = clampManualModifier(config.modifier)
  const dice = `${count}d${config.sides}`
  if (mod === 0) return dice
  return mod > 0 ? `${dice}+${mod}` : `${dice}${mod}`
}

export function formatManualRollSummary(
  rolls: number[],
  modifier: number,
  total: number,
  mode: ManualRollMode,
): string {
  const dicePart = rolls.length ? rolls.join(" + ") : "0"
  const modPart =
    modifier === 0 ? "" : modifier > 0 ? ` + ${modifier}` : ` − ${Math.abs(modifier)}`
  const modeSuffix =
    mode === "advantage" ? " (adv)" : mode === "disadvantage" ? " (dis)" : ""
  return `${dicePart}${modPart} = ${total}${modeSuffix}`
}

export function rollManualDice(config: ManualRollConfig): ManualRollResult {
  const count = clampManualDiceCount(config.count)
  const modifier = clampManualModifier(config.modifier)
  const mode = config.mode
  const expression = formatManualRollExpression({ ...config, count, modifier })
  const rolled = rollDamageWithMode({ dice: [{ count, sides: config.sides }], modifier }, mode)
  return {
    rolls: rolled.rolls,
    modifier: rolled.modifier,
    total: rolled.total,
    mode: rolled.mode,
    expression,
    summary: formatManualRollSummary(rolled.rolls, rolled.modifier, rolled.total, rolled.mode),
  }
}

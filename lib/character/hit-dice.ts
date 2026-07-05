import type { CharacterClassDetail } from "@/lib/character/character-classes"

export type HitDicePoolEntry = {
  classId: string
  className: string
  die: number
  total: number
  spent: number
  remaining: number
}

export function buildHitDicePool(
  classDetails: CharacterClassDetail[],
  usedByClassId: Record<string, number> = {},
): HitDicePoolEntry[] {
  return classDetails
    .filter((entry) => entry.class && entry.row.level > 0)
    .map((entry) => {
      const total = entry.row.level
      const spent = Math.max(0, Math.min(total, usedByClassId[entry.row.class_id] ?? 0))
      return {
        classId: entry.row.class_id,
        className: entry.class?.name ?? "Class",
        die: entry.class?.hit_die ?? 8,
        total,
        spent,
        remaining: total - spent,
      }
    })
}

export function totalHitDiceRemaining(pool: HitDicePoolEntry[]): number {
  return pool.reduce((sum, entry) => sum + entry.remaining, 0)
}

export function rollHitDiceHeal(params: {
  die: number
  count: number
  conMod: number
  random?: () => number
}): { rolls: number[]; modifier: number; total: number } {
  const { die, count, conMod, random = Math.random } = params
  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    rolls.push(1 + Math.floor(random() * die))
  }
  const diceSum = rolls.reduce((sum, value) => sum + value, 0)
  const total = diceSum + conMod * count
  return { rolls, modifier: conMod * count, total: Math.max(0, total) }
}

export function formatHitDiceRollSummary(params: {
  className: string
  die: number
  count: number
  conMod: number
  rolls: number[]
  total: number
}): string {
  const modLabel =
    params.conMod === 0
      ? ""
      : params.conMod > 0
        ? ` + ${params.conMod * params.count}`
        : ` - ${Math.abs(params.conMod * params.count)}`
  const dicePart =
    params.count === 1
      ? `d${params.die} ${params.rolls[0]}`
      : `${params.count}d${params.die} [${params.rolls.join(", ")}]`
  return `${dicePart}${modLabel} = ${params.total} HP`
}

/** Regain spent hit dice after a long rest (half total hit dice, minimum 1). */
export function recoverHitDiceOnLongRest(
  usedByClassId: Record<string, number>,
  pool: HitDicePoolEntry[],
): Record<string, number> {
  const totalLevels = pool.reduce((sum, entry) => sum + entry.total, 0)
  if (totalLevels <= 0) return { ...usedByClassId }

  let remainingRecovery = Math.max(1, Math.ceil(totalLevels / 2))
  const next = { ...usedByClassId }

  for (const entry of pool) {
    if (remainingRecovery <= 0) break
    const spent = next[entry.classId] ?? 0
    if (spent <= 0) continue
    const regain = Math.min(spent, remainingRecovery)
    next[entry.classId] = spent - regain
    if (next[entry.classId] === 0) delete next[entry.classId]
    remainingRecovery -= regain
  }

  return next
}

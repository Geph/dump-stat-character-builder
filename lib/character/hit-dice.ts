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

/** Spend Hit Dice from the pool (feature fuel: Mortal Metamagic, Draconic Vengeance, etc.). */
export function spendHitDiceFromPool(params: {
  usedByClassId: Record<string, number>
  pool: HitDicePoolEntry[]
  amount: number
  /** Prefer this class id when multiclassing; otherwise spend from the largest remaining pool. */
  preferClassId?: string | null
}): { nextUsedByClassId: Record<string, number>; applied: boolean; classId: string | null } {
  const amount = Math.max(0, Math.floor(params.amount))
  if (amount <= 0) {
    return { nextUsedByClassId: params.usedByClassId, applied: true, classId: null }
  }

  const preferred =
    params.preferClassId != null
      ? params.pool.find((entry) => entry.classId === params.preferClassId && entry.remaining >= amount)
      : null
  const entry =
    preferred ??
    [...params.pool]
      .filter((row) => row.remaining >= amount)
      .sort((a, b) => b.remaining - a.remaining)[0] ??
    null

  if (!entry) {
    return { nextUsedByClassId: params.usedByClassId, applied: false, classId: null }
  }

  const next = { ...params.usedByClassId }
  next[entry.classId] = (next[entry.classId] ?? 0) + amount
  return { nextUsedByClassId: next, applied: true, classId: entry.classId }
}

export function hitDiceRemainingForClass(
  pool: HitDicePoolEntry[],
  classId: string | null | undefined,
): number {
  if (!classId) return totalHitDiceRemaining(pool)
  return pool.find((entry) => entry.classId === classId)?.remaining ?? 0
}

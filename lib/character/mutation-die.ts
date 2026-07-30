import { RAMPAGE_DIE_STEPS, normalizeRampageDieSides, stepRampageDieSides, type RampageDieSides } from "@/lib/character/rampage-die"

export type MutationDieSides = RampageDieSides

export type MutationDieGrant = {
  sides: MutationDieSides
  /** Uses remaining (0 = spent). Muscular can still auto-apply STR while remaining is 0. */
  remaining: number
  /** Muscular augment: add die to Strength checks/attacks without expending. */
  autoApplyStrength: boolean
  /** "Self" or ally display name. */
  targetLabel: string
  clearHint: "start_of_caster_next_turn"
}

export function createMutationDieGrant(params?: {
  sides?: MutationDieSides
  targetLabel?: string
  autoApplyStrength?: boolean
}): MutationDieGrant {
  return {
    sides: normalizeRampageDieSides(params?.sides ?? 4),
    remaining: 1,
    autoApplyStrength: Boolean(params?.autoApplyStrength),
    targetLabel: params?.targetLabel?.trim() || "Self",
    clearHint: "start_of_caster_next_turn",
  }
}

export function stepMutationDie(
  grant: MutationDieGrant,
  direction: -1 | 1,
): MutationDieGrant {
  return {
    ...grant,
    sides: stepRampageDieSides(grant.sides, direction),
  }
}

export function spendMutationDie(grant: MutationDieGrant): MutationDieGrant {
  return { ...grant, remaining: 0 }
}

export function normalizeMutationDieGrant(raw: unknown): MutationDieGrant | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Partial<MutationDieGrant>
  if (typeof row.sides !== "number") return null
  return {
    sides: normalizeRampageDieSides(row.sides),
    remaining: typeof row.remaining === "number" && row.remaining > 0 ? 1 : 0,
    autoApplyStrength: Boolean(row.autoApplyStrength),
    targetLabel: typeof row.targetLabel === "string" && row.targetLabel.trim()
      ? row.targetLabel.trim()
      : "Self",
    clearHint: "start_of_caster_next_turn",
  }
}

export function normalizeAllyBenefitCounts(
  raw: Record<string, number> | null | undefined,
): Record<string, number> {
  if (!raw || typeof raw !== "object") return {}
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([key, count]) => key.trim().length > 0 && Number.isInteger(count) && count >= 0,
    ),
  )
}

export { RAMPAGE_DIE_STEPS as MUTATION_DIE_STEPS }

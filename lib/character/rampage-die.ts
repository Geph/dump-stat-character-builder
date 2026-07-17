export const RAMPAGE_DIE_STEPS = [4, 6, 8, 10, 12] as const

export type RampageDieSides = (typeof RAMPAGE_DIE_STEPS)[number]

export function normalizeRampageDieSides(value: number | null | undefined): RampageDieSides {
  return RAMPAGE_DIE_STEPS.includes(value as RampageDieSides)
    ? (value as RampageDieSides)
    : 4
}

export function stepRampageDieSides(
  current: number | null | undefined,
  direction: -1 | 1,
): RampageDieSides {
  const normalized = normalizeRampageDieSides(current)
  const index = RAMPAGE_DIE_STEPS.indexOf(normalized)
  const nextIndex = Math.max(0, Math.min(RAMPAGE_DIE_STEPS.length - 1, index + direction))
  return RAMPAGE_DIE_STEPS[nextIndex]
}

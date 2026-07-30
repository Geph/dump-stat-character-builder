export const RAMPAGE_DIE_STEPS = [4, 6, 8, 10, 12] as const

export type RampageDieSides = (typeof RAMPAGE_DIE_STEPS)[number]

/** Rounds held at d12 before Rampaging Power's continuous-use Exhaustion (1 minute ≈ 10 rounds). */
export const RAMPAGE_D12_ROUNDS_FOR_EXHAUSTION = 10

/** Die size at which Uncontrollable Mind grants Charmed / Frightened immunity. */
export const UNCONTROLLABLE_MIND_MIN_SIDES = 8

/** Largest die that Tantrum steps up when you take damage. */
export const TANTRUM_MAX_STEP_UP_SIDES = 6

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

/**
 * Per-turn Rampage Die flags. The die size itself stays in
 * `resourceDieSidesByKey.rampage_die` so damage riders keep resolving it.
 */
export type RampageTurnState = {
  /** Damage dealt during the current turn — drives the step up at the next turn boundary. */
  dealtDamageThisTurn: boolean
  /** Rampage Die already added to a damage roll this turn (once per turn). */
  usedDieThisTurn: boolean
  /** Consecutive completed rounds held at d12, toward the Exhaustion clock. */
  d12RoundsHeld: number
}

export type RampageDieState = RampageTurnState & { sides: RampageDieSides }

export function defaultRampageTurnState(): RampageTurnState {
  return { dealtDamageThisTurn: false, usedDieThisTurn: false, d12RoundsHeld: 0 }
}

export function normalizeRampageTurnState(raw: unknown): RampageTurnState {
  const base = defaultRampageTurnState()
  if (!raw || typeof raw !== "object") return base
  const row = raw as Partial<RampageTurnState>
  const held =
    typeof row.d12RoundsHeld === "number" && Number.isInteger(row.d12RoundsHeld)
      ? Math.max(0, Math.min(RAMPAGE_D12_ROUNDS_FOR_EXHAUSTION, row.d12RoundsHeld))
      : 0
  return {
    dealtDamageThisTurn: Boolean(row.dealtDamageThisTurn),
    usedDieThisTurn: Boolean(row.usedDieThisTurn),
    d12RoundsHeld: held,
  }
}

export function markRampageDamageDealt(state: RampageDieState): RampageDieState {
  if (state.dealtDamageThisTurn) return state
  return { ...state, dealtDamageThisTurn: true }
}

/** Spending the once-per-turn die on a damage roll also counts as dealing damage. */
export function markRampageDieUsed(state: RampageDieState): RampageDieState {
  return { ...state, usedDieThisTurn: true, dealtDamageThisTurn: true }
}

/** Manual override / automated change; keeps the d12 Exhaustion clock consistent. */
export function setRampageDieSides(
  state: RampageDieState,
  sides: number | null | undefined,
): RampageDieState {
  const next = normalizeRampageDieSides(sides)
  if (next === state.sides) return state
  return { ...state, sides: next, d12RoundsHeld: 0 }
}

export function stepRampageDieState(
  state: RampageDieState,
  direction: -1 | 1,
): RampageDieState {
  return setRampageDieSides(state, stepRampageDieSides(state.sides, direction))
}

export function resetRampageDie(state: RampageDieState): RampageDieState {
  return setRampageDieSides(state, 4)
}

/**
 * Rampaging Power turn boundary: step up after a turn that dealt damage, reset to d4
 * after a turn without damage or while Incapacitated, then clear the per-turn flags.
 * Holding d12 for a full minute adds a level of Exhaustion.
 */
export function advanceRampageDieTurn(params: {
  state: RampageDieState
  incapacitated?: boolean
}): { state: RampageDieState; exhaustionGained: number; summary: string[] } {
  const { state } = params
  const summary: string[] = []

  let sides: RampageDieSides
  if (params.incapacitated) {
    sides = 4
    if (state.sides !== 4) summary.push("Rampage Die reset to d4 (Incapacitated)")
  } else if (state.dealtDamageThisTurn) {
    sides = stepRampageDieSides(state.sides, 1)
    summary.push(
      sides === state.sides
        ? `Rampage Die held at d${sides} (maximum)`
        : `Rampage Die stepped up to d${sides}`,
    )
  } else {
    sides = 4
    if (state.sides !== 4) summary.push("Rampage Die reset to d4 (no damage dealt)")
  }

  let d12RoundsHeld = 0
  let exhaustionGained = 0
  if (sides === 12) {
    d12RoundsHeld = state.sides === 12 ? state.d12RoundsHeld + 1 : 0
    if (d12RoundsHeld >= RAMPAGE_D12_ROUNDS_FOR_EXHAUSTION) {
      exhaustionGained = 1
      d12RoundsHeld = 0
      summary.push("Held d12 for 1 minute — gained 1 level of Exhaustion")
    }
  }

  return {
    state: { sides, dealtDamageThisTurn: false, usedDieThisTurn: false, d12RoundsHeld },
    exhaustionGained,
    summary,
  }
}

/** Tantrum: step up when you roll initiative. */
export function tantrumStepOnInitiative(state: RampageDieState): RampageDieState {
  return stepRampageDieState(state, 1)
}

/** Tantrum: step up when you take damage while the die is d6 or lower. */
export function tantrumStepOnDamageTaken(state: RampageDieState): RampageDieState {
  if (state.sides > TANTRUM_MAX_STEP_UP_SIDES) return state
  return stepRampageDieState(state, 1)
}

export function rampageDieGrantsUncontrollableMind(sides: number | null | undefined): boolean {
  return normalizeRampageDieSides(sides) >= UNCONTROLLABLE_MIND_MIN_SIDES
}

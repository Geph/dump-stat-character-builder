import { describe, expect, it } from "vitest"
import {
  advanceRampageDieTurn,
  defaultRampageTurnState,
  markRampageDamageDealt,
  markRampageDieUsed,
  normalizeRampageTurnState,
  RAMPAGE_D12_ROUNDS_FOR_EXHAUSTION,
  rampageDieGrantsUncontrollableMind,
  resetRampageDie,
  stepRampageDieState,
  tantrumStepOnDamageTaken,
  tantrumStepOnInitiative,
  type RampageDieState,
} from "@/lib/character/rampage-die"

function state(partial: Partial<RampageDieState> = {}): RampageDieState {
  return { sides: 4, ...defaultRampageTurnState(), ...partial }
}

describe("rampage die turn automation", () => {
  it("steps up after each turn that dealt damage, capping at d12", () => {
    let current = state({ dealtDamageThisTurn: true })
    const seen: number[] = []
    for (let turn = 0; turn < 6; turn++) {
      current = advanceRampageDieTurn({ state: { ...current, dealtDamageThisTurn: true } }).state
      seen.push(current.sides)
    }
    expect(seen).toEqual([6, 8, 10, 12, 12, 12])
  })

  it("resets to d4 after a turn without damage", () => {
    const advanced = advanceRampageDieTurn({ state: state({ sides: 10 }) })
    expect(advanced.state.sides).toBe(4)
    expect(advanced.summary.join(" ")).toMatch(/no damage dealt/i)
  })

  it("resets to d4 while Incapacitated even after dealing damage", () => {
    const advanced = advanceRampageDieTurn({
      state: state({ sides: 10, dealtDamageThisTurn: true }),
      incapacitated: true,
    })
    expect(advanced.state.sides).toBe(4)
    expect(advanced.summary.join(" ")).toMatch(/Incapacitated/i)
  })

  it("clears the per-turn flags at the turn boundary", () => {
    const advanced = advanceRampageDieTurn({
      state: state({ sides: 6, dealtDamageThisTurn: true, usedDieThisTurn: true }),
    })
    expect(advanced.state.dealtDamageThisTurn).toBe(false)
    expect(advanced.state.usedDieThisTurn).toBe(false)
  })

  it("adds one Exhaustion level after holding d12 for the full clock", () => {
    let current = state({ sides: 12, dealtDamageThisTurn: true })
    let gained = 0
    for (let round = 0; round < RAMPAGE_D12_ROUNDS_FOR_EXHAUSTION; round++) {
      const advanced = advanceRampageDieTurn({
        state: { ...current, dealtDamageThisTurn: true },
      })
      current = advanced.state
      gained += advanced.exhaustionGained
    }
    expect(gained).toBe(1)
    expect(current.d12RoundsHeld).toBe(0)
  })

  it("restarts the d12 clock when the die leaves d12", () => {
    const dropped = advanceRampageDieTurn({ state: state({ sides: 12, d12RoundsHeld: 4 }) })
    expect(dropped.state.sides).toBe(4)
    expect(dropped.state.d12RoundsHeld).toBe(0)
    expect(dropped.exhaustionGained).toBe(0)
  })

  it("marks damage dealt and enforces one die use per turn", () => {
    const marked = markRampageDamageDealt(state())
    expect(marked.dealtDamageThisTurn).toBe(true)
    const used = markRampageDieUsed(marked)
    expect(used.usedDieThisTurn).toBe(true)
    expect(used.dealtDamageThisTurn).toBe(true)
  })

  it("keeps manual step and reset controls working", () => {
    expect(stepRampageDieState(state({ sides: 4 }), 1).sides).toBe(6)
    expect(stepRampageDieState(state({ sides: 4 }), -1).sides).toBe(4)
    expect(resetRampageDie(state({ sides: 12, d12RoundsHeld: 3 })).d12RoundsHeld).toBe(0)
  })

  it("steps up on initiative but only steps up on damage taken at d6 or lower", () => {
    expect(tantrumStepOnInitiative(state({ sides: 10 })).sides).toBe(12)
    expect(tantrumStepOnDamageTaken(state({ sides: 6 })).sides).toBe(8)
    expect(tantrumStepOnDamageTaken(state({ sides: 8 })).sides).toBe(8)
  })

  it("gates Uncontrollable Mind on d8 or larger", () => {
    expect(rampageDieGrantsUncontrollableMind(6)).toBe(false)
    expect(rampageDieGrantsUncontrollableMind(8)).toBe(true)
    expect(rampageDieGrantsUncontrollableMind(12)).toBe(true)
  })

  it("normalizes persisted turn state", () => {
    expect(normalizeRampageTurnState(null)).toEqual(defaultRampageTurnState())
    expect(
      normalizeRampageTurnState({ dealtDamageThisTurn: 1, usedDieThisTurn: 0, d12RoundsHeld: 99 }),
    ).toEqual({
      dealtDamageThisTurn: true,
      usedDieThisTurn: false,
      d12RoundsHeld: RAMPAGE_D12_ROUNDS_FOR_EXHAUSTION,
    })
  })
})

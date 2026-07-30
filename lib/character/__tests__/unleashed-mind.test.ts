import { describe, expect, it } from "vitest"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  characterHasUnstoppableRampage,
  characterKnowsTantrum,
  characterKnowsUncontrollableMind,
  empoweredPsionicsDamageBonus,
  rollUnstoppableRampage,
} from "@/lib/character/unleashed-mind"

function psionAt(level: number, features: { name: string; level?: number }[]) {
  return [
    {
      row: { class_id: "psion", level },
      class: { name: "Psion", features: [] },
      subclass: { name: "Unleashed Mind", features },
    },
  ] as unknown as CharacterClassDetail[]
}

describe("unleashed mind feature detection", () => {
  it("detects Tantrum, Uncontrollable Mind, and Unstoppable Rampage by name", () => {
    const names = ["Tantrum", "Uncontrollable Mind", "Unstoppable Rampage", null]
    expect(characterKnowsTantrum(names)).toBe(true)
    expect(characterKnowsUncontrollableMind(names)).toBe(true)
    expect(characterHasUnstoppableRampage(names)).toBe(true)
    expect(characterKnowsTantrum(["Rampaging Power"])).toBe(false)
  })
})

describe("empowered psionics", () => {
  it("adds INT to psionic power damage once the feature is online", () => {
    const known = psionAt(6, [{ name: "Empowered Psionics", level: 6 }])
    expect(empoweredPsionicsDamageBonus({ classDetails: known, intModifier: 4 })).toBe(4)
  })

  it("stays off below the feature level or without the feature", () => {
    const notYet = psionAt(3, [{ name: "Empowered Psionics", level: 6 }])
    expect(empoweredPsionicsDamageBonus({ classDetails: notYet, intModifier: 4 })).toBe(0)
    const missing = psionAt(10, [{ name: "Rampaging Power", level: 3 }])
    expect(empoweredPsionicsDamageBonus({ classDetails: missing, intModifier: 4 })).toBe(0)
  })

  it("never returns a negative bonus", () => {
    const known = psionAt(6, [{ name: "Empowered Psionics" }])
    expect(empoweredPsionicsDamageBonus({ classDetails: known, intModifier: -1 })).toBe(0)
  })
})

describe("unstoppable rampage", () => {
  it("survives when the die plus CON exceeds the excess damage", () => {
    const result = rollUnstoppableRampage({
      sides: 12,
      conModifier: 3,
      excessDamage: 10,
      roll: () => 8,
    })
    expect(result.total).toBe(11)
    expect(result.success).toBe(true)
  })

  it("fails on a tie", () => {
    const result = rollUnstoppableRampage({
      sides: 8,
      conModifier: 2,
      excessDamage: 7,
      roll: () => 5,
    })
    expect(result.success).toBe(false)
  })

  it("adds a second die when psi is spent", () => {
    const result = rollUnstoppableRampage({
      sides: 6,
      conModifier: 0,
      excessDamage: 9,
      extraDie: true,
      roll: () => 5,
    })
    expect(result.dieRolls).toEqual([5, 5])
    expect(result.total).toBe(10)
    expect(result.success).toBe(true)
  })
})

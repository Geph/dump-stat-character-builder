import { describe, expect, it } from "vitest"
import {
  clampExhaustionLevel,
  collectExhaustionRollModes,
  getExhaustionDerivedEffects,
} from "@/lib/srd/exhaustion-effects"

describe("exhaustion effects", () => {
  it("level 1 imposes disadvantage on ability checks", () => {
    const modes = collectExhaustionRollModes({ kind: "skill", skillName: "Perception" }, 1)
    expect(modes).toContain("disadvantage")
  })

  it("level 3 imposes disadvantage on attacks and saves", () => {
    expect(collectExhaustionRollModes({ kind: "attack" }, 3)).toContain("disadvantage")
    expect(collectExhaustionRollModes({ kind: "save", ability: "wisdom" }, 3)).toContain(
      "disadvantage",
    )
  })

  it("level 2 halves speed and level 5 zeroes it", () => {
    expect(getExhaustionDerivedEffects(2).speedMultiplier).toBe(0.5)
    expect(getExhaustionDerivedEffects(5).speedZero).toBe(true)
  })

  it("level 4 halves HP max and level 6 marks death", () => {
    expect(getExhaustionDerivedEffects(4).hpMaxMultiplier).toBe(0.5)
    expect(getExhaustionDerivedEffects(6).isDead).toBe(true)
  })

  it("clamps out-of-range levels", () => {
    expect(clampExhaustionLevel(-2)).toBe(0)
    expect(clampExhaustionLevel(99)).toBe(6)
  })
})

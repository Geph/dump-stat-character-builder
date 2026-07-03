import { describe, expect, it } from "vitest"
import {
  aggregateCharacteristics,
  sumDamageRollModifiers,
} from "@/lib/compendium/characteristic-modifiers"

describe("creature-type-gated damage", () => {
  it("applies gated bonus only vs matching creature type", () => {
    const aggregated = aggregateCharacteristics([
      {
        id: "aberration_bonus",
        type: "damage_roll_modifiers",
        entries: [{ bonus: 5, target: "all", onlyVsCreatureTypes: ["Aberration"] }],
      },
      {
        id: "flat_bonus",
        type: "damage_roll_modifiers",
        entries: [{ bonus: 2, target: "all" }],
      },
    ])

    expect(sumDamageRollModifiers(aggregated, { targetCreatureType: "Aberration" })).toBe(7)
    expect(sumDamageRollModifiers(aggregated, { targetCreatureType: "Humanoid" })).toBe(2)
    expect(sumDamageRollModifiers(aggregated)).toBe(2)
  })
})

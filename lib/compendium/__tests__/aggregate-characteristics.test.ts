import { describe, expect, it } from "vitest"
import {
  aggregateCharacteristics,
  normalizeCharacteristics,
} from "@/lib/compendium/characteristic-modifiers"

describe("aggregateCharacteristics", () => {
  it("handles legacy import detector shapes that used values instead of typed fields", () => {
    const mods = normalizeCharacteristics(
      [
        {
          id: "mod_res",
          type: "damage_resistance",
          values: ["Fire", "Cold"],
        },
        {
          id: "mod_immune",
          type: "condition_immunity",
          values: ["Frightened"],
        },
        {
          id: "mod_saves",
          type: "saving_throws",
          values: ["Wisdom"],
        },
      ],
      null,
    )

    const aggregated = aggregateCharacteristics(mods)
    expect(aggregated.resistances).toEqual(["Fire", "Cold"])
    expect(aggregated.conditionImmunities).toEqual(["Frightened"])
    expect(aggregated.savingThrows).toEqual(["Wisdom"])
  })

  it("aggregates climb/swim speeds equal to walk", () => {
    const aggregated = aggregateCharacteristics([
      {
        id: "mod_climb",
        type: "speed",
        speedType: "climb",
        mode: "equal_to_walk",
        value: 0,
      },
      {
        id: "mod_swim",
        type: "speed",
        speedType: "swim",
        mode: "equal_to_walk",
        value: 0,
      },
    ])
    expect(aggregated.speedEqualToWalk.sort()).toEqual(["climb", "swim"])
  })
})

import { describe, expect, it } from "vitest"
import {
  filterDisplaySpeedEntries,
  resolveAllSpeeds,
} from "@/lib/character/resolve-all-speeds"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"

describe("filterDisplaySpeedEntries", () => {
  it("shows only walk when alternate speeds are ungranted placeholders", () => {
    expect(
      filterDisplaySpeedEntries([
        { type: "walk", label: "walk", feet: 10 },
        { type: "swim", label: "swim", feet: 0 },
        { type: "climb", label: "climb", feet: 0 },
      ]),
    ).toEqual([{ type: "walk", label: "walk", feet: 10 }])
  })

  it("keeps granted alternate speeds with non-zero feet", () => {
    expect(
      filterDisplaySpeedEntries([
        { type: "walk", label: "walk", feet: 30 },
        { type: "fly", label: "fly", feet: 45 },
        { type: "swim", label: "swim", feet: 30 },
      ]),
    ).toEqual([
      { type: "walk", label: "walk", feet: 30 },
      { type: "fly", label: "fly", feet: 45 },
      { type: "swim", label: "swim", feet: 30 },
    ])
  })

  it("adds movement bonuses to species walk speed and equal-to-walk speeds", () => {
    const aggregated = aggregateCharacteristics([
      { id: "fast", type: "speed", speedType: "walk", mode: "add", value: 5 },
      { id: "climb", type: "speed", speedType: "climb", mode: "equal_to_walk", value: 0 },
      { id: "climb-fast", type: "speed", speedType: "climb", mode: "add", value: 10 },
    ])

    expect(
      resolveAllSpeeds({
        walkSpeed: 35,
        aggregatedSpeed: aggregated.speed,
        aggregatedSpeedAdd: aggregated.speedAdd,
        aggregatedSpeedSet: aggregated.speedSet,
        speedEqualToWalk: aggregated.speedEqualToWalk,
      }),
    ).toEqual([
      { type: "walk", label: "walk", feet: 35 },
      { type: "climb", label: "climb", feet: 45 },
    ])
  })
})

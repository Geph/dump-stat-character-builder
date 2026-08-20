import { describe, expect, it } from "vitest"
import {
  formatSpeciesSizeDisplay,
  formatSpeciesSpeedDisplay,
  isSpeciesSizeChoiceTrait,
} from "@/lib/compendium/species-display"

describe("species display", () => {
  it("joins multiple size options", () => {
    expect(
      formatSpeciesSizeDisplay({
        size: "Medium",
        size_options: ["Small", "Medium"],
      }),
    ).toBe("Small or Medium")
  })

  it("falls back to a single size", () => {
    expect(formatSpeciesSizeDisplay({ size: "Medium", size_options: null })).toBe("Medium")
  })

  it("detects Size choice traits used as the duplicate picker", () => {
    expect(
      isSpeciesSizeChoiceTrait({
        name: "Size",
        isChoice: true,
        choices: { options: [{ name: "Medium" }, { name: "Small" }] },
      }),
    ).toBe(true)
    expect(
      isSpeciesSizeChoiceTrait({
        name: "Celestial Revelation",
        isChoice: true,
        choices: { options: [{ name: "Radiant Soul" }, { name: "Radiant Consumption" }] },
      }),
    ).toBe(false)
  })

  it("formats walking speed only", () => {
    expect(formatSpeciesSpeedDisplay(30)).toBe("30 ft.")
  })

  it("lists non-walk speeds when present", () => {
    expect(formatSpeciesSpeedDisplay({ walking: 30, fly: 30 })).toBe("30 ft., Fly 30 ft.")
    expect(formatSpeciesSpeedDisplay({ walk: 25, swim: 25, climb: 25 })).toBe(
      "25 ft., Swim 25 ft., Climb 25 ft.",
    )
  })
})

import { describe, expect, it } from "vitest"
import { formatSpeciesSizeDisplay, formatSpeciesSpeedDisplay } from "@/lib/compendium/species-display"

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

import { describe, expect, it } from "vitest"
import { scaledClassFeatGrantCount } from "@/lib/builder/scaled-feat-grant-counts"

describe("scaledClassFeatGrantCount — Mystic Techniques", () => {
  it("scales known techniques by class level thresholds", () => {
    expect(scaledClassFeatGrantCount("Alternate Monk", "Mystic Techniques", 3, 1)).toBe(1)
    expect(scaledClassFeatGrantCount("Alternate Monk", "Mystic Techniques", 5, 1)).toBe(2)
    expect(scaledClassFeatGrantCount("Alternate Monk", "Mystic Techniques", 19, 1)).toBe(9)
  })
})

import { describe, expect, it } from "vitest"
import { scaledClassFeatGrantCount } from "@/lib/builder/scaled-feat-grant-counts"

describe("scaledClassFeatGrantCount", () => {
  it("scales Warlock Eldritch Invocations by class level", () => {
    expect(scaledClassFeatGrantCount("Warlock", "Eldritch Invocations", 1, 1)).toBe(1)
    expect(scaledClassFeatGrantCount("Warlock", "Eldritch Invocations", 5, 1)).toBe(3)
    expect(scaledClassFeatGrantCount("Warlock", "Eldritch Invocations", 12, 1)).toBe(6)
    expect(scaledClassFeatGrantCount("Warlock", "Eldritch Invocations", 18, 1)).toBe(8)
  })

  it("scales Sorcerer Metamagic by class level", () => {
    expect(scaledClassFeatGrantCount("Sorcerer", "Metamagic", 2, 1)).toBe(1)
    expect(scaledClassFeatGrantCount("Sorcerer", "Metamagic", 4, 1)).toBe(2)
    expect(scaledClassFeatGrantCount("Sorcerer", "Metamagic", 10, 1)).toBe(3)
    expect(scaledClassFeatGrantCount("Sorcerer", "Metamagic", 16, 1)).toBe(4)
  })

  it("returns base count for unrelated features", () => {
    expect(scaledClassFeatGrantCount("Fighter", "Fighting Style", 10, 1)).toBe(1)
  })
})

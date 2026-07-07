import { describe, expect, it } from "vitest"
import {
  defaultClassComplexityForName,
  formatClassComplexityLabel,
  formatClassComplexityPhrase,
  resolveClassComplexity,
  SRD_CLASS_COMPLEXITY_BY_NAME,
} from "@/lib/compendium/class-complexity"

describe("class complexity", () => {
  it("maps SRD classes to the expected tiers", () => {
    expect(SRD_CLASS_COMPLEXITY_BY_NAME.Wizard).toBe("hard")
    expect(SRD_CLASS_COMPLEXITY_BY_NAME.Fighter).toBe("easy")
    expect(SRD_CLASS_COMPLEXITY_BY_NAME.Ranger).toBe("medium")
  })

  it("falls back to the SRD map when complexity is unset", () => {
    expect(resolveClassComplexity({ name: "Wizard", complexity: null })).toBe("hard")
    expect(defaultClassComplexityForName("Custom Class")).toBeNull()
  })

  it("prefers stored complexity over defaults", () => {
    expect(resolveClassComplexity({ name: "Wizard", complexity: "easy" })).toBe("easy")
  })

  it("formats labels for display", () => {
    expect(formatClassComplexityLabel("easy")).toBe("Low")
    expect(formatClassComplexityLabel("medium")).toBe("Medium")
    expect(formatClassComplexityLabel("hard")).toBe("High")
    expect(formatClassComplexityPhrase("hard")).toBe("High Complexity")
  })
})

import { describe, expect, it } from "vitest"

import {
  formatActionSpendLabel,
  stripResourceClassQualifier,
} from "@/lib/character/action-spend-label"

describe("stripResourceClassQualifier", () => {
  it("drops a trailing class qualifier", () => {
    expect(stripResourceClassQualifier("Dances (Dancer)")).toBe("Dances")
  })

  it("leaves a name without a qualifier unchanged", () => {
    expect(stripResourceClassQualifier("Ki Points")).toBe("Ki Points")
  })
})

describe("formatActionSpendLabel", () => {
  it("names the matching resource when it would otherwise be only a number", () => {
    expect(formatActionSpendLabel(1, "Dances (Dancer)", "Dance")).toBe("uses 1 dance")
    expect(formatActionSpendLabel(2, "Dances", "Dance")).toBe("uses 2 dances")
  })

  it("singularizes a different resource name at count 1", () => {
    expect(formatActionSpendLabel(1, "Ki Points (Monk)", "Flurry of Blows")).toBe("1 Ki Point")
    expect(formatActionSpendLabel(2, "Ki Points (Monk)", "Flurry of Blows")).toBe("2 Ki Points")
  })

  it("keeps an uncountable resource name as-is", () => {
    expect(formatActionSpendLabel(1, "Channel Divinity", "Turn Undead")).toBe(
      "1 Channel Divinity",
    )
  })
})

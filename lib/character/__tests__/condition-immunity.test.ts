import { describe, expect, it } from "vitest"

import {
  formatConditionImmunityNote,
  sourcesForConditionImmunity,
} from "@/lib/character/condition-immunity"

describe("condition immunity lookup", () => {
  it("matches Exhausted wiring to the Exhaustion picker", () => {
    expect(
      sourcesForConditionImmunity({ Exhausted: ["Timeless Body"] }, "Exhaustion"),
    ).toEqual(["Timeless Body"])
  })

  it("formats a feature note for the conditions menu", () => {
    expect(formatConditionImmunityNote(["Fey Ancestry"])).toBe("Immune — Fey Ancestry")
    expect(formatConditionImmunityNote(["Fey Ancestry", "Calm Emotions"])).toBe(
      "Immune — Fey Ancestry, Calm Emotions",
    )
  })
})

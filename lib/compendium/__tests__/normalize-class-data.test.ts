import { describe, expect, it } from "vitest"
import { stripInternalClassFeatureGuidance } from "@/lib/compendium/normalize-class-data"

describe("stripInternalClassFeatureGuidance", () => {
  it("removes renderer instructions appended to Kibbles feature prose", () => {
    const description =
      "<p>Choose an Inventor specialization.</p><p>Inventor Specialization is the subclass unlock. Put specializations in top-level subclasses[].</p>"

    expect(stripInternalClassFeatureGuidance(description)).toBe(
      "<p>Choose an Inventor specialization.</p>",
    )
  })

  it("leaves normal player-facing descriptions unchanged", () => {
    const description = "<p>You select an aspect of primal power and manifest your bond.</p>"
    expect(stripInternalClassFeatureGuidance(description)).toBe(description)
  })
})

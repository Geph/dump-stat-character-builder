import { describe, expect, it } from "vitest"
import {
  builderChoiceTargetId,
  inferBlockerTarget,
} from "@/lib/builder/proceed-blockers"

describe("proceed blocker targets", () => {
  it("targets the exact language choice instead of the top of the species section", () => {
    expect(inferBlockerTarget("Aasimar: Languages (0/2).", 2)).toBe(
      builderChoiceTargetId("Aasimar", "Languages"),
    )
  })

  it("builds stable choice target ids", () => {
    expect(builderChoiceTargetId("Human Species", "Choose Languages")).toBe(
      "builder-choice-human-species-choose-languages",
    )
  })
})

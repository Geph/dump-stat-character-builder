import { describe, expect, it } from "vitest"
import {
  applySpellDisplayMutations,
  inferMetamagicEffectHint,
} from "@/lib/character/spell-cast-mutations"

describe("spell-cast mutations", () => {
  it("infers hints from Metamagic names", () => {
    expect(inferMetamagicEffectHint("Distant Spell")).toBe("distant")
    expect(inferMetamagicEffectHint("Extended Spell")).toBe("extended")
    expect(inferMetamagicEffectHint("Twinned Spell")).toBe("twinned")
    expect(inferMetamagicEffectHint("Subtle Spell")).toBe("subtle")
    expect(inferMetamagicEffectHint("Quickened Spell")).toBe("quicken")
  })

  it("doubles range and turns Touch into 30 feet", () => {
    expect(
      applySpellDisplayMutations({ range: "60 feet" }, ["distant"]).range,
    ).toBe("120 feet")
    expect(applySpellDisplayMutations({ range: "Touch" }, ["distant"]).range).toBe("30 feet")
    expect(applySpellDisplayMutations({ range: "Self" }, ["distant"]).range).toBe("Self")
  })

  it("doubles duration and caps hours at 24", () => {
    expect(
      applySpellDisplayMutations({ duration: "Concentration, up to 1 minute" }, ["extended"])
        .duration,
    ).toBe("Concentration, up to 2 minutes")
    expect(applySpellDisplayMutations({ duration: "16 hours" }, ["extended"]).duration).toBe(
      "24 hours",
    )
  })

  it("drops V/S for Subtle and notes a Twinned extra target", () => {
    const subtle = applySpellDisplayMutations({ components: ["V", "S", "M"] }, ["subtle"])
    expect(subtle.components).toEqual(["M"])
    const twinned = applySpellDisplayMutations({ range: "30 feet" }, ["twinned"])
    expect(twinned.targetsNote).toMatch(/additional/)
  })
})

import { describe, expect, it } from "vitest"
import {
  elementMatchesSpecialization,
  resolveSpecializedElement,
  shouldWaivePsiCostForSpecialization,
} from "@/lib/character/resolve-specialized-element"

describe("resolveSpecializedElement", () => {
  it("reads element from specialization choice key", () => {
    expect(
      resolveSpecializedElement({
        elemental_mind_specialization: ["Fire"],
      }),
    ).toBe("fire")
  })

  it("waives psi when specialization matches feature element", () => {
    const specialized = resolveSpecializedElement({
      primordial_specialization: ["Lightning"],
    })
    expect(specialized).toBe("lightning")
    expect(
      shouldWaivePsiCostForSpecialization({
        specializedElement: specialized,
        featureElement: "lightning",
        waiveWhenSpecializedElement: "lightning",
      }),
    ).toBe(true)
    expect(
      shouldWaivePsiCostForSpecialization({
        specializedElement: specialized,
        featureElement: "cold",
        waiveWhenSpecializedElement: "cold",
      }),
    ).toBe(false)
  })

  it("matches element aliases", () => {
    expect(elementMatchesSpecialization("cold", "ice")).toBe(true)
  })
})

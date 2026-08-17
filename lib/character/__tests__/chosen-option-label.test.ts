import { describe, expect, it } from "vitest"
import { chosenOptionNames, withChosenOptionChrome } from "@/lib/character/chosen-option-label"

describe("chosen option chrome", () => {
  it("appends selected options to the feature name", () => {
    expect(withChosenOptionChrome("Hunter's Prey", ["Colossus Slayer"])).toBe(
      "Hunter's Prey — Colossus Slayer",
    )
  })

  it("reads class-scoped feature choice picks", () => {
    expect(
      chosenOptionNames(
        { name: "Hunter's Prey", level: 3, isChoice: true, choices: { options: [] } },
        "ranger",
        { "ranger:L3:Hunter's Prey": ["Colossus Slayer"] },
      ),
    ).toEqual(["Colossus Slayer"])
  })

  it("falls back to a name-keyed pick when no class id is present", () => {
    expect(
      chosenOptionNames({ name: "Ancestral Legacy", isChoice: true }, null, {
        "Ancestral Legacy": ["Elf"],
      }),
    ).toEqual(["Elf"])
  })
})

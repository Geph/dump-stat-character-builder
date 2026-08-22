import { describe, expect, it } from "vitest"
import {
  chosenOptionNames,
  looksLikeChoicePickId,
  resolveChoicePickLabel,
  withChosenOptionChrome,
} from "@/lib/character/chosen-option-label"

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

  it("resolves feat-id picks to names for Fighting Style chrome", () => {
    const featId = "f7242605-edb8-4f9d-b58c-0961a0d96c75"
    expect(
      chosenOptionNames(
        { name: "Fighting Style", level: 2, isChoice: true },
        "captain",
        { "captain:L2:Fighting Style": [featId] },
        { labelByPickId: { [featId]: "Archery" } },
      ),
    ).toEqual(["Archery"])
  })

  it("hides unresolved raw ids instead of showing them", () => {
    expect(looksLikeChoicePickId("f7242605-edb8-4f9d-b58c-0961a0d96c75")).toBe(true)
    expect(resolveChoicePickLabel("f7242605-edb8-4f9d-b58c-0961a0d96c75")).toBe("")
    expect(
      withChosenOptionChrome("Fighting Style", [
        resolveChoicePickLabel("f7242605-edb8-4f9d-b58c-0961a0d96c75"),
      ]),
    ).toBe("Fighting Style")
  })
})

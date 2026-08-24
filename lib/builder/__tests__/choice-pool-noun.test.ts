import { describe, expect, it } from "vitest"
import {
  choicePoolHint,
  choicePoolNoun,
  pluralizeChoiceNoun,
} from "@/lib/builder/choice-pool-noun"
import type { Feature } from "@/lib/types"

function poolFeature(name: string, category: string, swappableOnRest = false): Feature {
  return {
    name,
    level: 2,
    description: "",
    isChoice: true,
    choices: {
      category,
      options: [],
      count: 3,
      optionsSource: "class_knacks",
      swappableOnRest,
    },
  } as unknown as Feature
}

describe("choicePoolNoun", () => {
  it("uses the pool's own category instead of the shared knack pipeline name", () => {
    expect(choicePoolNoun(poolFeature("Occult Rites", "Occult Rite"))).toBe("Occult Rite")
    expect(choicePoolNoun(poolFeature("Martial Exploits", "Martial Exploit"))).toBe(
      "Martial Exploit",
    )
    expect(choicePoolNoun(poolFeature("Knacks", "Knack"))).toBe("Knack")
  })

  it("falls back to a noun in the feature name, then to Knack", () => {
    expect(choicePoolNoun(poolFeature("Devious Tricks", ""))).toBe("Trick")
    expect(choicePoolNoun(poolFeature("Hidden Depths", ""))).toBe("Knack")
  })
})

describe("pluralizeChoiceNoun", () => {
  it("pluralizes count-dependent nouns", () => {
    expect(pluralizeChoiceNoun("Occult Rite", 3)).toBe("Occult Rites")
    expect(pluralizeChoiceNoun("Occult Rite", 1)).toBe("Occult Rite")
    expect(pluralizeChoiceNoun("Discovery", 2)).toBe("Discoveries")
    expect(pluralizeChoiceNoun("Focus", 2)).toBe("Focuses")
  })

  it("treats mass nouns as options rather than pluralizing them", () => {
    expect(pluralizeChoiceNoun("Metamagic", 2)).toBe("Metamagic options")
    expect(pluralizeChoiceNoun("Metamagic", 1)).toBe("Metamagic option")
  })
})

describe("choicePoolHint", () => {
  it("names Occult Rites in the builder hint", () => {
    expect(choicePoolHint(poolFeature("Occult Rites", "Occult Rite"), 3)).toBe(
      "Choose 3 Occult Rites.",
    )
  })

  it("keeps the level-up swap note for rest-swappable pools", () => {
    expect(choicePoolHint(poolFeature("Knacks", "Knack", true), 1)).toBe(
      "Choose 1 Knack (replace one when you level up).",
    )
  })
})

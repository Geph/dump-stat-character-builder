import { describe, expect, it } from "vitest"
import {
  applyBackgroundFeatGrantNarrative,
  collectBackgroundFeatGrantGaps,
  collectMissingBackgroundFeatGrants,
} from "@/lib/import/collect-missing-background-feat-grants"

describe("collectMissingBackgroundFeatGrants", () => {
  it("warns when dragonmark feats are not in the batch or SRD seed", () => {
    const missing = collectMissingBackgroundFeatGrants({
      backgrounds: [
        {
          name: "House Cannith Heir",
          description: null,
          skill_proficiencies: null,
          feat_granted: "Mark of Making",
          ability_bonuses: { strength: 0, dexterity: 0, intelligence: 0 },
        },
        {
          name: "Mist Wanderer",
          description: null,
          skill_proficiencies: null,
          feat_granted: "Choose one Dark Gift feat",
          ability_bonuses: { dexterity: 0, constitution: 0, wisdom: 0 },
        },
      ],
    })
    expect(missing.map((row) => row.name)).toContain("Mark of Making")
    expect(missing.map((row) => row.name)).not.toContain("Choose one Dark Gift feat")
  })

  it("skips feats included in the same import batch", () => {
    const missing = collectMissingBackgroundFeatGrants({
      backgrounds: [
        {
          name: "House Cannith Heir",
          description: null,
          skill_proficiencies: null,
          feat_granted: "Mark of Making",
          ability_bonuses: null,
        },
      ],
      feats: [
        {
          name: "Mark of Making",
          description: "You create wonders.",
          category: "Origin",
          prerequisite: null,
        },
      ],
    })
    expect(missing).toEqual([])
  })
})

describe("collectBackgroundFeatGrantGaps", () => {
  const hauntedOne = {
    name: "Haunted One",
    description: null,
    skill_proficiencies: null,
    feat_granted: "Survivor or a Dark Gift feat of your choice",
    ability_bonuses: { constitution: 0, wisdom: 0, charisma: 0 },
  }

  it("flags missing named feat and empty Dark Gift category", () => {
    const gaps = collectBackgroundFeatGrantGaps({ backgrounds: [hauntedOne] })
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toMatchObject({
      backgroundName: "Haunted One",
      missingFeatNames: ["Survivor"],
      missingCategory: "Dark Gift",
    })
  })

  it("clears gaps when library provides the named feat and a Dark Gift feat", () => {
    const gaps = collectBackgroundFeatGrantGaps({ backgrounds: [hauntedOne] }, [
      { name: "Survivor", category: "Origin" },
      { name: "Mist Walker", category: "Dark Gift" },
    ])
    expect(gaps).toEqual([])
  })

  it("flags fixed named grants like dragonmarks", () => {
    const gaps = collectBackgroundFeatGrantGaps({
      backgrounds: [
        {
          name: "House Cannith Heir",
          description: null,
          skill_proficiencies: null,
          feat_granted: "Mark of Making",
          ability_bonuses: { strength: 0, dexterity: 0, intelligence: 0 },
        },
      ],
    })
    expect(gaps).toHaveLength(1)
    expect(gaps[0]?.missingFeatNames).toEqual(["Mark of Making"])
    expect(gaps[0]?.missingCategory).toBeNull()
  })
})

describe("applyBackgroundFeatGrantNarrative", () => {
  it("moves the grant text onto the feature and clears feat_granted", () => {
    const next = applyBackgroundFeatGrantNarrative(
      {
        backgrounds: [
          {
            name: "Haunted One",
            description: null,
            skill_proficiencies: null,
            feat_granted: "Survivor or a Dark Gift feat of your choice",
            ability_bonuses: { constitution: 0, wisdom: 0, charisma: 0 },
            feature: { name: "Heart of Darkness", description: "<p>Commoners aid you.</p>" },
          },
          {
            name: "Untouched",
            description: null,
            skill_proficiencies: null,
            feat_granted: "Alert",
            ability_bonuses: null,
          },
        ],
      },
      ["Haunted One"],
    )
    const haunted = next.backgrounds?.[0]
    expect(haunted?.feat_granted).toBeNull()
    expect(haunted?.feature?.description).toContain("Commoners aid you.")
    expect(haunted?.feature?.description).toContain(
      "Survivor or a Dark Gift feat of your choice",
    )
    // Untargeted backgrounds are untouched.
    expect(next.backgrounds?.[1]?.feat_granted).toBe("Alert")
  })
})

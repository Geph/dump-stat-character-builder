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
    expect(missing.map((row) => row.name)).not.toContain("Crafter")
    expect(missing.map((row) => row.name)).not.toContain("Gain a Feat (Dark Gift)")
  })

  it("does not warn for preset-backed Origin grants or Gain a Feat labels", () => {
    const missing = collectMissingBackgroundFeatGrants({
      backgrounds: [
        {
          name: "Artisan",
          description: null,
          skill_proficiencies: null,
          feat_granted: "Crafter",
          ability_bonuses: null,
        },
        {
          name: "Investigator",
          description: null,
          skill_proficiencies: null,
          feat_granted: "Gain a Feat (Dark Gift)",
          ability_bonuses: null,
        },
      ],
    })
    expect(missing).toEqual([])
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

  it("does not flag Survivor / Dark Gift when name presets already cover them", () => {
    expect(collectBackgroundFeatGrantGaps({ backgrounds: [hauntedOne] })).toEqual([])
  })

  it("does not flag Gain a Feat (Dark Gift) detector labels or preset Origin grants", () => {
    expect(
      collectBackgroundFeatGrantGaps({
        backgrounds: [
          {
            name: "Investigator",
            description: null,
            skill_proficiencies: null,
            feat_granted: "Gain a Feat (Dark Gift)",
            ability_bonuses: { intelligence: 0, wisdom: 0 },
          },
          {
            name: "Artisan",
            description: null,
            skill_proficiencies: null,
            feat_granted: "Crafter",
            ability_bonuses: { strength: 0, dexterity: 0, intelligence: 0 },
          },
          {
            name: "Gate Warden",
            description: null,
            skill_proficiencies: null,
            feat_granted: "Scion of the Outer Planes",
            ability_bonuses: { charisma: 0 },
          },
        ],
      }),
    ).toEqual([])
  })

  it("still flags an unknown named feat plus an empty unknown category", () => {
    const gaps = collectBackgroundFeatGrantGaps({
      backgrounds: [
        {
          name: "Pact Seeker",
          description: null,
          skill_proficiencies: null,
          feat_granted: "Mark of Making or a House Mark feat of your choice",
          ability_bonuses: { intelligence: 0 },
        },
      ],
    })
    expect(gaps).toHaveLength(1)
    expect(gaps[0]).toMatchObject({
      backgroundName: "Pact Seeker",
      missingFeatNames: ["Mark of Making"],
      missingCategory: "House Mark",
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

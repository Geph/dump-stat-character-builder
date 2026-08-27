import { describe, expect, it } from "vitest"
import {
  backgroundFeatureShowsOnFeaturesTab,
  buildFeatureTabSections,
  featAsiChosenSummary,
} from "@/lib/character/feature-tab-sections"
import { COMBINED_MILESTONE_ASI_KEY } from "@/lib/builder/asi-allocation"
import type { Feat } from "@/lib/types"

describe("backgroundFeatureShowsOnFeaturesTab", () => {
  it("hides the synthetic Background Proficiencies shell", () => {
    expect(
      backgroundFeatureShowsOnFeaturesTab({
        name: "Background Proficiencies",
        description: "",
      }),
    ).toBe(false)
    expect(
      backgroundFeatureShowsOnFeaturesTab({
        name: "Background Proficiencies",
        description: null,
      }),
    ).toBe(false)
  })

  it("shows real narrative background features", () => {
    expect(
      backgroundFeatureShowsOnFeaturesTab({
        name: "Shelter of the Faithful",
        description: "As an acolyte, you command the respect of those who share your faith.",
      }),
    ).toBe(true)
  })
})

describe("featAsiChosenSummary", () => {
  const asiFeat = { id: "feat-asi", name: "Ability Score Improvement" } as Feat

  it("formats combined milestone ASI for the Feat or ASI card", () => {
    expect(
      featAsiChosenSummary(
        asiFeat,
        { [COMBINED_MILESTONE_ASI_KEY]: { strength: 2 } },
        { featIds: [asiFeat.id], feats: [asiFeat] },
      ),
    ).toBe("+2 Strength")
  })

  it("formats split ASI picks", () => {
    expect(
      featAsiChosenSummary(
        asiFeat,
        { [COMBINED_MILESTONE_ASI_KEY]: { dexterity: 1, wisdom: 1 } },
        { featIds: [asiFeat.id], feats: [asiFeat] },
      ),
    ).toBe("+1 Dexterity, +1 Wisdom")
  })

  it("reads level-up pool keys when combined milestone is empty", () => {
    expect(
      featAsiChosenSummary(
        asiFeat,
        { "feat:class:L4:Ability Score Improvement::asi": { constitution: 2 } },
        { featIds: [asiFeat.id], feats: [asiFeat] },
      ),
    ).toBe("+2 Constitution")
  })
})

describe("buildFeatureTabSections", () => {
  it("omits the Background Feature section for the proficiency shell", () => {
    const sections = buildFeatureTabSections({
      classDetails: [],
      backgroundFeature: { name: "Background Proficiencies", description: "" },
      feats: [],
      featureChoicePicks: {},
    })
    expect(sections.find((section) => section.id === "background")).toBeUndefined()
  })

  it("includes the Background Feature section when there is a real feature", () => {
    const sections = buildFeatureTabSections({
      classDetails: [],
      backgroundFeature: {
        name: "Researcher",
        description: "When you attempt to learn or recall a piece of lore…",
      },
      feats: [],
      featureChoicePicks: {},
    })
    expect(sections.find((section) => section.id === "background")?.items[0]?.name).toBe(
      "Researcher",
    )
  })

  it("shows a selected lineage's rules instead of the generic lineage prompt", () => {
    const sections = buildFeatureTabSections({
      classDetails: [],
      species: {
        name: "Elf",
        traits: [
          {
            name: "Elven Lineage",
            description: "Choose a lineage.",
            isChoice: true,
            choices: {
              category: "Lineage",
              count: 1,
              options: [
                { name: "Drow", description: "You know Dancing Lights and gain Drow magic." },
                { name: "High Elf", description: "You know Prestidigitation and gain High Elf magic." },
              ],
            },
          },
        ],
      },
      feats: [],
      featureChoicePicks: {},
      speciesTraitPicks: { "Elven Lineage": ["Drow"] },
    })

    expect(sections.find((section) => section.id === "species")?.items[0]).toMatchObject({
      chosenNames: ["Drow"],
      description: "You know Dancing Lights and gain Drow magic.",
    })
  })

  it("attaches ASI allocations to Ability Score Improvement feats", () => {
    const sections = buildFeatureTabSections({
      classDetails: [],
      feats: [{ id: "feat-asi", name: "Ability Score Improvement", description: "…" } as Feat],
      featureChoicePicks: {},
      asiAllocations: { [COMBINED_MILESTONE_ASI_KEY]: { strength: 1, charisma: 1 } },
      featIds: ["feat-asi"],
    })
    expect(sections.find((section) => section.id === "feats")?.items[0]?.chosenNames).toEqual([
      "+1 Strength, +1 Charisma",
    ])
  })

  it("omits Feat/ASI milestones and subclass selection from the class features box", () => {
    const sections = buildFeatureTabSections({
      classDetails: [
        {
          row: { class_id: "class-1", level: 4, subclass_id: "sub-1" },
          class: {
            id: "class-1",
            name: "Fighter",
            features: [
              { level: 1, name: "Fighting Style", linkedModifiers: [{ instanceId: "a", catalogRefId: "cat_char_grant_feat", characteristics: [{ id: "g", type: "grant_feat", featCategories: ["Fighting Style"], count: 1 }] }] },
              { level: 1, name: "Second Wind", description: "Regain hit points." },
              { level: 3, name: "Martial Archetype" },
              { level: 4, name: "Ability Score Improvement" },
              { level: 5, name: "Extra Attack", description: "Attack twice." },
            ],
          },
          subclass: {
            id: "sub-1",
            name: "Champion",
            features: [{ level: 3, name: "Improved Critical", description: "Crit on 19–20." }],
          },
        } as never,
      ],
      feats: [],
      featureChoicePicks: {},
    })

    const classItems = sections.find((section) => section.id === "class:class-1")?.items ?? []
    expect(classItems.map((item) => item.name)).toEqual(["Second Wind"])
    // Extra Attack is level 5; character is level 4 — correctly omitted by level filter.
    expect(sections.find((section) => section.id === "subclass:class-1")?.items.map((i) => i.name)).toEqual([
      "Improved Critical",
    ])
  })
})

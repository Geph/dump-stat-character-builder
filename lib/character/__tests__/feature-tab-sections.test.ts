import { describe, expect, it } from "vitest"
import {
  backgroundFeatureShowsOnFeaturesTab,
  buildChoiceDescriptionLookup,
  buildFeatureTabSections,
  featAsiChosenSummary,
  isGenericChoicePrompt,
  selectedChoiceDescription,
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
    })
    expect(sections.find((section) => section.id === "species")?.items[0]?.description).toContain(
      "You know Dancing Lights and gain Drow magic.",
    )
    expect(sections.find((section) => section.id === "species")?.items[0]?.description).toContain(
      "Drow",
    )
    expect(sections.find((section) => section.id === "species")?.items[0]?.description).not.toContain(
      "Choose a lineage.",
    )
  })

  it("keeps Dance Styles picker rules and appends the chosen style's effect", () => {
    const shiftRules =
      "When you take the Attack action while Dancing, you can teleport up to 10 feet before or after one of the attacks."
    const sections = buildFeatureTabSections({
      classDetails: [
        {
          row: { class_id: "dancer-1", level: 3, subclass_id: null },
          class: {
            id: "dancer-1",
            name: "Dancer",
            features: [
              {
                level: 2,
                name: "Dance Styles",
                description:
                  "When you begin your Dance, choose one of your Dance Styles. You know one Dance Style of your choice, and you learn an additional Dance Style at Dancer level 13 (Freestyle).",
                isChoice: true,
                choices: {
                  category: "Dance Style",
                  count: 1,
                  optionsSource: "class_upgrades",
                  options: [],
                },
              },
            ],
          },
          subclass: null,
        } as never,
      ],
      feats: [],
      featureChoicePicks: { "dancer-1:L2:Dance Styles": ["Shift"] },
      choiceDescriptionByName: { shift: shiftRules },
    })

    const item = sections.find((section) => section.id === "class:dancer-1")?.items[0]
    expect(item?.chosenNames).toEqual(["Shift"])
    expect(item?.description).toContain("When you begin your Dance")
    expect(item?.description).toContain(shiftRules)
    expect(item?.description).toContain("Shift")
  })

  it("shows the chosen Magic Initiate spell list in chrome and specialized prose", () => {
    const feat = {
      id: "feat-mi",
      name: "Magic Initiate",
      description:
        "You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list.",
    } as Feat
    const sections = buildFeatureTabSections({
      classDetails: [],
      originFeat: feat,
      originFeatFallbackName: "Magic Initiate (Cleric)",
      feats: [],
      featureChoicePicks: {},
    })
    const item = sections.find((section) => section.id === "feats")?.items[0]
    expect(item?.name).toBe("Magic Initiate")
    expect(item?.chosenNames).toEqual(["Cleric"])
    expect(item?.description).toContain("from the Cleric spell list")
    expect(item?.description).not.toContain("Druid, or Wizard")
  })

  it("shows the chosen Energy Mastery damage type on Elemental Adept", () => {
    const feat = {
      id: "feat-elemental",
      name: "Elemental Adept",
      description: "Energy Mastery",
      linkedModifiers: [
        {
          instanceId: "modinst_elemental_adept_type",
          catalogRefId: "cat_char_damage_resistance",
          characteristics: [
            {
              id: "mod_elemental_adept_type",
              type: "damage_resistance",
              damageTypes: [],
              choiceCount: 1,
              choiceOptions: ["Acid", "Cold", "Fire", "Lightning", "Thunder"],
            },
          ],
        },
      ],
    } as unknown as Feat
    const sections = buildFeatureTabSections({
      classDetails: [],
      feats: [feat],
      featureChoicePicks: {},
      modifierPlayerPicks: {
        "feat:granted:feat-elemental::mod_elemental_adept_type::damage_type": ["Lightning"],
      },
    })
    expect(sections.find((section) => section.id === "feats")?.items[0]?.chosenNames).toEqual([
      "Lightning",
    ])
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

describe("selectedChoiceDescription", () => {
  it("treats short choose-prompts as generic", () => {
    expect(isGenericChoicePrompt("Choose a lineage.")).toBe(true)
    expect(
      isGenericChoicePrompt(
        "When you begin your Dance, choose one of your Dance Styles. You know one Dance Style of your choice.",
      ),
    ).toBe(false)
  })

  it("does not repeat option text already in the parent description", () => {
    const colossus = "When you hit a creature with a weapon attack, the target takes extra damage."
    expect(
      selectedChoiceDescription(
        {
          description: `Choose one. Colossus Slayer. ${colossus}`,
          choices: {
            options: [{ name: "Colossus Slayer", description: colossus }],
          },
        },
        ["Colossus Slayer"],
      ),
    ).toBe(`Choose one. Colossus Slayer. ${colossus}`)
  })

  it("builds a name-keyed lookup from custom abilities", () => {
    const lookup = buildChoiceDescriptionLookup([
      { name: "Shift", description: "Teleport 10 feet as part of the Attack action." },
      { name: "Elegant Form [Dance Style]", description: "Add your Dance Die to a failed save." },
    ])
    expect(lookup.shift?.[0]?.description).toContain("Teleport 10 feet")
    expect(lookup["elegant form"]?.[0]?.description).toContain("Dance Die")
  })

  it("prefers an upgrade over a same-named weapon mastery on class_upgrades", () => {
    const lookup = buildChoiceDescriptionLookup([
      {
        name: "Shift",
        ability_role: "weapon_mastery",
        description: "If you hit a creature with this weapon, move 10 feet.",
      },
      {
        name: "Shift",
        ability_role: "upgrade",
        description: "While Dancing, you can teleport 10 feet after an attack.",
      },
    ])
    expect(
      selectedChoiceDescription(
        {
          description: "When you begin your Dance, choose one of your Dance Styles.",
          choices: { optionsSource: "class_upgrades", category: "Dance Style", options: [] },
        },
        ["Shift"],
        lookup,
      ),
    ).toContain("While Dancing, you can teleport 10 feet after an attack.")
  })

  it("does not borrow weapon mastery text for a Dance Style pick", () => {
    const lookup = buildChoiceDescriptionLookup([
      {
        name: "Shift",
        ability_role: "weapon_mastery",
        description: "If you hit a creature with this weapon, move 10 feet.",
      },
    ])
    const text = selectedChoiceDescription(
      {
        description: "When you begin your Dance, choose one of your Dance Styles.",
        choices: {
          optionsSource: "class_upgrades",
          category: "Dance Style",
          resourceKey: "dance_styles_known",
          options: [],
        },
      },
      ["Shift"],
      lookup,
    )
    expect(text).toContain("When you begin your Dance")
    expect(text).not.toContain("If you hit a creature with this weapon")
  })
})

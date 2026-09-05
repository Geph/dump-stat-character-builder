import { describe, expect, it } from "vitest"
import { FEAT_MODIFIER_PRESETS } from "@/lib/compendium/feat-modifier-presets"
import {
  assignLevelUpSpellsToNewModifierSlots,
  buildLevelUpPlan,
  countReplacedPicks,
  spellsEligibleForLevelUp,
} from "@/lib/character/level-up-plan"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { DndClass, Feature, Spell } from "@/lib/types"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"

function feature(name: string, level: number, extra: Partial<Feature> = {}): Feature {
  return {
    name,
    level,
    description: `${name} at ${level}`,
    ...extra,
  } as Feature
}

function rangerAt(level: number): CharacterClassDetail {
  const cls = {
    id: "ranger",
    name: "Ranger",
    features: [
      feature("Spellcasting", 1),
      feature("Hunter's Prey", 3, {
        isChoice: true,
        choices: {
          category: "Hunter's Prey",
          count: 1,
          options: [{ name: "Colossus Slayer", description: "Extra 1d8" }],
        },
      }),
      feature("Ability Score Improvement", 4),
    ],
    spellcasting: {
      ability: "Wisdom",
      prepared: true,
      progression: [
        { level: 2, cantrips: 0, prepared: 2, max_spell_level: 1 },
        { level: 3, cantrips: 0, prepared: 3, max_spell_level: 1 },
      ],
    },
  } as DndClass
  return {
    row: { class_id: "ranger", level, subclass_id: "hunter", order: 0 },
    class: cls,
    subclass: {
      id: "hunter",
      class_id: "ranger",
      name: "Hunter",
      features: [feature("Hunter's Prey", 3)],
    } as CharacterClassDetail["subclass"],
  }
}

describe("buildLevelUpPlan", () => {
  it("surfaces Hunter's Prey choice and extra prepared spells at 3", () => {
    const plan = buildLevelUpPlan({
      entry: rangerAt(2),
      subclasses: [],
      currentTotalLevel: 2,
      featureChoicePicks: {},
    })
    expect(plan?.toLevel).toBe(3)
    expect(plan?.newFeatures.some((feature) => feature.name === "Hunter's Prey")).toBe(true)
    expect(plan?.steps.some((step) => step.kind === "feature_choice" && step.title === "Hunter's Prey")).toBe(
      true,
    )
    expect(plan?.steps.some((step) => step.kind === "spells" && step.extraPrepared === 1)).toBe(true)
  })

  it("adds a feat-or-ASI step at level 4", () => {
    const plan = buildLevelUpPlan({
      entry: rangerAt(3),
      subclasses: [],
      currentTotalLevel: 3,
      featureChoicePicks: {},
    })
    expect(plan?.steps.some((step) => step.kind === "feat_or_asi")).toBe(true)
  })

  it("offers only Epic Boon at level 19 and does not add a second General feat step", () => {
    const cls = {
      id: "fighter",
      name: "Fighter",
      features: [
        feature("Ability Score Improvement", 4),
        feature("Epic Boon", 19, {
          description:
            "You gain an Epic Boon feat or another feat of your choice for which you qualify.",
          linkedModifiers: [
            {
              instanceId: "epic",
              catalogRefId: "cat_char_grant_feat",
              characteristics: [
                {
                  id: "g",
                  type: "grant_feat",
                  featCategories: ["Epic Boon"],
                  count: 1,
                },
              ],
            },
          ],
        }),
      ],
    } as DndClass
    const entry: CharacterClassDetail = {
      row: { class_id: "fighter", level: 18, subclass_id: null, order: 0 },
      class: cls,
      subclass: null,
    }
    const plan = buildLevelUpPlan({
      entry,
      subclasses: [],
      currentTotalLevel: 18,
      featureChoicePicks: {},
      modifierCatalog: FEAT_MODIFIER_PRESETS as never,
    })
    const featSteps = plan?.steps.filter((step) => step.kind === "feat_or_asi") ?? []
    expect(featSteps).toHaveLength(1)
    expect(featSteps[0]).toMatchObject({
      level: 19,
      featCategories: ["Epic Boon"],
      title: "Choose Epic Boon",
    })
  })

  it("forces Epic Boon categories when level 19 is an ASI feature name", () => {
    const cls = {
      id: "alt_monk",
      name: "Alternate Monk",
      features: [feature("Ability Score Improvement", 19)],
    } as DndClass
    const entry: CharacterClassDetail = {
      row: { class_id: "alt_monk", level: 18, subclass_id: null, order: 0 },
      class: cls,
      subclass: null,
    }
    const plan = buildLevelUpPlan({
      entry,
      subclasses: [],
      currentTotalLevel: 18,
      featureChoicePicks: {},
    })
    const featSteps = plan?.steps.filter((step) => step.kind === "feat_or_asi") ?? []
    expect(featSteps).toHaveLength(1)
    expect(featSteps[0]).toMatchObject({
      level: 19,
      featCategories: ["Epic Boon"],
      title: "Choose Epic Boon",
    })
  })
})

const FORMULAS_KEY = "alchemist:L2:Bomb Formulas"
const DISCOVERY_KEY = "alchemist:L5:Discovery"

function alchemistAt(level: number): CharacterClassDetail {
  return {
    row: { class_id: "alchemist", level, subclass_id: null, order: 0 },
    class: {
      id: "alchemist",
      name: "Alchemist",
      features: [
        feature("Bombs", 1),
        feature("Bomb Formulas", 2, {
          isChoice: true,
          choices: {
            category: "Bomb Formula",
            count: 3,
            options: [],
            optionsSource: "class_bomb_formulas",
            choiceCountByLevel: [
              { level: 2, count: 3 },
              { level: 4, count: 4 },
              { level: 8, count: 5 },
            ],
            swappableOnRest: true,
            swapRestType: "long",
            swappableOnLevelUp: true,
          },
        }),
        feature("Potion Mixologist", 15, {
          activation: { bonusAction: true },
          sheetDisplay: { abilitiesActions: true },
        }),
        feature("Discovery", 5, {
          isChoice: true,
          choices: {
            category: "Discovery",
            count: 1,
            options: [],
            optionsSource: "class_discoveries",
            resourceKey: "discoveries_known",
            choiceCountByLevel: [
              { level: 5, count: 1 },
              { level: 9, count: 2 },
              { level: 13, count: 3 },
              { level: 17, count: 4 },
            ],
            swappableOnLevelUp: true,
          },
        }),
      ],
    } as DndClass,
    subclass: null,
  } as CharacterClassDetail
}

function formulaStep(plan: ReturnType<typeof buildLevelUpPlan>) {
  return plan?.steps.find((step) => step.kind === "feature_choice" && step.id === FORMULAS_KEY)
}

describe("buildLevelUpPlan — Alchemist formulas and discoveries", () => {
  it("asks for three Bomb Formulas when the feature unlocks at level 2", () => {
    const step = formulaStep(
      buildLevelUpPlan({
        entry: alchemistAt(1),
        subclasses: [],
        currentTotalLevel: 1,
        featureChoicePicks: {},
      }),
    )
    expect(step).toMatchObject({ required: 3, mode: "add", optional: false })
  })

  it("re-opens the formula picker at level 4 when the class table grants a fourth", () => {
    const step = formulaStep(
      buildLevelUpPlan({
        entry: alchemistAt(3),
        subclasses: [],
        currentTotalLevel: 3,
        featureChoicePicks: { [FORMULAS_KEY]: ["Acid Bomb", "Frost Bomb", "Shrapnel Bomb"] },
      }),
    )
    expect(step).toMatchObject({ required: 4, mode: "add" })
  })

  it("offers an optional swap on a level that grants no new formula", () => {
    const step = formulaStep(
      buildLevelUpPlan({
        entry: alchemistAt(2),
        subclasses: [],
        currentTotalLevel: 2,
        featureChoicePicks: { [FORMULAS_KEY]: ["Acid Bomb", "Frost Bomb", "Shrapnel Bomb"] },
      }),
    )
    expect(step).toMatchObject({ required: 3, mode: "swap", optional: true })
  })

  it("re-opens Discoveries at level 9 when the class table grants a second", () => {
    const plan = buildLevelUpPlan({
      entry: alchemistAt(8),
      subclasses: [],
      currentTotalLevel: 8,
      featureChoicePicks: {
        [FORMULAS_KEY]: ["Acid Bomb", "Frost Bomb", "Shrapnel Bomb"],
        [DISCOVERY_KEY]: ["Alchemy of Poison"],
      },
    })
    const discovery = plan?.steps.find(
      (step) => step.kind === "feature_choice" && step.id === DISCOVERY_KEY,
    )
    expect(discovery).toMatchObject({ required: 2, mode: "add" })
  })

  it("offers a Discovery swap once one is chosen, without demanding a second", () => {
    const plan = buildLevelUpPlan({
      entry: alchemistAt(5),
      subclasses: [],
      currentTotalLevel: 5,
      featureChoicePicks: {
        [FORMULAS_KEY]: ["Acid Bomb", "Frost Bomb", "Shrapnel Bomb"],
        [DISCOVERY_KEY]: ["Alchemy of Poison"],
      },
    })
    const discovery = plan?.steps.find(
      (step) => step.kind === "feature_choice" && step.id === DISCOVERY_KEY,
    )
    expect(discovery).toMatchObject({ required: 1, mode: "swap", optional: true })
  })

  it("puts required picks before optional swaps", () => {
    const plan = buildLevelUpPlan({
      entry: alchemistAt(3),
      subclasses: [],
      currentTotalLevel: 3,
      featureChoicePicks: {},
    })
    const modes = plan!.steps
      .filter((step) => step.kind === "feature_choice")
      .map((step) => (step as { mode: string }).mode)
    expect(modes).toEqual([...modes].sort((a, b) => (a === "add" ? -1 : b === "add" ? 1 : 0)))
  })

  it("lists Potion Mixologist when leveling from 14 to 15 even if Features tab was omitted", () => {
    const plan = buildLevelUpPlan({
      entry: alchemistAt(14),
      subclasses: [],
      currentTotalLevel: 14,
      featureChoicePicks: {},
    })
    expect(plan?.newFeatures.some((feature) => feature.name === "Potion Mixologist")).toBe(true)
  })
})

const INVESTIGATOR_EXPERTISE =
  "<p>You gain Expertise in two of your skill proficiencies of your choice. Arcana and Investigation are recommended if you have proficiency in them.</p><p>At Investigator level 9, you gain Expertise in two more of your skill proficiencies of your choice.</p>"

function investigatorRitualistFeature(): Feature {
  return {
    level: 1,
    name: "Ritualist",
    description: "Grimoire rituals.",
    linkedModifiers: [
      {
        instanceId: "modinst_ritualist",
        catalogRefId: "cat_char_spells_known",
        characteristics: [
          {
            id: "spells_known_grimoire",
            type: "spells_known",
            spells: [],
            choiceGrants: [
              { level: 1, count: 4 },
              { level: 1, count: 2, unlocksAtClassLevel: 2, upToLevel: true },
              { level: 2, count: 2, unlocksAtClassLevel: 3, upToLevel: true },
            ],
            spellListClassOptions: ["Investigator"],
            label: "Investigator spell list",
          },
        ],
      },
    ],
  } as Feature
}

function investigatorAt(level: number): CharacterClassDetail {
  const expertise = enrichClassFeatureWithModifierPresets("Investigator", {
    level: 2,
    name: "Expertise",
    description: INVESTIGATOR_EXPERTISE,
  } as Feature)
  return {
    row: { class_id: "investigator", level, subclass_id: null, order: 0 },
    class: {
      id: "investigator",
      name: "Investigator",
      features: [investigatorRitualistFeature(), expertise],
    } as DndClass,
    subclass: null,
  } as CharacterClassDetail
}

describe("buildLevelUpPlan — spell-grant choices", () => {
  it("includes spell list, spell, and casting ability choices from a new feature", () => {
    const entry = {
      row: { class_id: "mage", level: 0, subclass_id: null, order: 0 },
      class: {
        id: "mage",
        name: "Mage",
        features: [
          feature("Initiate Magic", 1, {
            linkedModifiers: FEAT_MODIFIER_PRESETS["Magic Initiate"].linkedModifiers,
          }),
        ],
      } as DndClass,
      subclass: null,
    } as CharacterClassDetail

    const plan = buildLevelUpPlan({
      entry,
      subclasses: [],
      currentTotalLevel: 0,
      featureChoicePicks: {},
    })
    const kinds = plan?.steps
      .filter((step) => step.kind === "modifier_choice")
      .map((step) => step.slot.kind)

    expect(kinds).toEqual([
      "spell_list_class",
      "spell",
      "spell",
      "spellcasting_ability",
    ])
  })
})

describe("buildLevelUpPlan — Investigator Expertise", () => {
  it("asks for two Expertise skill picks when the feature unlocks at level 2", () => {
    const plan = buildLevelUpPlan({
      entry: investigatorAt(1),
      subclasses: [],
      currentTotalLevel: 1,
      featureChoicePicks: {},
    })
    const step = plan?.steps.find(
      (entry) => entry.kind === "modifier_choice" && entry.slot.grantsExpertise,
    )
    expect(step).toMatchObject({
      kind: "modifier_choice",
      title: "Expertise",
      required: 2,
    })
    if (step?.kind === "modifier_choice") {
      expect(step.slot.grantsExpertise).toBe(true)
    }
  })

  it("asks for two more Expertise picks at level 9", () => {
    const atTwo = buildLevelUpPlan({
      entry: investigatorAt(1),
      subclasses: [],
      currentTotalLevel: 1,
      featureChoicePicks: {},
    })
    const slotKey = atTwo?.steps.find(
      (entry) => entry.kind === "modifier_choice" && entry.slot.grantsExpertise,
    )?.id
    expect(slotKey).toBeTruthy()

    const plan = buildLevelUpPlan({
      entry: investigatorAt(8),
      subclasses: [],
      currentTotalLevel: 8,
      featureChoicePicks: {},
      modifierPlayerPicks: { [slotKey!]: ["Arcana", "Investigation"] },
    })
    const step = plan?.steps.find(
      (entry) => entry.kind === "modifier_choice" && entry.slot.grantsExpertise,
    )
    expect(step).toMatchObject({ kind: "modifier_choice", required: 4 })
  })

  it("does not open a second empty Expertise picker for the level 9 table reminder", () => {
    const reminder = enrichClassFeatureWithModifierPresets("Investigator", {
      level: 9,
      name: "Expertise",
      description: "",
    } as Feature)
    const entry = investigatorAt(8)
    const withReminder = {
      ...entry,
      class: {
        ...entry.class,
        features: [...((entry.class?.features as Feature[] | undefined) ?? []), reminder],
      },
    } as CharacterClassDetail

    const atTwo = buildLevelUpPlan({
      entry: investigatorAt(1),
      subclasses: [],
      currentTotalLevel: 1,
      featureChoicePicks: {},
    })
    const slotKey = atTwo?.steps.find(
      (step) => step.kind === "modifier_choice" && step.slot.grantsExpertise,
    )?.id

    const plan = buildLevelUpPlan({
      entry: withReminder,
      subclasses: [],
      currentTotalLevel: 8,
      featureChoicePicks: {},
      modifierPlayerPicks: { [slotKey!]: ["Arcana", "Investigation"] },
    })
    const expertiseSteps = plan?.steps.filter(
      (step) => step.kind === "modifier_choice" && step.slot.grantsExpertise,
    )
    expect(expertiseSteps).toHaveLength(1)
    expect(expertiseSteps?.[0]).toMatchObject({ required: 4 })
  })
})

describe("buildLevelUpPlan — Investigator Ritualist grimoire", () => {
  it("offers grimoire grants through modifier spell pickers", () => {
    const plan = buildLevelUpPlan({
      entry: investigatorAt(1),
      subclasses: [],
      currentTotalLevel: 1,
      featureChoicePicks: {},
    })
    const spells = plan?.steps.flatMap((entry) =>
      entry.kind === "modifier_choice" && entry.slot.kind === "spell" ? [entry] : [],
    )
    expect(spells?.map((entry) => entry.required)).toEqual([4, 2])
    expect(plan?.steps.some((entry) => entry.kind === "spells")).toBe(false)
  })

  it("uses the grant's spell-level cap when leveling into 3rd", () => {
    const plan = buildLevelUpPlan({
      entry: investigatorAt(2),
      subclasses: [],
      currentTotalLevel: 2,
      featureChoicePicks: {},
    })
    const spells = plan?.steps.flatMap((entry) =>
      entry.kind === "modifier_choice" && entry.slot.kind === "spell" ? [entry] : [],
    )
    expect(spells?.map((entry) => entry.slot.spellLevel)).toEqual([1, 1, 2])
  })
})

describe("assignLevelUpSpellsToNewModifierSlots", () => {
  it("writes level-up spell ids onto the newly unlocked grimoire slot", () => {
    const entry = investigatorAt(1)
    const assigned = assignLevelUpSpellsToNewModifierSlots({
      fromLevel: 1,
      toLevel: 2,
      classId: "investigator",
      cls: entry.class,
      subclasses: [],
      subclassId: null,
      featureChoicePicks: {},
      modifierCatalog: [],
      spellIds: ["alarm", "detect-magic"],
    })
    expect(Object.values(assigned)).toEqual([["alarm", "detect-magic"]])
  })
})

describe("countReplacedPicks", () => {
  const original = ["Acid Bomb", "Frost Bomb", "Shrapnel Bomb"]

  it("allows keeping every pick", () => {
    expect(countReplacedPicks(original, original)).toBe(0)
  })

  it("allows replacing exactly one pick", () => {
    expect(countReplacedPicks(original, ["Acid Bomb", "Frost Bomb", "Sleep Bomb"])).toBe(1)
  })

  it("rejects replacing two picks or dropping below the known count", () => {
    expect(countReplacedPicks(original, ["Acid Bomb", "Sleep Bomb", "Glue Bomb"])).toBeNull()
    expect(countReplacedPicks(original, ["Acid Bomb", "Frost Bomb"])).toBeNull()
  })
})

describe("spellsEligibleForLevelUp", () => {
  it("keeps Necromancer allowlist spells and drops duplicate apostrophe variants", () => {
    const pool = [
      { id: "alarm", name: "Alarm", level: 1, classes: ["Inventor"] },
      { id: "gahoul-ascii", name: "Gahoul's Shrieking Skull", level: 1, classes: ["Necromancer"] },
      { id: "gahoul-curly", name: "Gahoul’s Shrieking Skull", level: 1, classes: ["Necromancer"] },
      { id: "fireball", name: "Fireball", level: 3, classes: ["Wizard"] },
      { id: "exhume", name: "Exhume", level: 1, classes: ["Necromancer"] },
    ] as Spell[]

    const eligible = spellsEligibleForLevelUp(pool, "Necromancer", 1, ["exhume"])
    expect(eligible.map((spell) => spell.name).sort()).toEqual([
      "Alarm",
      "Gahoul's Shrieking Skull",
    ])
  })

  it("hides a second catalog copy when one apostrophe variant is already known", () => {
    const pool = [
      { id: "gahoul-ascii", name: "Gahoul's Shrieking Skull", level: 1, classes: ["Necromancer"] },
      { id: "gahoul-curly", name: "Gahoul’s Shrieking Skull", level: 1, classes: ["Necromancer"] },
    ] as Spell[]

    expect(spellsEligibleForLevelUp(pool, "Necromancer", 1, ["gahoul-ascii"])).toEqual([])
  })
})

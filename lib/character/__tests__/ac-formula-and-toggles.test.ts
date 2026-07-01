import { describe, expect, it } from "vitest"
import {
  aggregateCharacteristics,
  resolveAggregatedAcFormula,
  type AbilityScoreKey,
} from "@/lib/compendium/characteristic-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { computeDerivedCharacter } from "@/lib/character/compute-derived"
import type { CharacterBuildInputs } from "@/lib/character/types"
import type { DndClass, Equipment } from "@/lib/types"

function acFormula(chars: import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier[]): LinkedModifierInstance[] {
  return [
    {
      instanceId: `inst_${chars[0]?.id ?? "ac"}`,
      catalogRefId: "cat_test",
      characteristics: chars,
    },
  ]
}

describe("AC formula selection", () => {
  it("picks the player-selected formula among competing base AC options", () => {
    const aggregated = aggregateCharacteristics([
      {
        id: "monk_ud",
        type: "ac",
        mode: "ability_modifiers",
        base: 10,
        abilities: ["DEX", "WIS"],
        label: "Monk Unarmored Defense",
      },
      {
        id: "barb_ud",
        type: "ac",
        mode: "ability_modifiers",
        base: 10,
        abilities: ["DEX", "CON"],
        label: "Barbarian Unarmored Defense",
      },
    ])

    const abilityMods = {
      strength: 0,
      dexterity: 2,
      constitution: 3,
      intelligence: 0,
      wisdom: 1,
      charisma: 0,
    } satisfies Record<AbilityScoreKey, number>

    resolveAggregatedAcFormula(aggregated, {
      selectedFormulaId: "monk_ud",
      abilityMods,
      proficiencyBonus: 2,
    })

    expect(aggregated.acAbilityMods).toEqual(["DEX", "WIS"])
    expect(aggregated.acFormulaOptions).toHaveLength(2)
  })

  it("defaults to the highest computed AC when no pick is saved", () => {
    const monkBarbClasses: DndClass[] = [
      {
        id: "monk",
        name: "Monk",
        hit_die: "d8",
        saving_throws: ["Strength", "Dexterity"],
        skill_choices: { category: "Skills", count: 2, options: [] },
        features: [
          {
            id: "f1",
            name: "Unarmored Defense",
            level: 1,
            description:
              "While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 + your Dexterity modifier + your Wisdom modifier.",
            linkedModifiers: acFormula([
              {
                id: "monk_ud",
                type: "ac",
                mode: "ability_modifiers",
                base: 10,
                abilities: ["DEX", "WIS"],
              },
            ]),
          },
        ],
        source: "SRD",
        creator_url: null,
        created_at: "",
        icon: null,
      },
      {
        id: "barbarian",
        name: "Barbarian",
        hit_die: "d12",
        saving_throws: ["Strength", "Constitution"],
        skill_choices: { category: "Skills", count: 2, options: [] },
        features: [
          {
            id: "f2",
            name: "Unarmored Defense",
            level: 1,
            description:
              "While you aren't wearing armor, your base Armor Class equals 10 + your Dexterity modifier + your Constitution modifier.",
            linkedModifiers: acFormula([
              {
                id: "barb_ud",
                type: "ac",
                mode: "ability_modifiers",
                base: 10,
                abilities: ["DEX", "CON"],
              },
            ]),
          },
        ],
        source: "SRD",
        creator_url: null,
        created_at: "",
        icon: null,
      },
    ]

    const inputs: CharacterBuildInputs = {
      baseAbilityScores: {
        strength: 10,
        dexterity: 14,
        constitution: 16,
        intelligence: 10,
        wisdom: 12,
        charisma: 10,
      },
      asiAllocations: {},
      background: null,
      species: null,
      classLevels: [
        { classId: "monk", level: 1 },
        { classId: "barbarian", level: 1 },
      ],
      classes: monkBarbClasses,
      subclasses: [],
      subclassByClassId: {},
      primaryClassId: "monk",
      classSkillPicks: {},
      classToolPicks: {},
      featureChoicePicks: {},
      speciesTraitPicks: {},
      featChoicePicks: {},
      modifierPlayerPicks: {},
      selectedFeatIds: [],
      grantedFeatIds: [],
      featSelectionEntries: [],
      extraSkillProficiencies: [],
      extraToolProficiencies: [],
      extraWeaponProficiencies: [],
      extraArmorProficiencies: [],
      languages: [],
      equipment: [] as Equipment[],
      equippedArmorId: null,
      equippedShieldId: null,
      equippedWeaponId: null,
      modifierCatalog: [],
      feats: [],
    }

    const derived = computeDerivedCharacter(inputs)
    expect(derived.armorClass).toBe(15)
    expect(derived.acFormulaOptions.length).toBeGreaterThanOrEqual(2)
  })
})

describe("conditional sheet toggles", () => {
  it("omits while-raging AC bonus when the Rage toggle is off", () => {
    const rageAcBonus = {
      id: "rage_ac",
      type: "ac" as const,
      mode: "flat_bonus" as const,
      flatBonus: 2,
      requiresSheetToggle: "while_raging" as const,
    }

    const aggregatedOff = aggregateCharacteristics([rageAcBonus], {
      activeSheetToggles: new Set(),
    })
    const aggregatedOn = aggregateCharacteristics([rageAcBonus], {
      activeSheetToggles: new Set(["while_raging"]),
    })

    expect(aggregatedOff.acFlatBonus).toBe(0)
    expect(aggregatedOn.acFlatBonus).toBe(2)
  })
})

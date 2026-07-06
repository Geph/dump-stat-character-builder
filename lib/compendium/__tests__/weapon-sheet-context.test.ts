import { describe, expect, it } from "vitest"
import { buildWeaponMasteryModifier } from "@/lib/compendium/shared-feature-modifier-builders"
import { featureChoiceKey } from "@/lib/builder/choices"
import { describeWeaponProperty, describeWeaponRange } from "@/lib/compendium/weapon-property-reference"
import { buildWeaponSheetContext } from "@/lib/compendium/weapon-sheet-context"
import type { CharacterBuildInputs } from "@/lib/character/types"
import type { Equipment } from "@/lib/types"

describe("weapon property reference", () => {
  it("describes reach and range text", () => {
    expect(describeWeaponProperty("Reach")).toMatch(/5 feet/)
    expect(describeWeaponRange("Melee reach")).toMatch(/5 feet/)
  })
})

describe("buildWeaponSheetContext", () => {
  const mace = {
    id: "mace",
    name: "Mace",
    category: "Weapon",
    subcategory: "Simple Melee Weapons",
    damage: "1d6",
    damage_type: "Bludgeoning",
    mastery: "Sap",
    properties: null,
  } as unknown as Equipment

  const fighterWeaponMasteryKey = featureChoiceKey("fighter", "Weapon Mastery", 1)

  const baseInputs = {
    modifierCatalog: [],
    speciesTraitPicks: {},
    featChoicePicks: {},
    modifierPlayerPicks: {},
    featureChoicePicks: { [fighterWeaponMasteryKey]: ["Mace"] },
    classLevels: [{ classId: "fighter", level: 5 }],
    classes: [
      {
        id: "fighter",
        name: "Fighter",
        hit_die: 10,
        features: [
          {
            level: 1,
            name: "Weapon Mastery",
            description: "Use mastery properties.",
            linkedModifiers: [buildWeaponMasteryModifier()],
          },
        ],
      },
    ],
    subclasses: [],
    subclassByClassId: {},
    feats: [],
    selectedFeatIds: [],
    grantedFeatIds: [],
    featSelectionEntries: [],
    customAbilities: [],
    baseAbilityScores: {
      strength: 16,
      dexterity: 10,
      constitution: 14,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    asiAllocations: {},
    background: null,
    species: null,
    classSkillPicks: {},
    classToolPicks: {},
    extraSkillProficiencies: [],
    extraToolProficiencies: [],
    extraWeaponProficiencies: ["Simple weapons", "Martial weapons"],
    extraArmorProficiencies: [],
    languages: ["Common"],
    equipment: [mace],
    equippedWeaponId: "mace",
    equippedArmorId: null,
    equippedShieldId: null,
    primaryClassId: "fighter",
    classAddOrder: ["fighter"],
  } as unknown as CharacterBuildInputs

  it("marks mastery active when weapon mastery picks include the weapon", () => {
    const context = buildWeaponSheetContext(mace, {
      ...baseInputs,
      featureChoicePicks: { [fighterWeaponMasteryKey]: ["Mace"] },
    }, ["Simple weapons"])

    expect(context.masteryName).toBe("Sap")
    expect(context.masteryActive).toBe(true)
  })

  it("collects attack modifiers that apply to the weapon", () => {
    const context = buildWeaponSheetContext(
      mace,
      {
        ...baseInputs,
        modifierCatalog: [
          {
            id: "cat_char_attack_roll_modifiers",
            name: "Attack Roll and Crit Modifiers",
            group: "Attack & damage",
            characteristics: [
              {
                id: "mod_archery",
                type: "attack_roll_modifiers",
                label: "Archery",
                entries: [{ bonus: 2, target: "ranged" }],
              },
            ],
          },
        ],
        feats: [
          {
            id: "archery",
            name: "Archery",
            modifierRefs: ["cat_char_attack_roll_modifiers"],
          } as never,
        ],
        selectedFeatIds: ["archery"],
      },
      ["Simple weapons"],
    )

    expect(context.appliedModifiers.some((entry) => entry.name === "Archery")).toBe(false)

    const longbow = {
      ...mace,
      id: "longbow",
      name: "Longbow",
      subcategory: "Martial Ranged Weapons",
    } as unknown as Equipment

    const rangedContext = buildWeaponSheetContext(
      longbow,
      {
        ...baseInputs,
        modifierCatalog: [
          {
            id: "cat_char_attack_roll_modifiers",
            name: "Attack Roll and Crit Modifiers",
            group: "Attack & damage",
            characteristics: [
              {
                id: "mod_archery",
                type: "attack_roll_modifiers",
                label: "Archery",
                entries: [{ bonus: 2, target: "ranged" }],
              },
            ],
          },
        ],
        feats: [
          {
            id: "archery",
            name: "Archery",
            modifierRefs: ["cat_char_attack_roll_modifiers"],
          } as never,
        ],
        selectedFeatIds: ["archery"],
      },
      ["Martial weapons"],
    )

    expect(rangedContext.appliedModifiers.some((entry) => entry.name === "Archery")).toBe(true)
  })
})

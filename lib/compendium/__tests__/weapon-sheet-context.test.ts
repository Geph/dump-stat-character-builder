import { describe, expect, it } from "vitest"
import { buildWeaponMasteryModifier } from "@/lib/compendium/shared-feature-modifier-builders"
import { featureChoiceKey } from "@/lib/builder/choices"
import { SUBCLASS_GATED_CLASS_RESOURCES } from "@/lib/compendium/subclass-gated-class-resources"
import { describeWeaponProperty, describeWeaponRange } from "@/lib/compendium/weapon-property-reference"
import { buildWeaponSheetContext } from "@/lib/compendium/weapon-sheet-context"
import type { CharacterBuildInputs } from "@/lib/character/types"
import type { Equipment } from "@/lib/types"

describe("weapon property reference", () => {
  it("describes reach and range text", () => {
    expect(describeWeaponProperty("Reach")).toMatch(/5 feet/)
    expect(describeWeaponRange("Melee reach")).toMatch(/5 feet/)
  })

  it("describes Firearm, Recoil, and parenthetical Reload / Ammunition tags", () => {
    expect(describeWeaponProperty("Firearm")).toMatch(/ability modifier/)
    expect(describeWeaponProperty("Recoil")).toMatch(/normal range/)
    expect(describeWeaponProperty("Reload (6)")).toMatch(/reload/i)
    expect(describeWeaponProperty("Ammunition (Range 30/120; Bullet)")).toMatch(/ammunition/i)
    expect(describeWeaponProperty("Mounted")).toMatch(/Bonus Action/)
    expect(describeWeaponProperty("Destructible")).toMatch(/destroyed/)
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

    expect(rangedContext.appliedModifiers).toContainEqual(
      expect.objectContaining({
        name: "Archery",
        sourceLabel: "Archery",
      }),
    )
  })

  it("resolves a class-resource damage rider to the current die size (Superiority Dice)", () => {
    const superiorityDice = SUBCLASS_GATED_CLASS_RESOURCES.find(
      (entry) => entry.resource.id === "superiority_dice",
    )!.resource

    const context = buildWeaponSheetContext(
      mace,
      {
        ...baseInputs,
        classLevels: [{ classId: "fighter", level: 10 }],
        classes: [{ ...baseInputs.classes[0], class_resources: [superiorityDice] }],
        modifierCatalog: [
          {
            id: "cat_char_bonus_damage_riders",
            name: "Bonus Damage Riders",
            group: "Attack & damage",
            characteristics: [
              {
                id: "mod_precision_attack",
                type: "bonus_damage_riders",
                label: "Precision Attack",
                riders: [],
                appliesTo: "all",
                automaticBonus: {
                  mode: "die",
                  dieScaling: "class_resource",
                  classResourceKey: "superiority_dice",
                },
              },
            ],
          },
        ],
        feats: [
          {
            id: "precision_attack",
            name: "Precision Attack",
            modifierRefs: ["cat_char_bonus_damage_riders"],
          } as never,
        ],
        selectedFeatIds: ["precision_attack"],
      },
      ["Simple weapons"],
    )

    const rider = context.appliedModifiers.find((entry) => entry.name === "Precision Attack")
    expect(rider?.description).toBe("1d10 (superiority_dice die)")
  })

  it("applies unarmed-only reach to Unarmed Strike and not to a mace", () => {
    const unarmed = {
      id: "unarmed-strike",
      name: "Unarmed Strike",
      category: "Weapon",
      subcategory: "Simple Melee Weapons",
      damage: "1",
      damage_type: "Bludgeoning",
      properties: [],
    } as unknown as Equipment

    const inputs = {
      ...baseInputs,
      modifierCatalog: [
        {
          id: "cat_char_weapon_reach_modifier",
          name: "Weapon Reach",
          group: "Attack & damage",
          characteristics: [
            {
              id: "mod_elemental_reach",
              type: "weapon_reach_modifier" as const,
              label: "Elemental Attunement",
              reachBonusFeet: 10,
              weaponPropertyFilter: [],
              appliesToUnarmedStrike: true,
            },
          ],
        },
      ],
      feats: [
        {
          id: "elemental_attunement",
          name: "Elemental Attunement",
          modifierRefs: ["cat_char_weapon_reach_modifier"],
        } as never,
      ],
      selectedFeatIds: ["elemental_attunement"],
    } as CharacterBuildInputs

    const unarmedContext = buildWeaponSheetContext(unarmed, inputs, ["Simple weapons"])
    expect(unarmedContext.appliedModifiers.some((entry) => entry.name === "Elemental Attunement")).toBe(
      true,
    )

    const maceContext = buildWeaponSheetContext(mace, inputs, ["Simple weapons"])
    expect(maceContext.appliedModifiers.some((entry) => entry.name === "Elemental Attunement")).toBe(
      false,
    )
  })

  it("surfaces Crusher on-hit notes on Unarmed Strike and other bludgeoning weapons", () => {
    const unarmed = {
      id: "unarmed-strike",
      name: "Unarmed Strike",
      category: "Weapon",
      subcategory: "Simple Melee Weapons",
      damage: "1",
      damage_type: "Bludgeoning",
      properties: [],
    } as unknown as Equipment

    const dagger = {
      id: "dagger",
      name: "Dagger",
      category: "Weapon",
      subcategory: "Simple Melee Weapons",
      damage: "1d4",
      damage_type: "Piercing",
      properties: ["Finesse"],
    } as unknown as Equipment

    const inputs = {
      ...baseInputs,
      modifierCatalog: [
        {
          id: "cat_char_on_hit_trigger",
          name: "On-hit trigger",
          group: "Attack & damage",
          characteristics: [
            {
              id: "mod_crusher_push",
              type: "on_hit_trigger" as const,
              label: "Push 5 ft. on bludgeoning hit (once/turn)",
              appliesTo: "bludgeoning",
            },
          ],
        },
      ],
      feats: [
        {
          id: "crusher",
          name: "Crusher",
          modifierRefs: ["cat_char_on_hit_trigger"],
        } as never,
      ],
      selectedFeatIds: ["crusher"],
    } as CharacterBuildInputs

    const unarmedContext = buildWeaponSheetContext(unarmed, inputs, ["Simple weapons"])
    expect(
      unarmedContext.appliedModifiers.some((entry) =>
        /Push 5 ft\. on bludgeoning hit/i.test(entry.name),
      ),
    ).toBe(true)

    const maceContext = buildWeaponSheetContext(mace, inputs, ["Simple weapons"])
    expect(
      maceContext.appliedModifiers.some((entry) =>
        /Push 5 ft\. on bludgeoning hit/i.test(entry.name),
      ),
    ).toBe(true)

    const daggerContext = buildWeaponSheetContext(dagger, inputs, ["Simple weapons"])
    expect(
      daggerContext.appliedModifiers.some((entry) =>
        /Push 5 ft\. on bludgeoning hit|On hit/i.test(entry.name),
      ),
    ).toBe(false)
  })

  it("dedupes duplicate Critical Shot attack modifiers from the same source", () => {
    const revolver = {
      ...mace,
      id: "revolver",
      name: "Revolver",
      subcategory: "Martial Ranged Weapons",
    } as unknown as Equipment

    const critMod = {
      id: "mod_crit",
      type: "attack_roll_modifiers" as const,
      entries: [
        {
          bonus: 0,
          target: "ranged",
          criticalHitMinimum: 19,
          criticalHitMinimumByLevel: [
            { level: 9, mode: "fixed" as const, fixed: 18 },
            { level: 17, mode: "fixed" as const, fixed: 17 },
          ],
        },
      ],
    }

    const context = buildWeaponSheetContext(
      revolver,
      {
        ...baseInputs,
        classLevels: [{ classId: "gunslinger", level: 8 }],
        classes: [
          {
            id: "gunslinger",
            name: "Gunslinger",
            hit_die: 8,
            features: [
              {
                level: 2,
                name: "Critical Shot",
                description: "Crit on 19–20.",
                linkedModifiers: [
                  {
                    instanceId: "ai",
                    catalogRefId: "cat_char_attack_roll_modifiers",
                    characteristics: [{ ...critMod, id: "mod_ai" }],
                  },
                  {
                    instanceId: "detector",
                    catalogRefId: "cat_char_attack_roll_modifiers",
                    characteristics: [
                      {
                        ...critMod,
                        id: "mod_detector",
                        label: "Ranged weapon critical hit range",
                        entries: [{ bonus: 0, target: "ranged", criticalHitMinimum: 19 }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        featureChoicePicks: {},
      } as CharacterBuildInputs,
      ["Martial weapons"],
    )

    const critLines = context.appliedModifiers.filter((entry) =>
      /critical hit on 19/i.test(entry.description),
    )
    expect(critLines).toHaveLength(1)
    expect(critLines[0]?.sourceLabel).toMatch(/Critical Shot/)
  })

  it("surfaces a save-or-attack resource menu as a ranged weapon badge", () => {
    const shortbow = {
      id: "shortbow",
      name: "Shortbow",
      category: "Weapon",
      subcategory: "Simple Ranged Weapons",
      damage: "1d6",
      damage_type: "Piercing",
      mastery: "Vex",
      properties: ["Ammunition", "Two-Handed"],
    } as unknown as Equipment

    const context = buildWeaponSheetContext(
      shortbow,
      {
        ...baseInputs,
        equipment: [shortbow],
        equippedWeaponId: "shortbow",
        featureChoicePicks: { "dancer:L2:Dance Styles": ["Spinning Shot"] },
        customAbilities: [
          {
            id: "spinning-shot",
            name: "Spinning Shot",
            ability_role: "upgrade",
            description: "Add Dance Die to a ranged weapon attack.",
            linked_modifiers: [
              {
                instanceId: "menu",
                catalogRefId: "cat_char_resource_ability_menu",
                characteristics: [
                  {
                    id: "mod_spinning_shot",
                    type: "resource_ability_menu",
                    resourceKey: "dance_die",
                    appliesOnRollKinds: ["attack"],
                    label: "Spinning Shot — Dance Die to ranged weapon attacks",
                    options: [
                      {
                        name: "Spinning Shot",
                        description: "Add Dance Die to a ranged weapon attack roll (while Dancing).",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as CharacterBuildInputs,
      ["Simple weapons"],
    )

    expect(context.appliedModifiers.some((row) => /spinning shot/i.test(row.name))).toBe(true)
  })

  it("keeps Finisher on-hit triggers off the weapon badge list", () => {
    const context = buildWeaponSheetContext(
      mace,
      {
        ...baseInputs,
        modifierCatalog: [
          {
            id: "cat_char_on_hit_trigger",
            name: "On-hit trigger",
            group: "Attack & damage",
            characteristics: [
              {
                id: "mod_finisher_trigger",
                type: "on_hit_trigger" as const,
                label: "Finisher (Bloodied target)",
                oncePerTurn: true,
                onlyIfTargetBelowHalfHp: true,
                appliesTo: "weapon",
              },
              {
                id: "mod_improved_finisher_trigger",
                type: "on_hit_trigger" as const,
                label: "Improved Finisher (any target)",
                oncePerTurn: true,
                appliesTo: "weapon",
              },
              {
                id: "mod_concentration_break",
                type: "on_hit_trigger" as const,
                label: "Concentration Break: target has Disadvantage on Concentration save when damaged",
                appliesTo: "all",
              },
            ],
          },
        ],
        feats: [
          {
            id: "investigator-finishers",
            name: "Finisher",
            modifierRefs: ["cat_char_on_hit_trigger"],
          } as never,
        ],
        selectedFeatIds: ["investigator-finishers"],
      },
      ["Simple weapons"],
    )

    expect(context.appliedModifiers.some((row) => /\bfinisher\b/i.test(row.name))).toBe(false)
    const concentration = context.appliedModifiers.find((row) => row.name === "Concentration Break")
    expect(concentration?.description).toMatch(/Disadvantage on Concentration save/i)
    expect(concentration?.description).toMatch(/On a hit/)
  })
})

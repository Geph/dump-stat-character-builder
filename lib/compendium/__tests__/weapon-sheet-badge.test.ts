import { describe, expect, it } from "vitest"
import { buildWeaponSheetContext } from "@/lib/compendium/weapon-sheet-context"
import type { CharacterBuildInputs } from "@/lib/character/types"
import type { Equipment } from "@/lib/types"

describe("weapon_sheet_badge", () => {
  const mace = {
    id: "mace",
    name: "Mace",
    category: "Weapon",
    subcategory: "Simple Melee Weapons",
    damage: "1d6",
    damage_type: "Bludgeoning",
    properties: null,
  } as unknown as Equipment

  const whip = {
    id: "whip",
    name: "Whip",
    category: "Weapon",
    subcategory: "Martial Melee Weapons",
    damage: "1d4",
    damage_type: "Slashing",
    properties: ["Finesse", "Reach"],
  } as unknown as Equipment

  const trident = {
    id: "trident",
    name: "Trident",
    category: "Weapon",
    subcategory: "Martial Melee Weapons",
    damage: "1d8",
    damage_type: "Piercing",
    properties: ["Thrown", "Versatile"],
  } as unknown as Equipment

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
    modifierCatalog: [
      {
        id: "cat_char_weapon_sheet_badge",
        name: "Weapon Sheet Badge",
        group: "Attack & damage",
        characteristics: [
          {
            id: "mod_dervish_badge",
            type: "weapon_sheet_badge",
            label: "Dervish Fighting",
            description: "Optional 2d4 instead of 1d4/1d6 or Unarmed Strike.",
            whenDamageDice: ["1d4", "1d6"],
            includeUnarmed: true,
          },
        ],
      },
    ],
    speciesTraitPicks: {},
    featChoicePicks: {},
    modifierPlayerPicks: {},
    featureChoicePicks: {},
    classLevels: [{ classId: "dancer", level: 1 }],
    classes: [{ id: "dancer", name: "Dancer", hit_die: 8, features: [] }],
    subclasses: [],
    subclassByClassId: {},
    feats: [
      {
        id: "dervish_fighting",
        name: "Dervish Fighting",
        modifierRefs: ["cat_char_weapon_sheet_badge"],
      },
    ],
    selectedFeatIds: ["dervish_fighting"],
    grantedFeatIds: [],
    featSelectionEntries: [],
    customAbilities: [],
    baseAbilityScores: {
      strength: 10,
      dexterity: 16,
      constitution: 14,
      intelligence: 10,
      wisdom: 10,
      charisma: 14,
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
    equipment: [mace, whip, trident],
    equippedWeaponId: "whip",
    equippedArmorId: null,
    equippedShieldId: null,
    primaryClassId: "dancer",
    classAddOrder: ["dancer"],
  } as unknown as CharacterBuildInputs

  it("applies Dervish Fighting to 1d4, 1d6, and Unarmed Strike, not 1d8", () => {
    expect(
      buildWeaponSheetContext(whip, inputs, ["Martial weapons"]).appliedModifiers.some(
        (entry) => entry.name === "Dervish Fighting",
      ),
    ).toBe(true)
    expect(
      buildWeaponSheetContext(mace, inputs, ["Simple weapons"]).appliedModifiers.some(
        (entry) => entry.name === "Dervish Fighting",
      ),
    ).toBe(true)
    expect(
      buildWeaponSheetContext(unarmed, inputs, ["Simple weapons"]).appliedModifiers.some(
        (entry) => entry.name === "Dervish Fighting",
      ),
    ).toBe(true)
    expect(
      buildWeaponSheetContext(trident, inputs, ["Martial weapons"]).appliedModifiers.some(
        (entry) => entry.name === "Dervish Fighting",
      ),
    ).toBe(false)
  })
})

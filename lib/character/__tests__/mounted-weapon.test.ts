import { describe, expect, it } from "vitest"
import { featureChoiceKey } from "@/lib/builder/choices"
import {
  canMountWeapon,
  isWeaponMounted,
  mountedWeaponToggleId,
} from "@/lib/character/mounted-weapon"
import { stepWeaponDamageDice as stepDice } from "@/lib/compendium/weapon-damage-roll"
import { computeDerivedCharacter } from "@/lib/character/compute-derived"
import type { CharacterBuildInputs } from "@/lib/character/types"
import type { Equipment } from "@/lib/types"

const revolver = {
  id: "revolver",
  name: "Revolver",
  category: "Weapon",
  subcategory: "Martial Ranged Weapons",
  properties: {
    damage: "2d6 Piercing",
    mastery: "Slow",
    properties: ["Ammunition (Range 30/120; Bullet)", "Firearm", "Recoil", "Reload (6)"],
  },
} as unknown as Equipment

function gunTankInputs(overrides: Partial<CharacterBuildInputs> = {}): CharacterBuildInputs {
  const masteryKey = featureChoiceKey("gunslinger", "Weapon Mastery", 1)
  return {
    baseAbilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 14,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    asiAllocations: {},
    background: null,
    species: null,
    classLevels: [{ classId: "gunslinger", level: 3 }],
    classes: [
      {
        id: "gunslinger",
        name: "Gunslinger",
        hit_die: 8,
        features: [
          {
            level: 1,
            name: "Weapon Mastery",
            description: "Use mastery properties.",
            isChoice: true,
            choices: { category: "Weapon", resourceKey: "weapon_mastery", count: 1 },
          },
          {
            level: 2,
            name: "Risk",
            description:
              "If a maneuver requires a saving throw, the DC equals 8 plus your Dexterity modifier and Proficiency Bonus.",
          },
        ],
      } as never,
    ],
    subclasses: [
      {
        id: "guntank",
        name: "Gun Tank",
        class_id: "gunslinger",
        features: [
          {
            level: 3,
            name: "Walking Turret",
            description:
              "While you are holding a Ranged weapon whose mastery property you can use, you can use the Mounted mastery property with that weapon.",
          },
          {
            level: 3,
            name: "Heavy Gunner",
            description:
              "Strong Attacks. You can use Strength, rather than Dexterity, for attack and damage rolls using Ranged weapons. You can also add your Strength, instead of Dexterity, to your Maneuver save DC.",
            linkedModifiers: [
              {
                instanceId: "hg-armor",
                catalogRefId: "cat_char_armor_proficiencies",
                characteristics: [
                  {
                    id: "armor",
                    type: "armor_proficiencies",
                    armor: ["Medium Armor", "Heavy Armor"],
                    label: "Heavy Gunner armor",
                  },
                ],
              },
              {
                instanceId: "hg-str",
                catalogRefId: "cat_char_weapon_ability_override",
                characteristics: [
                  {
                    id: "str",
                    type: "weapon_ability_override",
                    alternateAbility: "strength",
                    weaponAbilityAppliesTo: "both",
                    weaponAbilityScope: "ranged",
                    label: "Strong Attacks",
                  },
                ],
              },
            ],
          },
        ],
      } as never,
    ],
    subclassByClassId: { gunslinger: "guntank" },
    primaryClassId: "gunslinger",
    classSkillPicks: {},
    classToolPicks: {},
    featureChoicePicks: { [masteryKey]: ["Revolver"] },
    speciesTraitPicks: {},
    featChoicePicks: {},
    modifierPlayerPicks: {},
    selectedFeatIds: [],
    grantedFeatIds: [],
    featSelectionEntries: [],
    extraSkillProficiencies: [],
    extraToolProficiencies: [],
    extraWeaponProficiencies: ["Martial weapons"],
    extraArmorProficiencies: [],
    languages: [],
    equipment: [revolver],
    equippedArmorId: null,
    equippedShieldId: null,
    equippedWeaponId: revolver.id,
    modifierCatalog: [],
    feats: [],
    ...overrides,
  }
}

describe("mounted weapon", () => {
  it("steps damage dice up to d12", () => {
    expect(stepDice("2d6 Piercing")).toBe("2d8 Piercing")
    expect(stepDice("1d12")).toBe("1d12")
  })

  it("allows Walking Turret to mount a ranged weapon whose mastery is known", () => {
    const inputs = gunTankInputs()
    expect(canMountWeapon(revolver, inputs, ["Martial weapons"])).toBe(true)
    expect(isWeaponMounted(new Set([mountedWeaponToggleId(revolver.id)]), revolver.id)).toBe(true)
  })

  it("steps equipped firearm damage and halves speed while mounted", () => {
    const derived = computeDerivedCharacter(
      gunTankInputs({
        activeSheetToggles: new Set([mountedWeaponToggleId(revolver.id)]),
      }),
    )
    expect(derived.equippedWeaponAttack?.damageDisplay).toMatch(/2d8/)
    expect(derived.speed).toBe(15)
  })

  it("uses Strength for ranged attacks and Maneuver save DC after Heavy Gunner aliases normalize", () => {
    const derived = computeDerivedCharacter(gunTankInputs())
    expect(derived.armorProficiencies).toEqual(
      expect.arrayContaining(["Medium Armor", "Heavy Armor"]),
    )
    expect(derived.equippedWeaponAttack?.attackAbilityMod).toBe(3)
    const maneuver = derived.specialSaveDcs.find((entry) => /maneuver/i.test(entry.label))
    expect(maneuver?.ability).toBe("strength")
    expect(maneuver?.dc).toBe(13)
  })
})

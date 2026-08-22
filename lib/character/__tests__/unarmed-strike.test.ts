import { describe, expect, it } from "vitest"
import { computeDerivedCharacter } from "@/lib/character/compute-derived"
import {
  barbarianShieldFixture,
  baseInputs,
  fighterArcheryBackgroundFixture,
  fighterClass,
  linked,
  longbowEquipment,
  shieldEquipment,
} from "@/lib/character/__tests__/fixtures"
import {
  buildUnarmedStrikeEquipment,
  characterHasFreeHand,
} from "@/lib/character/unarmed-strike"
import type { DndClass, Equipment, Feat } from "@/lib/types"

const longsword = {
  id: "longsword",
  name: "Longsword",
  category: "Weapon",
  subcategory: "Martial Melee Weapons",
  damage: "1d8",
  damage_type: "Slashing",
  properties: ["Versatile"],
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as Equipment

const dagger = {
  id: "dagger",
  name: "Dagger",
  category: "Weapon",
  subcategory: "Simple Melee Weapons",
  damage: "1d4",
  damage_type: "Piercing",
  properties: ["Finesse", "Light", "Thrown"],
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as Equipment

const greataxe = {
  id: "greataxe",
  name: "Greataxe",
  category: "Weapon",
  subcategory: "Martial Melee Weapons",
  damage: "1d12",
  damage_type: "Slashing",
  properties: ["Heavy", "Two-Handed"],
  icon: null,
  source: "SRD",
  creator_url: null,
  created_at: "",
} as unknown as Equipment

function monkClass(): DndClass {
  return {
    id: "class_monk",
    name: "Monk",
    description: "",
    card_image_url: null,
    hit_die: 8,
    primary_ability: ["Dexterity", "Wisdom"],
    saving_throws: ["Strength", "Dexterity"],
    skill_choices: { count: 2, options: ["Acrobatics", "Athletics"] },
    weapon_proficiencies: ["Simple weapons"],
    armor_proficiencies: [],
    features: [
      {
        name: "Martial Arts",
        level: 1,
        description: "",
        linkedModifiers: linked([
          {
            id: "unarmed_ma",
            type: "unarmed_strike_damage",
            die: "1d6",
            dieByLevel: [
              { level: 1, mode: "dice", dieCount: 1, dieType: "d6" },
              { level: 5, mode: "dice", dieCount: 1, dieType: "d8" },
              { level: 11, mode: "dice", dieCount: 1, dieType: "d10" },
              { level: 17, mode: "dice", dieCount: 1, dieType: "d12" },
            ],
            ability: "dexterity",
            label: "Martial Arts die",
          },
        ]),
      },
    ],
    spellcasting: null,
    starting_equipment: [],
    icon: null,
    accent_color: null,
    source: "SRD",
    creator_url: null,
    created_at: "",
  } as unknown as DndClass
}

describe("characterHasFreeHand", () => {
  it("is true with empty hands or a shield alone", () => {
    expect(characterHasFreeHand({})).toBe(true)
    expect(characterHasFreeHand({ shield: shieldEquipment })).toBe(true)
  })

  it("is true with a one-handed weapon and a free off-hand", () => {
    expect(characterHasFreeHand({ mainWeapon: longsword })).toBe(true)
  })

  it("is false with a two-handed weapon", () => {
    expect(characterHasFreeHand({ mainWeapon: greataxe })).toBe(false)
    expect(characterHasFreeHand({ mainWeapon: longbowEquipment })).toBe(false)
  })

  it("is false with a weapon and shield or two weapons", () => {
    expect(characterHasFreeHand({ mainWeapon: longsword, shield: shieldEquipment })).toBe(false)
    expect(characterHasFreeHand({ mainWeapon: longsword, offHandWeapon: dagger })).toBe(false)
    expect(characterHasFreeHand({ offHandWeapon: dagger, shield: shieldEquipment })).toBe(false)
  })
})

describe("unarmed strike on the sheet", () => {
  it("uses 1 + Strength Bludgeoning when no class or feat upgrades it", () => {
    const derived = computeDerivedCharacter(
      baseInputs({
        baseAbilityScores: {
          strength: 16,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        classLevels: [{ classId: fighterClass.id, level: 1 }],
        classes: [fighterClass],
        primaryClassId: fighterClass.id,
      }),
    )

    expect(derived.unarmedStrikeWeapon?.name).toBe("Unarmed Strike")
    expect(derived.unarmedStrikeAttack?.damageDisplay).toMatch(/1 \+ 3 Bludgeoning/)
    expect(derived.unarmedStrikeAttack?.attackBonus).toBe(5)
  })

  it("stays available with a shield and no weapon", () => {
    const derived = computeDerivedCharacter(barbarianShieldFixture())
    expect(derived.unarmedStrikeAttack).not.toBeNull()
    expect(derived.unarmedStrikeAttack?.damageDisplay).toMatch(/1 \+ 3 Bludgeoning/)
  })

  it("is hidden while wielding a two-handed weapon", () => {
    const derived = computeDerivedCharacter(fighterArcheryBackgroundFixture())
    expect(derived.equippedWeaponAttack).not.toBeNull()
    expect(derived.unarmedStrikeAttack).toBeNull()
    expect(derived.unarmedStrikeWeapon).toBeNull()
  })

  it("is hidden with a weapon and shield", () => {
    const derived = computeDerivedCharacter(
      baseInputs({
        classLevels: [{ classId: fighterClass.id, level: 1 }],
        classes: [fighterClass],
        primaryClassId: fighterClass.id,
        equipment: [longsword, shieldEquipment],
        equippedWeaponId: longsword.id,
        equippedShieldId: shieldEquipment.id,
      }),
    )
    expect(derived.equippedWeaponAttack).not.toBeNull()
    expect(derived.unarmedStrikeAttack).toBeNull()
  })

  it("stays available next to a one-handed weapon", () => {
    const derived = computeDerivedCharacter(
      baseInputs({
        classLevels: [{ classId: fighterClass.id, level: 1 }],
        classes: [fighterClass],
        primaryClassId: fighterClass.id,
        equipment: [longsword],
        equippedWeaponId: longsword.id,
      }),
    )
    expect(derived.equippedWeaponAttack).not.toBeNull()
    expect(derived.unarmedStrikeAttack).not.toBeNull()
  })

  it("uses the Monk Martial Arts die ladder and Finesse", () => {
    const monk = monkClass()
    const atLevel = (level: number) =>
      computeDerivedCharacter(
        baseInputs({
          baseAbilityScores: {
            strength: 10,
            dexterity: 16,
            constitution: 14,
            intelligence: 10,
            wisdom: 14,
            charisma: 8,
          },
          classLevels: [{ classId: monk.id, level }],
          classes: [monk],
          primaryClassId: monk.id,
        }),
      )

    expect(atLevel(1).unarmedStrikeAttack?.damageDisplay).toMatch(/1d6 \+ 3 Bludgeoning/)
    expect(atLevel(5).unarmedStrikeAttack?.damageDisplay).toMatch(/1d8 \+ 3 Bludgeoning/)
    expect(atLevel(11).unarmedStrikeAttack?.damageDisplay).toMatch(/1d10 \+ 3 Bludgeoning/)
    expect(atLevel(17).unarmedStrikeAttack?.damageDisplay).toMatch(/1d12 \+ 3 Bludgeoning/)
    expect(atLevel(1).unarmedStrikeWeapon?.properties).toContain("Finesse")
    expect(atLevel(1).unarmedStrikeAttack?.attackBonus).toBe(5)
  })

  it("uses Strength when it is higher than Dexterity on a Martial Arts monk", () => {
    const monk = monkClass()
    const derived = computeDerivedCharacter(
      baseInputs({
        baseAbilityScores: {
          strength: 16,
          dexterity: 14,
          constitution: 14,
          intelligence: 10,
          wisdom: 14,
          charisma: 8,
        },
        classLevels: [{ classId: monk.id, level: 1 }],
        classes: [monk],
        primaryClassId: monk.id,
      }),
    )
    expect(derived.unarmedStrikeAttack?.damageDisplay).toMatch(/1d6 \+ 3 Bludgeoning/)
    expect(derived.unarmedStrikeAttack?.attackBreakdown.some((part) => /Strength/.test(part.label))).toBe(
      true,
    )
  })

  it("applies Tavern Brawler unarmed die and species CON bite", () => {
    const tavern = {
      id: "feat_tavern",
      name: "Tavern Brawler",
      linkedModifiers: linked([
        { id: "tb_unarmed", type: "unarmed_strike_damage", die: "1d4", label: "Enhanced Unarmed Strike" },
      ]),
    } as unknown as Feat

    const tavernDerived = computeDerivedCharacter(
      baseInputs({
        baseAbilityScores: {
          strength: 16,
          dexterity: 10,
          constitution: 14,
          intelligence: 10,
          wisdom: 10,
          charisma: 8,
        },
        classLevels: [{ classId: fighterClass.id, level: 1 }],
        classes: [fighterClass],
        primaryClassId: fighterClass.id,
        selectedFeatIds: [tavern.id],
        feats: [tavern],
      }),
    )
    expect(tavernDerived.unarmedStrikeAttack?.damageDisplay).toMatch(/1d4 \+ 3 Bludgeoning/)

    const biteDerived = computeDerivedCharacter(
      baseInputs({
        baseAbilityScores: {
          strength: 10,
          dexterity: 10,
          constitution: 16,
          intelligence: 10,
          wisdom: 10,
          charisma: 8,
        },
        classLevels: [{ classId: fighterClass.id, level: 1 }],
        classes: [fighterClass],
        primaryClassId: fighterClass.id,
        species: {
          id: "sp_dhampir",
          name: "Dhampir",
          traits: [
            {
              name: "Vampiric Bite",
              description: "",
              linkedModifiers: linked([
                {
                  id: "bite",
                  type: "unarmed_strike_damage",
                  die: "1d4",
                  damageType: "Piercing",
                  ability: "constitution",
                },
              ]),
            },
          ],
        } as never,
      }),
    )
    expect(biteDerived.unarmedStrikeAttack?.damageDisplay).toMatch(/1d4 \+ 3 Piercing/)
    expect(biteDerived.unarmedStrikeAttack?.attackBreakdown.some((part) => /Constitution/.test(part.label))).toBe(
      true,
    )
  })

  it("applies melee attack bonuses to Unarmed Strike", () => {
    const dueling = {
      id: "feat_dueling_all",
      name: "Melee Bonus",
      linkedModifiers: linked([
        {
          id: "melee_plus",
          type: "attack_roll_modifiers",
          entries: [{ bonus: 2, target: "melee" }],
        },
      ]),
    } as unknown as Feat

    const derived = computeDerivedCharacter(
      baseInputs({
        baseAbilityScores: {
          strength: 16,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        classLevels: [{ classId: fighterClass.id, level: 1 }],
        classes: [fighterClass],
        primaryClassId: fighterClass.id,
        selectedFeatIds: [dueling.id],
        feats: [dueling],
      }),
    )
    expect(derived.unarmedStrikeAttack?.attackBonus).toBe(7)
  })

  it("builds a synthetic Unarmed Strike with the default 1 bludgeoning die", () => {
    const weapon = buildUnarmedStrikeEquipment({
      die: null,
      damageType: null,
      ability: null,
      characterLevel: 1,
    })
    expect(weapon.id).toBe("unarmed-strike")
    expect(weapon.damage).toBe("1")
    expect(weapon.damage_type).toBe("Bludgeoning")
  })
})

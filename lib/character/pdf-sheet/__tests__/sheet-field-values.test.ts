import { describe, expect, it } from "vitest"

import type { DerivedCharacter } from "@/lib/character/types"
import {
  buildSheetFieldValues,
  type SheetPdfCharacterInput,
} from "@/lib/character/pdf-sheet/sheet-field-values"

function derivedFixture(overrides: Partial<DerivedCharacter> = {}): DerivedCharacter {
  return {
    abilityScores: {
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 8,
      wisdom: 12,
      charisma: 10,
    },
    abilityMods: {
      strength: 3,
      dexterity: 2,
      constitution: 2,
      intelligence: -1,
      wisdom: 1,
      charisma: 0,
    },
    proficiencyBonus: 3,
    totalLevel: 5,
    armorClass: 18,
    maxHp: 44,
    initiative: 2,
    speed: 30,
    passivePerception: 14,
    passiveInsight: 11,
    passiveInvestigation: 9,
    skills: [
      { name: "Athletics", ability: "strength", proficient: true, expertise: false, bonus: 6 },
      { name: "Perception", ability: "wisdom", proficient: true, expertise: true, bonus: 7 },
      { name: "Stealth", ability: "dexterity", proficient: false, expertise: false, bonus: 2 },
    ],
    saves: [
      { ability: "strength", proficient: true, bonus: 6 },
      { ability: "constitution", proficient: true, bonus: 5 },
      { ability: "dexterity", proficient: false, bonus: 2 },
    ],
    languages: ["Common", "Dwarvish"],
    toolProficiencies: ["Smith's Tools"],
    weaponProficiencies: ["Simple weapons", "Martial weapons"],
    armorProficiencies: ["Light armor", "Medium armor", "Heavy armor", "Shields"],
    spellcasting: [],
    ...overrides,
  } as unknown as DerivedCharacter
}

function inputFixture(overrides: Partial<SheetPdfCharacterInput> = {}): SheetPdfCharacterInput {
  return {
    name: "Thora Ironvein",
    level: 5,
    className: "Fighter",
    subclassName: "Champion",
    speciesName: "Dwarf",
    backgroundName: "Soldier",
    alignment: "Lawful Good",
    derived: derivedFixture(),
    hp: { current: 40, temp: 0, max: 44 },
    hitDice: { total: 5, used: 1, die: "d10" },
    weapons: [{ name: "Longsword", attackBonus: 6, damage: "1d8+3 slashing" }],
    spells: [],
    features: [{ name: "Second Wind", level: 1, text: "Regain hit points." }],
    equipmentLines: ["Longsword", "Rations x5"],
    featNames: ["Tough"],
    speciesTraitNames: ["Darkvision", "Dwarven Resilience"],
    ...overrides,
  }
}

describe("buildSheetFieldValues", () => {
  it("signs modifiers, bonuses, and initiative", () => {
    const values = buildSheetFieldValues(inputFixture())
    expect(values["ability.strength.mod"]).toBe("+3")
    expect(values["ability.intelligence.mod"]).toBe("-1")
    expect(values["save.strength.bonus"]).toBe("+6")
    expect(values["skill.athletics.bonus"]).toBe("+6")
    expect(values.initiative).toBe("+2")
    expect(values.proficiencyBonus).toBe("+3")
    expect(values["weapon.1.attack"]).toBe("+6")
  })

  it("leaves raw numbers unsigned", () => {
    const values = buildSheetFieldValues(inputFixture())
    expect(values.armorClass).toBe("18")
    expect(values.maxHp).toBe("44")
    expect(values["ability.strength.score"]).toBe("16")
    expect(values.passivePerception).toBe("14")
  })

  it("flags proficiency and expertise checkboxes", () => {
    const values = buildSheetFieldValues(inputFixture())
    expect(values["save.strength.proficient"]).toBe(true)
    expect(values["save.dexterity.proficient"]).toBe(false)
    expect(values["skill.perception.proficient"]).toBe(true)
    expect(values["skill.perception.expertise"]).toBe(true)
    expect(values["skill.stealth.proficient"]).toBe(false)
  })

  it("derives armor and weapon proficiency checkboxes from proficiency lists", () => {
    const values = buildSheetFieldValues(inputFixture())
    expect(values["prof.armor.light"]).toBe(true)
    expect(values["prof.armor.heavy"]).toBe(true)
    expect(values["prof.shields"]).toBe(true)
    expect(values["prof.weapons.martial"]).toBe(true)
  })

  it("omits armor proficiency checks the character does not have", () => {
    const values = buildSheetFieldValues(
      inputFixture({
        derived: derivedFixture({ armorProficiencies: ["Light armor"], weaponProficiencies: ["Simple weapons"] }),
      }),
    )
    expect(values["prof.armor.light"]).toBe(true)
    expect(values["prof.armor.heavy"]).toBe(false)
    expect(values["prof.weapons.martial"]).toBe(false)
  })

  it("skips empty values so template defaults are left alone", () => {
    const values = buildSheetFieldValues(inputFixture({ alignment: null, backgroundName: null }))
    expect(values).not.toHaveProperty("alignment")
    expect(values).not.toHaveProperty("backgroundName")
    expect(values).not.toHaveProperty("tempHp")
  })

  it("sorts spells by level then name and marks cantrips with C", () => {
    const values = buildSheetFieldValues(
      inputFixture({
        spells: [
          { name: "Shield", level: 1 },
          { name: "Fire Bolt", level: 0 },
          { name: "Burning Hands", level: 1 },
        ],
      }),
    )
    expect(values["spell.1.name"]).toBe("Fire Bolt")
    expect(values["spell.1.level"]).toBe("C")
    expect(values["spell.2.name"]).toBe("Burning Hands")
    expect(values["spell.3.name"]).toBe("Shield")
    expect(values.cantripsKnown).toBe("1")
    expect(values.spellsKnown).toBe("2")
  })

  it("writes spellcasting attack and DC from the primary casting entry", () => {
    const values = buildSheetFieldValues(
      inputFixture({
        derived: derivedFixture({
          spellcasting: [
            {
              classId: "wizard",
              className: "Wizard",
              ability: "intelligence",
              abilityLabel: "Intelligence",
              abilityMod: 4,
              saveDc: 15,
              attackBonus: 7,
              saveDcFeatureBonus: 0,
            },
          ],
        }),
      }),
    )
    expect(values.spellAttackBonus).toBe("+7")
    expect(values.spellSaveDc).toBe("15")
    expect(values.spellcastingAbility).toBe("Intelligence")
  })

  it("splits features across the two prose columns as well as the numbered block", () => {
    const values = buildSheetFieldValues(
      inputFixture({
        features: [
          { name: "Second Wind", level: 1 },
          { name: "Action Surge", level: 2 },
          { name: "Improved Critical", level: 3 },
          { name: "Extra Attack", level: 5 },
        ],
      }),
    )
    expect(values["feature.1.name"]).toBe("Second Wind")
    expect(values["feature.4.name"]).toBe("Extra Attack")
    expect(values["classFeatures.1"]).toBe("Second Wind (lv 1)\nAction Surge (lv 2)")
    expect(values["classFeatures.2"]).toBe("Improved Critical (lv 3)\nExtra Attack (lv 5)")
  })

  it("joins list fields and equipment lines", () => {
    const values = buildSheetFieldValues(inputFixture())
    expect(values.languages).toBe("Common, Dwarvish")
    expect(values.speciesTraits).toBe("Darkvision, Dwarven Resilience")
    expect(values.equipment).toBe("Longsword\nRations x5")
  })

  it("only writes currency the character actually carries", () => {
    const values = buildSheetFieldValues(inputFixture({ currency: { gp: 25, sp: 0 } }))
    expect(values["currency.gp"]).toBe("25")
    expect(values).not.toHaveProperty("currency.sp")
  })
})

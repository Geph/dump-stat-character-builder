import { describe, expect, it } from "vitest"

import {
  buildPdfFieldIndex,
  countMappableFields,
  normalizePdfFieldName,
  resolveSheetField,
} from "@/lib/character/pdf-sheet/field-aliases"

/** Field names taken from the class-specific sheet family (Front_/Back_ prefixes). */
const CLASS_SHEET_FIELDS = [
  "Front_Character Name",
  "Front_Background",
  "Front_Race",
  "Front_Alignment",
  "Front_Level",
  "Front_Proficiency",
  "Front_Archetype",
  "Front_Str Mod",
  "Front_Str Score",
  "Front_Str Save Throw",
  "Front_Save Str",
  "Front_Skill Athletics",
  "Front_Proficiency Athletics",
  "Front_Expertise Athletics",
  "Front_AC",
  "Front_Initiative",
  "Front_Speed",
  "Front_Max HP",
  "Front_Current HP",
  "Front_Temp HP",
  "Front_Total Hit Dice",
  "Front_Passive Perception",
  "Front_Languages",
  "Front_Tools",
  "Front_Racial Traits",
  "Front_Light Armour",
  "Front_Martial Weapons",
  "Front_Shields",
  "Front_Weapon Name 1",
  "Front_Weapon Atk Bonus 1",
  "Front_Weapon Damage 1",
  "Front_Spell Atk",
  "Front_Spell DC",
  "Front_Spell Name 3",
  "Front_Spell Level 3",
  "Front_Spell Prepared 3",
  "Back_GP",
  "Back_Personality Traits",
]

/** The well-named subset of the 2024 PHB fillable sheet. */
const PHB_2024_FIELDS = [
  "AC",
  "Max HP",
  "Current HP",
  "Temp HP",
  "Prof Bonus",
  "Level",
  "XP",
  "Speed",
  "Size Field",
  "Passive Perception",
  "Strength Mod",
  "Equipment Box",
  "Languages Field",
  "Alignment Box",
  "Species Traits",
  "Weapon Profs",
  "Tool Profs",
  "Feats",
  "Spell 3 Name",
  "Spell 3 Level",
  "Copper Coins",
  "Gold Coins",
  "Text Box 12",
]

describe("normalizePdfFieldName", () => {
  it("strips the sheet-side prefix and punctuation", () => {
    expect(normalizePdfFieldName("Front_Character Name")).toBe("character name")
    expect(normalizePdfFieldName("Back_Character Name")).toBe("character name")
    expect(normalizePdfFieldName("Attune_Ring1")).toBe("ring1")
    expect(normalizePdfFieldName("Spell's Level.3")).toBe("spell s level 3")
  })
})

describe("resolveSheetField on class sheets", () => {
  const index = buildPdfFieldIndex(CLASS_SHEET_FIELDS)
  const resolveOne = (key: string) => resolveSheetField(key, index)[0] ?? null

  it("maps identity and core stats", () => {
    expect(resolveOne("characterName")).toBe("Front_Character Name")
    expect(resolveOne("backgroundName")).toBe("Front_Background")
    expect(resolveOne("speciesName")).toBe("Front_Race")
    expect(resolveOne("subclassName")).toBe("Front_Archetype")
    expect(resolveOne("armorClass")).toBe("Front_AC")
    expect(resolveOne("proficiencyBonus")).toBe("Front_Proficiency")
    expect(resolveOne("hitDiceTotal")).toBe("Front_Total Hit Dice")
  })

  it("keeps ability score, modifier, and save fields distinct", () => {
    expect(resolveOne("ability.strength.score")).toBe("Front_Str Score")
    expect(resolveOne("ability.strength.mod")).toBe("Front_Str Mod")
    expect(resolveOne("save.strength.bonus")).toBe("Front_Str Save Throw")
    expect(resolveOne("save.strength.proficient")).toBe("Front_Save Str")
  })

  it("keeps skill bonus, proficiency, and expertise fields distinct", () => {
    expect(resolveOne("skill.athletics.bonus")).toBe("Front_Skill Athletics")
    expect(resolveOne("skill.athletics.proficient")).toBe("Front_Proficiency Athletics")
    expect(resolveOne("skill.athletics.expertise")).toBe("Front_Expertise Athletics")
  })

  it("maps indexed weapon and spell rows", () => {
    expect(resolveOne("weapon.1.name")).toBe("Front_Weapon Name 1")
    expect(resolveOne("weapon.1.attack")).toBe("Front_Weapon Atk Bonus 1")
    expect(resolveOne("weapon.1.damage")).toBe("Front_Weapon Damage 1")
    expect(resolveOne("spell.3.name")).toBe("Front_Spell Name 3")
    expect(resolveOne("spell.3.level")).toBe("Front_Spell Level 3")
    expect(resolveOne("spell.3.prepared")).toBe("Front_Spell Prepared 3")
  })

  it("maps back-page currency and personality fields", () => {
    expect(resolveOne("currency.gp")).toBe("Back_GP")
    expect(resolveOne("personalityTraits")).toBe("Back_Personality Traits")
  })

  it("returns nothing for keys the sheet has no field for", () => {
    expect(resolveSheetField("weapon.6.name", index)).toEqual([])
    expect(resolveSheetField("age", index)).toEqual([])
  })
})

describe("resolveSheetField on the 2024 PHB sheet", () => {
  const index = buildPdfFieldIndex(PHB_2024_FIELDS)
  const resolveOne = (key: string) => resolveSheetField(key, index)[0] ?? null

  it("maps that sheet's differently-worded field names", () => {
    expect(resolveOne("armorClass")).toBe("AC")
    expect(resolveOne("proficiencyBonus")).toBe("Prof Bonus")
    expect(resolveOne("size")).toBe("Size Field")
    expect(resolveOne("equipment")).toBe("Equipment Box")
    expect(resolveOne("languages")).toBe("Languages Field")
    expect(resolveOne("speciesTraits")).toBe("Species Traits")
    expect(resolveOne("ability.strength.mod")).toBe("Strength Mod")
    expect(resolveOne("currency.gp")).toBe("Gold Coins")
  })

  it("maps the reversed spell row wording", () => {
    expect(resolveOne("spell.3.name")).toBe("Spell 3 Name")
    expect(resolveOne("spell.3.level")).toBe("Spell 3 Level")
  })

  it("ignores meaningless generated field names", () => {
    expect(index.has("text box 12")).toBe(true)
    expect(resolveSheetField("bonds", index)).toEqual([])
    expect(resolveSheetField("characterName", index)).toEqual([])
  })
})

describe("countMappableFields", () => {
  it("scores a real sheet above an unrelated form", () => {
    expect(countMappableFields(CLASS_SHEET_FIELDS)).toBeGreaterThan(20)
    expect(countMappableFields(["Text Box 1", "Text Box 2", "Signature"])).toBe(0)
  })
})

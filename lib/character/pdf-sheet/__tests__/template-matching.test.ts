import { describe, expect, it } from "vitest"

import {
  DEFAULT_TEMPLATE_CLASS_NAMES,
  describeSheetTemplate,
  selectSheetTemplate,
  type SheetTemplateDescriptor,
} from "@/lib/character/pdf-sheet/template-matching"

const KNOWN = DEFAULT_TEMPLATE_CLASS_NAMES

function describeFile(fileName: string): SheetTemplateDescriptor {
  return describeSheetTemplate(fileName, fileName, KNOWN)
}

describe("describeSheetTemplate", () => {
  it("tags class-specific sheets", () => {
    const fighter = describeFile("456029-Character_Sheet_FIGHTER_FILLABLE.pdf")
    expect(fighter.kind).toBe("class")
    expect(fighter.classNames).toEqual(["Fighter"])
  })

  it("resolves the UA revised ranger sheet to Ranger", () => {
    const ranger = describeFile("456029-Character_Sheet_UA_REVISED_RANGER_FILLABLE.pdf")
    expect(ranger.kind).toBe("class")
    expect(ranger.classNames).toEqual(["Ranger"])
  })

  it("tags the generic sheets by caster type", () => {
    expect(describeFile("456029-Character_Sheet_MARTIAL_FILLABLE.pdf").kind).toBe("martial")
    expect(describeFile("456029-Character_Sheet_CASTER_A_FILLABLE.pdf").kind).toBe("caster")
    expect(describeFile("456029-Character_Sheet_HALF_CASTER_FILLABLE.pdf").kind).toBe("half-caster")
    expect(describeFile("2024 PHB Character Sheet (fillable).pdf").kind).toBe("general")
  })

  it("tags back pages and add-ons so they are not chosen as a front sheet", () => {
    expect(describeFile("456029-Character_Sheet_BACK_FILLABLE.pdf").kind).toBe("back")
    expect(describeFile("456029-Character_Sheet_BACK-COMPANION_FILLABLE.pdf").kind).toBe("addon")
    expect(describeFile("456029-Optional_Sheet_WILD_SHAPE_FILLABLE.pdf").kind).toBe("addon")
    expect(describeFile("Psion add-on sheet.pdf").kind).toBe("addon")
  })

  it("does not match a class name that only appears as a substring", () => {
    expect(describeFile("Barbarianesque homebrew sheet.pdf").classNames).toEqual([])
  })
})

describe("selectSheetTemplate", () => {
  const library = [
    describeFile("456029-Character_Sheet_FIGHTER_FILLABLE.pdf"),
    describeFile("456029-Character_Sheet_WIZARD_FILLABLE.pdf"),
    describeFile("456029-Character_Sheet_MARTIAL_FILLABLE.pdf"),
    describeFile("456029-Character_Sheet_CASTER_A_FILLABLE.pdf"),
    describeFile("456029-Character_Sheet_HALF_CASTER_FILLABLE.pdf"),
    describeFile("456029-Character_Sheet_BACK_FILLABLE.pdf"),
    describeFile("2024 PHB Character Sheet (fillable).pdf"),
  ]

  it("prefers the sheet for the character's primary class", () => {
    const chosen = selectSheetTemplate(library, {
      classNames: ["Fighter"],
      isSpellcaster: false,
    })
    expect(chosen?.fileName).toContain("FIGHTER")
  })

  it("prefers the primary class over a secondary multiclass", () => {
    const chosen = selectSheetTemplate(library, {
      classNames: ["Wizard", "Fighter"],
      isSpellcaster: true,
    })
    expect(chosen?.fileName).toContain("WIZARD")
  })

  it("falls back to the caster sheet when no class sheet is imported", () => {
    const generics = library.filter((row) => row.kind !== "class")
    expect(
      selectSheetTemplate(generics, { classNames: ["Sorcerer"], isSpellcaster: true })?.fileName,
    ).toContain("CASTER")
  })

  it("falls back to the martial sheet for non-casters", () => {
    const generics = library.filter((row) => row.kind !== "class")
    expect(
      selectSheetTemplate(generics, { classNames: ["Barbarian"], isSpellcaster: false })?.fileName,
    ).toContain("MARTIAL")
  })

  it("prefers the half-caster sheet for half-caster progressions", () => {
    const generics = library.filter((row) => row.kind !== "class")
    expect(
      selectSheetTemplate(generics, {
        classNames: ["Paladin"],
        isSpellcaster: true,
        isHalfCaster: true,
      })?.fileName,
    ).toContain("HALF_CASTER")
  })

  it("never chooses a back page or add-on", () => {
    const backOnly = library.filter((row) => row.kind === "back")
    expect(selectSheetTemplate(backOnly, { classNames: ["Bard"], isSpellcaster: true })).toBeNull()
  })
})

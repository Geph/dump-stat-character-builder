import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"

import { fillSheetPdf, sanitizePdfText } from "@/lib/character/pdf-sheet/fill-sheet-pdf"

/**
 * Builds a stand-in for the class-specific sheets: the shipped PDFs are third-party
 * files we cannot vendor, but they only differ from this by layout.
 */
async function buildTemplate(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  const form = doc.getForm()

  const textFields = [
    "Front_Character Name",
    "Front_AC",
    "Front_Str Mod",
    "Front_Str Save Throw",
    "Front_Skill Athletics",
    "Front_Weapon Name 1",
    "Front_Weapon Damage 1",
    "Front_Languages",
    "Front_Inspiration",
    "Back_GP",
  ]
  textFields.forEach((name, i) => {
    const field = form.createTextField(name)
    field.addToPage(page, { x: 20, y: 740 - i * 24, width: 200, height: 18 })
  })

  // Class sheets label some boxes after the feature they hold.
  const featureField = form.createTextField("Front_Action Surge")
  featureField.addToPage(page, { x: 20, y: 460, width: 200, height: 18 })

  const checkFields = ["Front_Save Str", "Front_Proficiency Athletics", "Front_Light Armour"]
  checkFields.forEach((name, i) => {
    const field = form.createCheckBox(name)
    field.addToPage(page, { x: 300, y: 740 - i * 24, width: 12, height: 12 })
  })

  return doc.save()
}

async function readBack(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes)
  const form = doc.getForm()
  return {
    text: (name: string) => form.getTextField(name).getText() ?? "",
    checked: (name: string) => form.getCheckBox(name).isChecked(),
  }
}

describe("fillSheetPdf", () => {
  it("writes text, checkbox, and boolean-into-text values", async () => {
    const template = await buildTemplate()
    const result = await fillSheetPdf(template, {
      characterName: "Thora Ironvein",
      armorClass: "18",
      "ability.strength.mod": "+3",
      "save.strength.bonus": "+6",
      "save.strength.proficient": true,
      "skill.athletics.bonus": "+6",
      "skill.athletics.proficient": true,
      "prof.armor.light": true,
      "weapon.1.name": "Longsword",
      "weapon.1.damage": "1d8+3 slashing",
      languages: "Common, Dwarvish",
      inspiration: true,
      "currency.gp": "25",
    })

    const sheet = await readBack(result.bytes)
    expect(sheet.text("Front_Character Name")).toBe("Thora Ironvein")
    expect(sheet.text("Front_AC")).toBe("18")
    expect(sheet.text("Front_Str Mod")).toBe("+3")
    expect(sheet.text("Front_Str Save Throw")).toBe("+6")
    expect(sheet.text("Front_Weapon Name 1")).toBe("Longsword")
    expect(sheet.text("Back_GP")).toBe("25")
    expect(sheet.checked("Front_Save Str")).toBe(true)
    expect(sheet.checked("Front_Proficiency Athletics")).toBe(true)
    expect(sheet.checked("Front_Light Armour")).toBe(true)
    // Inspiration is a text field on this family, so the boolean becomes a mark.
    expect(sheet.text("Front_Inspiration")).toBe("X")
  })

  it("reports keys the template has no field for", async () => {
    const template = await buildTemplate()
    const result = await fillSheetPdf(template, {
      characterName: "Thora Ironvein",
      "spell.1.name": "Fire Bolt",
      backstory: "Long story.",
    })
    expect(result.filledKeys).toContain("characterName")
    expect(result.unmatchedKeys).toEqual(expect.arrayContaining(["spell.1.name", "backstory"]))
  })

  it("survives text the standard PDF font cannot encode", async () => {
    const template = await buildTemplate()
    const result = await fillSheetPdf(template, {
      characterName: "Thora \u2014 \u201CIronvein\u201D \u2694\uFE0F",
    })
    const sheet = await readBack(result.bytes)
    expect(sheet.text("Front_Character Name")).toBe('Thora - "Ironvein"')
  })

  it("fills a feature box the sheet labels by feature name", async () => {
    const template = await buildTemplate()
    const result = await fillSheetPdf(template, {
      "field:action surge": "Take one extra action.",
      "field:rage": "Not on this sheet.",
    })
    const sheet = await readBack(result.bytes)
    expect(sheet.text("Front_Action Surge")).toBe("Take one extra action.")
    expect(result.unmatchedKeys).toContain("field:rage")
  })

  it("does not let a feature name overwrite a slot a canonical key already filled", async () => {
    const template = await buildTemplate()
    const result = await fillSheetPdf(template, {
      languages: "Common, Dwarvish",
      "field:languages": "Feature text that must not land here.",
    })
    const sheet = await readBack(result.bytes)
    expect(sheet.text("Front_Languages")).toBe("Common, Dwarvish")
    expect(result.unmatchedKeys).toContain("field:languages")
  })

  it("flattens on request", async () => {
    const template = await buildTemplate()
    const result = await fillSheetPdf(template, { characterName: "Thora" }, { flatten: true })
    const doc = await PDFDocument.load(result.bytes)
    expect(doc.getForm().getFields()).toHaveLength(0)
  })
})

describe("sanitizePdfText", () => {
  it("folds typographic punctuation down to ASCII", () => {
    expect(sanitizePdfText("\u2018a\u2019 \u201Cb\u201D \u2013 c\u2026")).toBe("'a' \"b\" - c...")
    expect(sanitizePdfText("Rage \u00B7 2 uses")).toBe("Rage * 2 uses")
  })

  it("keeps newlines for multi-line blocks", () => {
    expect(sanitizePdfText("Longsword\nRations x5")).toBe("Longsword\nRations x5")
  })
})

import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"
import { normalizeEquipmentRows } from "@/lib/import/normalize-equipment"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import {
  hasHomebrewImportFixtures,
  homebrewFixturePath,
} from "@/lib/import/__tests__/homebrew-fixture-path"

function loadFixture(name: string) {
  const path = homebrewFixturePath(name)
  if (!path) throw new Error(`Missing homebrew fixture: ${name}`)
  return readFileSync(path, "utf8")
}

describe.runIf(hasHomebrewImportFixtures)("Valda's Spire of Secrets weapons import", () => {
  it("parses valdas-weapons.json through the import pipeline", () => {
    const raw = loadFixture("valdas-weapons.json")
    const parsed = parseImportContentJson(raw)
    expect(parsed).not.toBeNull()
    expect(parsed!.equipment?.length).toBeGreaterThan(40)
  })

  it("normalizes switch weapons with dual forms", () => {
    const content = normalizeAiImportContent(JSON.parse(loadFixture("valdas-weapons.json")))
    const rows = normalizeEquipmentRows((content.equipment ?? []).map((row) => ({ ...row })))
    const bowblade = rows.find((row) => row.name === "Bowblade")
    expect(bowblade?.subcategory).toBe("Switch Weapon")
    const forms = (bowblade?.properties as { forms?: { name: string }[] })?.forms
    expect(forms?.length).toBe(2)
    expect(forms?.map((form) => form.name)).toEqual(["Longsword", "Longbow"])
  })

  it("infers firearm subcategory when omitted", () => {
    const content = normalizeAiImportContent(JSON.parse(loadFixture("valdas-weapons.json")))
    const rows = normalizeEquipmentRows((content.equipment ?? []).map((row) => ({ ...row })))
    const smg = rows.find((row) => row.name === "Submachine Gun")
    expect(smg?.subcategory).toBe("Modern Firearm")
  })

  it("preserves homebrew mastery and property tags", () => {
    const content = normalizeAiImportContent(JSON.parse(loadFixture("valdas-weapons.json")))
    const rows = normalizeEquipmentRows((content.equipment ?? []).map((row) => ({ ...row })))
    const bomb = rows.find((row) => row.name === "Bomb")
    const props = bomb?.properties as {
      mastery?: string
      properties?: string[]
    }
    expect(props?.mastery).toBe("Explode")
    expect(props?.properties).toContain("Destructible")
  })
})

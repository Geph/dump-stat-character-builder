import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { IMPORT_JSON_TEMPLATES } from "@/lib/import/byo-import-kit"

describe("parseImportContentJson", () => {
  it("parses a class-shaped BYO template", () => {
    const raw = JSON.stringify(IMPORT_JSON_TEMPLATES.classes)
    const content = parseImportContentJson(raw)
    expect(content?.classes?.[0]?.name).toBe("Fighter")
    expect(content?.classes?.[0]?.features?.[0]?.name).toBe("Second Wind")
  })

  it("unwraps { type: import-content, content: ... }", () => {
    const raw = JSON.stringify({
      type: "import-content",
      content: IMPORT_JSON_TEMPLATES.feats,
    })
    const content = parseImportContentJson(raw)
    expect(content?.feats?.[0]?.name).toBe("Archery")
  })

  it("returns null for invalid JSON", () => {
    expect(parseImportContentJson("{not json")).toBeNull()
    expect(parseImportContentJson('{"foo": 1}')).toBeNull()
  })

  it("parses a realistic Gemini class export with proposals", () => {
    const fixturePath = "c:/Users/Geph/Desktop/gemini-code-1782185151058.json"
    let raw: string
    try {
      raw = readFileSync(fixturePath, "utf8")
    } catch {
      return // skip when fixture not on this machine
    }
    const content = parseImportContentJson(raw)
    expect(content).not.toBeNull()
    expect(content?.classes?.[0]?.name).toBe("Gunslinger")
    expect(content?.import_proposals?.custom_abilities?.length).toBeGreaterThan(0)
  })

  it("strips markdown code fences from pasted LLM output", () => {
    const raw = "```json\n" + JSON.stringify(IMPORT_JSON_TEMPLATES.feats) + "\n```"
    const content = parseImportContentJson(raw)
    expect(content?.feats?.[0]?.name).toBe("Archery")
  })

  it("parses spells-shaped BYO template", () => {
    const raw = JSON.stringify(IMPORT_JSON_TEMPLATES.spells)
    const content = parseImportContentJson(raw)
    expect(content?.spells?.[0]?.name).toBe("Fireball")
  })

  it("merges a JSON array of import objects in listed order", () => {
    const parts = [
      IMPORT_JSON_TEMPLATES.spells,
      IMPORT_JSON_TEMPLATES.classes,
      IMPORT_JSON_TEMPLATES.subclasses,
    ]
    for (const part of parts) {
      expect(parseImportContentJson(JSON.stringify(part))).not.toBeNull()
    }
    const raw = JSON.stringify(parts)
    const content = parseImportContentJson(raw)
    expect(content?.spells?.length).toBeGreaterThan(0)
    expect(content?.classes?.[0]?.name).toBe("Fighter")
    expect(content?.subclasses?.[0]?.name).toBe("Champion")
  })
})

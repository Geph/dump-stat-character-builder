import { describe, expect, it } from "vitest"
import { repairLlmJsonText, stripLlmJsonText } from "@/lib/import/strip-llm-json"
import { IMPORT_JSON_TEMPLATES } from "@/lib/import/byo-import-kit"
import {
  parseImportContentJson,
  parseImportContentJsonDetailed,
} from "@/lib/import/parse-import-content-json"

describe("stripLlmJsonText", () => {
  it("removes markdown code fences", () => {
    const inner = JSON.stringify(IMPORT_JSON_TEMPLATES.feats)
    const raw = "```json\n" + inner + "\n```"
    expect(parseImportContentJson(raw)?.feats?.[0]?.name).toBe("Archery")
  })

  it("extracts JSON object from leading prose", () => {
    const inner = JSON.stringify({ classes: [{ name: "Test" }] })
    const raw = "Here is the JSON:\n" + inner
    expect(stripLlmJsonText(raw)).toBe(inner)
  })

  it("preserves JSON arrays for multi-file import batches", () => {
    const inner = JSON.stringify([IMPORT_JSON_TEMPLATES.spells, IMPORT_JSON_TEMPLATES.classes])
    const raw = "Batch import:\n" + inner
    expect(stripLlmJsonText(raw)).toBe(inner)
    expect(parseImportContentJson(raw)?.spells?.length).toBeGreaterThan(0)
    expect(parseImportContentJson(raw)?.classes?.[0]?.name).toBe("Fighter")
  })
})

describe("repairLlmJsonText", () => {
  it("escapes raw newlines inside string values (Gemini paste)", () => {
    const broken = `{
"classes": [
{
"name": "Witch",
"description": "Line one.

Line two with <strong>HTML</strong>."
}
]
}`
    expect(() => JSON.parse(broken)).toThrow()
    const repaired = repairLlmJsonText(broken)
    const parsed = JSON.parse(repaired) as { classes: { name: string; description: string }[] }
    expect(parsed.classes[0]?.name).toBe("Witch")
    expect(parsed.classes[0]?.description).toContain("Line one.")
    expect(parsed.classes[0]?.description).toContain("Line two")
    expect(parseImportContentJson(broken)?.classes?.[0]?.name).toBe("Witch")
  })

  it("strips trailing commas before closers", () => {
    const broken = '{"feats":[{"name":"Archery",}],}'
    expect(parseImportContentJson(broken)?.feats?.[0]?.name).toBe("Archery")
  })

  it("reports a useful error when JSON is still invalid", () => {
    const result = parseImportContentJsonDetailed("{not json")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/Could not parse import JSON/)
    }
  })
})

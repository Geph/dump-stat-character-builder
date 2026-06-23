import { describe, expect, it } from "vitest"
import { stripLlmJsonText } from "@/lib/import/strip-llm-json"
import { IMPORT_JSON_TEMPLATES } from "@/lib/import/byo-import-kit"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"

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
})

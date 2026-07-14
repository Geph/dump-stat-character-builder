import { describe, expect, it } from "vitest"
import { buildByoExtractionPrompt } from "@/lib/import/byo-import-kit"
import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"
import { formatSubclassMatchImportHint } from "@/lib/import/subclass-match-import-hints"

describe("subclass match import hints", () => {
  it("returns empty when match is missing", () => {
    expect(formatSubclassMatchImportHint(null)).toBe("")
    expect(formatSubclassMatchImportHint({ className: "  " })).toBe("")
  })

  it("locks class_name from the matched parent class", () => {
    const hint = formatSubclassMatchImportHint({
      className: "Barbarian",
    })
    expect(hint).toContain('class_name must be exactly "Barbarian"')
    expect(hint).toContain("Matched parent class")
    expect(hint).toContain("source's own subclass name")
    expect(hint).not.toContain("Path of the Wild Heart")
  })

  it("includes the match block in BYO and system prompts", () => {
    const match = { className: "Fighter" }
    const system = buildImportSystemPrompt("subclasses", { subclassMatch: match })
    const byo = buildByoExtractionPrompt("subclasses", { subclassMatch: match })
    expect(system).toContain('class_name must be exactly "Fighter"')
    expect(byo).toContain('class_name must be exactly "Fighter"')
    expect(byo).toContain("Focus primarily on extracting: subclasses")
  })
})

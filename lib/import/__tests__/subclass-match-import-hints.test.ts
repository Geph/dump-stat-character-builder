import { describe, expect, it } from "vitest"
import { buildByoExtractionPrompt } from "@/lib/import/byo-import-kit"
import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"
import { formatSubclassMatchImportHint } from "@/lib/import/subclass-match-import-hints"

describe("subclass match import hints", () => {
  it("returns empty when match is missing", () => {
    expect(formatSubclassMatchImportHint(null)).toBe("")
    expect(formatSubclassMatchImportHint({ name: "  ", className: "Barbarian" })).toBe("")
  })

  it("locks class_name and explains name rules", () => {
    const hint = formatSubclassMatchImportHint({
      name: "Path of the Wild Heart",
      className: "Barbarian",
    })
    expect(hint).toContain('class_name must be exactly "Barbarian"')
    expect(hint).toContain('exactly "Path of the Wild Heart"')
    expect(hint).toContain("different subclass of the same class")
  })

  it("includes the match block in BYO and system prompts", () => {
    const match = { name: "Champion", className: "Fighter" }
    const system = buildImportSystemPrompt("subclasses", { subclassMatch: match })
    const byo = buildByoExtractionPrompt("subclasses", { subclassMatch: match })
    expect(system).toContain('class_name must be exactly "Fighter"')
    expect(byo).toContain('class_name must be exactly "Fighter"')
    expect(byo).toContain("Focus primarily on extracting: subclasses")
  })
})

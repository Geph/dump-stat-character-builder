import { describe, expect, it } from "vitest"
import { buildByoExtractionPrompt } from "@/lib/import/byo-import-kit"
import { SPELL_SCHOOL_IMPORT_HINT } from "@/lib/import/class-spell-lists"
import { buildImportSystemPrompt } from "@/lib/import/import-system-prompt"

describe("spell school import hints", () => {
  it("documents preserving novel schools of magic", () => {
    expect(SPELL_SCHOOL_IMPORT_HINT).toContain("Chronomancy")
    expect(SPELL_SCHOOL_IMPORT_HINT).toContain("Duromancy")
    expect(SPELL_SCHOOL_IMPORT_HINT).toContain("Void Magic")
    expect(SPELL_SCHOOL_IMPORT_HINT).toContain("Sangromancy")
    expect(SPELL_SCHOOL_IMPORT_HINT).toContain("Do not remap novel schools")
  })

  it("includes novel-school guidance in system and BYO prompts", () => {
    expect(buildImportSystemPrompt("spells")).toContain("Chronomancy")
    const byo = buildByoExtractionPrompt("spells")
    expect(byo).toContain("Chronomancy")
    expect(byo).toContain("Duromancy")
    expect(byo).toContain('"school": "Chronomancy"')
  })
})

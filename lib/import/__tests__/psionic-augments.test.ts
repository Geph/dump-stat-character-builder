import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"
import {
  formatPsionicAugmentSelectionSummary,
  parsePsionicAugmentCost,
  parsePsionicAugmentsFromDescription,
  totalPsionicAugmentCost,
} from "@/lib/compendium/parse-psionic-augments"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { combineImportContents } from "@/lib/import/merge-import-content"
import { normalizeSpellImportRows } from "@/lib/import/normalize-spell-import"
import {
  hasHomebrewImportFixtures,
  homebrewFixturePath,
} from "@/lib/import/__tests__/homebrew-fixture-path"

function loadFixture(name: string) {
  const path = homebrewFixturePath(name)
  if (!path) throw new Error(`Missing homebrew fixture: ${name}`)
  return normalizeAiImportContent(JSON.parse(readFileSync(path, "utf8")))
}

describe("parsePsionicAugmentsFromDescription", () => {
  it("parses fixed, scaling, range, and zero-cost augments", () => {
    expect(parsePsionicAugmentCost("3 psi points")).toEqual({ fixed: 3 })
    expect(parsePsionicAugmentCost("1+ psi points")).toEqual({ min: 1, scalesPerPoint: true })
    expect(parsePsionicAugmentCost("1–3 psi points")).toEqual({ min: 1, max: 3 })
    expect(parsePsionicAugmentCost("0 psi points")).toEqual({ fixed: 0 })
  })

  it.runIf(hasHomebrewImportFixtures)("parses Seeing augments from psion-disciplines.json", () => {
    const content = loadFixture("psion-disciplines.json")
    const seeing = content.spells?.find((spell) => spell.name === "Seeing")
    expect(seeing).toBeTruthy()

    const parsed = parsePsionicAugmentsFromDescription(seeing!.description ?? "")
    expect(parsed?.allowMultiple).toBe(true)
    expect(parsed?.augments.map((row) => row.name)).toEqual(
      expect.arrayContaining(["Omniscient", "Piercing", "Thwarting", "Withheld"]),
    )

    const piercing = parsed?.augments.find((row) => row.name === "Piercing")
    expect(piercing?.cost.scalesPerPoint).toBe(true)
    const withheld = parsed?.augments.find((row) => row.name === "Withheld")
    expect(withheld?.cost.fixed).toBe(0)
  })

  it.runIf(hasHomebrewImportFixtures)("parses Enhancing Surge augments", () => {
    const content = loadFixture("psion-disciplines.json")
    const surge = content.spells?.find((spell) => spell.name === "Enhancing Surge")
    const parsed = parsePsionicAugmentsFromDescription(surge?.description ?? "")
    expect(parsed?.augments.some((row) => row.name === "Fortifying")).toBe(true)
    expect(parsed?.augments.some((row) => row.name === "Resilient")).toBe(true)
  })

  it.runIf(hasHomebrewImportFixtures)("computes selection cost summaries", () => {
    const content = loadFixture("psion-disciplines.json")
    const seeing = content.spells?.find((spell) => spell.name === "Seeing")
    const parsed = parsePsionicAugmentsFromDescription(seeing?.description ?? "")
    expect(parsed).toBeTruthy()

    const selections = [
      { augmentId: "omniscient", pointsSpent: 1 },
      { augmentId: "piercing", pointsSpent: 3 },
    ]
    expect(totalPsionicAugmentCost(parsed!, selections)).toBe(4)
    expect(formatPsionicAugmentSelectionSummary(parsed!, selections)).toContain("4 psi total")
  })
})

describe.runIf(hasHomebrewImportFixtures)("import enrich psionic augments", () => {
  it("attaches psionic_augments to discipline powers on import", () => {
    const combined = combineImportContents([
      loadFixture("psion-disciplines.json"),
      loadFixture("psion-class.json"),
      loadFixture("psion-knowing-mind.json"),
    ])
    const enriched = enrichImportContentModifiers(combined)
    const spells = normalizeSpellImportRows(enriched.spells as Record<string, unknown>[])
    const seeing = spells.find((spell) => spell.name === "Seeing") as Record<string, unknown>
    expect(seeing?.psionic_augments).toBeTruthy()
    expect((seeing.psionic_augments as { augments: { name: string }[] }).augments.length).toBeGreaterThan(
      3,
    )
  })

  it("loads Knowing Mind subclass without breaking augment wiring", () => {
    const content = loadFixture("psion-knowing-mind.json")
    expect(content.subclasses?.[0]?.name).toBe("Knowing Mind")
    const enriched = enrichImportContentModifiers(
      combineImportContents([loadFixture("psion-disciplines.json"), content]),
    )
    expect(enriched.subclasses?.[0]?.features?.some((f) => f.name === "Climactic Moment")).toBe(true)
    const seeing = enriched.spells?.find((spell) => spell.name === "Seeing") as
      | Record<string, unknown>
      | undefined
    expect(seeing?.psionic_augments).toBeTruthy()
  })
})

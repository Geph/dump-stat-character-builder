import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  enrichImportedClassList,
  mergeTableParsedClassResources,
  detectTrinketCost,
} from "@/lib/import/enrich-import-classes"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

const FIXTURE_PATH = join(__dirname, "fixtures", "investigator-class.json")

function loadInvestigatorFixture(): ImportContent {
  return normalizeAiImportContent(JSON.parse(readFileSync(FIXTURE_PATH, "utf8")))
}

function wired(content: ImportContent, featureName: string, sourceLabel: string): boolean {
  const review = collectImportModifierReview(enrichImportContentModifiers(content))
  return review.some(
    (row) =>
      row.featureName === featureName &&
      row.sourceLabel === sourceLabel &&
      row.status === "wired",
  )
}

describe("Investigator class import wiring", () => {
  it("parses Ritual Level, Rushed Incantation, Finisher, and Trinkets columns", () => {
    const content = loadInvestigatorFixture()
    const tableText = content.classes?.[0]?.description ?? ""
    const parsed = parseClassProgressionTable(tableText)
    expect(parsed).not.toBeNull()
    const keys = parsed!.columns.map((col) => col.resourceKey)
    expect(keys).toContain("rushed_incantation")
    expect(keys).toContain("trinkets")
    expect(keys).toContain("ritual_level")
    expect(keys).toContain("finisher")
  })

  it("reads scaling values for Rushed Incantation and Trinkets pools", () => {
    const content = loadInvestigatorFixture()
    const parsed = parseClassProgressionTable(content.classes?.[0]?.description ?? "")!
    const rushed = parsed.columns.find((col) => col.resourceKey === "rushed_incantation")
    const trinkets = parsed.columns.find((col) => col.resourceKey === "trinkets")
    expect(rushed?.valuesByLevel).toEqual(
      expect.arrayContaining([
        { level: 2, count: 3 },
        { level: 9, count: 7 },
        { level: 20, count: 10 },
      ]),
    )
    expect(trinkets?.valuesByLevel).toEqual(
      expect.arrayContaining([
        { level: 3, count: 2 },
        { level: 9, count: 4 },
        { level: 20, count: 6 },
      ]),
    )
  })

  it("reads the Ritual Level cap and the Finisher die progression", () => {
    const content = loadInvestigatorFixture()
    const parsed = parseClassProgressionTable(content.classes?.[0]?.description ?? "")!
    const ritual = parsed.columns.find((col) => col.resourceKey === "ritual_level")
    const finisher = parsed.columns.find((col) => col.resourceKey === "finisher")
    expect(ritual?.valuesByLevel).toEqual(
      expect.arrayContaining([
        { level: 1, count: 1 },
        { level: 3, count: 2 },
        { level: 11, count: 6 },
      ]),
    )
    expect(finisher?.valuesByLevel).toEqual(
      expect.arrayContaining([
        { level: 2, count: 1 },
        { level: 11, count: 2 },
        { level: 17, count: 3 },
      ]),
    )
    const latestDie = (finisher?.dieSidesByLevel ?? []).sort((a, b) => a.level - b.level).at(-1)
    expect(latestDie?.count).toBe(8)
  })

  it("builds class resource rows with correct recharge and special shapes", () => {
    const content = loadInvestigatorFixture()
    const resources = mergeTableParsedClassResources(content)

    const rushed = resources.find(
      (r) => r.class_name === "Investigator" && r.resource_key === "rushed_incantation",
    )
    expect(rushed?.uses.type).toBe("at_level")
    expect(rushed?.uses.recharges).toEqual(
      expect.arrayContaining([{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }]),
    )

    const trinkets = resources.find(
      (r) => r.class_name === "Investigator" && r.resource_key === "trinkets",
    )
    expect(trinkets?.uses.recharges).toEqual(
      expect.arrayContaining([{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }]),
    )

    const ritual = resources.find(
      (r) => r.class_name === "Investigator" && r.resource_key === "ritual_level",
    )
    expect(ritual?.uses.type).toBe("special")

    const finisher = resources.find(
      (r) => r.class_name === "Investigator" && r.resource_key === "finisher",
    )
    expect(finisher?.uses.type).toBe("special")
    expect(finisher?.uses.dieType).toBe("d8")
  })

  it("links the Holy Trinkets feature to the Trinkets resource", () => {
    const content = loadInvestigatorFixture()
    const [enriched] = enrichImportedClassList(
      content.classes as unknown as Record<string, unknown>[],
      undefined,
    )
    const features = enriched.features as Feature[]
    const holy = features.find((f) => f.name === "Holy Trinkets")
    expect(holy?.limitedUses?.type).toBe("class_resource")
    expect(holy?.limitedUses?.classResourceKey).toBe("trinkets")
  })

  it("detects trinket spend phrasing", () => {
    expect(detectTrinketCost("expending a use of your Trinkets to do so")).toBe(1)
    expect(detectTrinketCost("you can read a book")).toBeNull()
  })

  it("wires common Investigator class features with shared modifiers", () => {
    const content = loadInvestigatorFixture()
    expect(wired(content, "Weapon Mastery", "Class: Investigator")).toBe(true)
    expect(wired(content, "Expertise", "Class: Investigator")).toBe(true)
    expect(wired(content, "Ability Score Improvement", "Class: Investigator")).toBe(true)
    expect(wired(content, "Epic Boon", "Class: Investigator")).toBe(true)
  })
})

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  detectEnduranceDieCost,
  enrichImportedClassList,
  mergeTableParsedClassResources,
} from "@/lib/import/enrich-import-classes"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

const FIXTURE_PATH = join(__dirname, "fixtures", "warden-class.json")

function loadWardenFixture(): ImportContent {
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

describe("Warden class import wiring", () => {
  it("parses the Endurance Dice, Endurance Die Size, and Primal Manifestation columns", () => {
    const content = loadWardenFixture()
    const parsed = parseClassProgressionTable(content.classes?.[0]?.description ?? "")
    expect(parsed).not.toBeNull()
    const keys = parsed!.columns.map((col) => col.resourceKey)
    expect(keys).toContain("endurance_dice")
    expect(keys).toContain("endurance_die_size")
    expect(keys).toContain("primal_manifestations")
  })

  it("reads the Endurance Dice count scaling and Endurance die-size progression", () => {
    const content = loadWardenFixture()
    const parsed = parseClassProgressionTable(content.classes?.[0]?.description ?? "")!
    const dice = parsed.columns.find((col) => col.resourceKey === "endurance_dice")
    const dieSize = parsed.columns.find((col) => col.resourceKey === "endurance_die_size")
    expect(dice?.valuesByLevel).toEqual(
      expect.arrayContaining([
        { level: 2, count: 3 },
        { level: 5, count: 4 },
        { level: 9, count: 5 },
        { level: 13, count: 6 },
        { level: 18, count: 7 },
      ]),
    )
    // Endurance Die Size column stores the die sides (8 -> 10 -> 12) as the cell value.
    expect(dieSize?.valuesByLevel).toEqual(
      expect.arrayContaining([
        { level: 2, count: 8 },
        { level: 5, count: 10 },
        { level: 11, count: 12 },
      ]),
    )
  })

  it("builds an Endurance Dice resource that recharges on a short or long rest", () => {
    const content = loadWardenFixture()
    const resources = mergeTableParsedClassResources(content)

    const dice = resources.find(
      (r) => r.class_name === "Warden" && r.resource_key === "endurance_dice",
    )
    expect(dice?.uses.type).toBe("at_level")
    expect(dice?.uses.recharges).toEqual(
      expect.arrayContaining([{ rest: "short_rest" }, { rest: "long_rest" }]),
    )

    const dieSize = resources.find(
      (r) => r.class_name === "Warden" && r.resource_key === "endurance_die_size",
    )
    expect(dieSize?.uses.type).toBe("special")
    expect(dieSize?.uses.dieType).toBe("d12")

    const manifestations = resources.find(
      (r) => r.class_name === "Warden" && r.resource_key === "primal_manifestations",
    )
    expect(manifestations?.uses.type).toBe("special")
  })

  it("links the Endurance Dice feature to the endurance_dice resource", () => {
    const content = loadWardenFixture()
    const [enriched] = enrichImportedClassList(
      content.classes as unknown as Record<string, unknown>[],
      undefined,
    )
    const features = enriched.features as Feature[]
    const enduranceFeature = features.find((f) => f.name === "Endurance Dice")
    expect(enduranceFeature?.limitedUses?.type).toBe("class_resource")
    expect(enduranceFeature?.limitedUses?.classResourceKey).toBe("endurance_dice")
  })

  it("detects Endurance Die spend phrasing without matching 'the amount rolled'", () => {
    expect(detectEnduranceDieCost("you can roll an Endurance Die to reduce the damage")).toBe(1)
    expect(detectEnduranceDieCost("you regain all expended Endurance Dice")).toBeNull()
  })

  it("wires Mystic Bulwark's flat damage reduction", () => {
    expect(wired(loadWardenFixture(), "Mystic Bulwark", "Class: Warden")).toBe(true)
  })

  it("wires common Warden class features with shared modifiers", () => {
    const content = loadWardenFixture()
    expect(wired(content, "Ability Score Improvement", "Class: Warden")).toBe(true)
    expect(wired(content, "Extra Attack", "Class: Warden")).toBe(true)
  })
})

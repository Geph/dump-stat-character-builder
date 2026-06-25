import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { mergeTableParsedClassResources } from "@/lib/import/enrich-import-classes"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { collectImportProposals } from "@/lib/import/import-proposals"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import { detectBattleDieCost } from "@/lib/import/enrich-import-classes"
import type { ImportContent } from "@/lib/import/content-schema"

const FIXTURE_PATH = join(__dirname, "fixtures", "captain-class.json")

function loadCaptainFixture(): ImportContent {
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

describe("Captain class import wiring", () => {
  it("parses Battle Dice column from the level table", () => {
    const content = loadCaptainFixture()
    const tableText = content.classes?.[0]?.description ?? ""
    const parsed = parseClassProgressionTable(tableText)
    expect(parsed).not.toBeNull()
    expect(parsed!.columns.map((col) => col.resourceKey)).toContain("battle_dice")
    expect(parsed!.columns.find((col) => col.resourceKey === "battle_dice")?.valuesByLevel).toEqual(
      expect.arrayContaining([
        { level: 1, count: 2 },
        { level: 5, count: 3 },
        { level: 20, count: 5 },
      ]),
    )
  })

  it("builds battle_dice class resource rows from the table", () => {
    const content = loadCaptainFixture()
    const resources = mergeTableParsedClassResources(content)
    const battleDice = resources.find(
      (row) => row.class_name === "Captain" && row.resource_key === "battle_dice",
    )
    expect(battleDice).toBeTruthy()
    expect(battleDice?.uses.atLevelTable).toEqual(
      expect.arrayContaining([
        { level: 1, count: 2 },
        { level: 9, count: 3 },
        { level: 20, count: 5 },
      ]),
    )
  })

  it("detects battle die spend phrasing on maneuvers", () => {
    expect(detectBattleDieCost("you can expend one Battle Die to motivate an ally")).toBe(1)
    expect(detectBattleDieCost("expend a Battle Die as a Bonus Action")).toBe(1)
  })

  it("wires core Captain class features with common modifiers", () => {
    const content = loadCaptainFixture()
    expect(wired(content, "Weapon Mastery", "Class: Captain")).toBe(true)
    expect(wired(content, "Fighting Style", "Class: Captain")).toBe(true)
    expect(wired(content, "Epic Boon", "Class: Captain")).toBe(true)
    expect(wired(content, "Cohort", "Class: Captain")).toBe(true)
  })

  it("proposes Captain maneuvers as custom abilities tied to battle_dice", () => {
    const content = loadCaptainFixture()
    const proposals = collectImportProposals(content)
    const bolster = proposals.customAbilities.find((row) => row.name === "Bolster")
    const bornLeader = proposals.customAbilities.find((row) => row.name === "Born Leader")
    expect(bolster?.resourceKey).toBe("battle_dice")
    expect(bornLeader?.resourceKey).toBe("battle_dice")
    expect(
      proposals.customAbilities.filter((row) => row.resourceKey === "battle_dice").length,
    ).toBeGreaterThanOrEqual(5)
  })
})

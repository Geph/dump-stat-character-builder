import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { collectImportProposals } from "@/lib/import/import-proposals"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import type { ImportContent } from "@/lib/import/content-schema"

const FIXTURE_PATH = join(__dirname, "fixtures", "necromancer-class.json")

function loadNecromancerFixture(): ImportContent {
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

describe("Necromancer class import wiring", () => {
  it("proposes Charnel Touch as a 5 × level points pool from prose", () => {
    const content = loadNecromancerFixture()
    const proposals = collectImportProposals(content)
    const charnel = proposals.classResources.find(
      (row) => row.className === "Necromancer" && row.resourceKey === "charnel_touch",
    )
    expect(charnel).toBeTruthy()
    expect(charnel?.uses.type).toBe("at_level")
    expect(charnel?.uses.atLevelMode).toBe("multiply_level")
    expect(charnel?.uses.atLevelTable).toEqual([{ level: 1, count: 5 }])
    expect(charnel?.uses.recharges).toEqual([{ rest: "long_rest" }])
  })

  it("wires Animate Dead as an always-prepared spell", () => {
    const content = loadNecromancerFixture()
    expect(wired(content, "Animate Dead", "Class: Necromancer")).toBe(true)
  })

  it("wires common Necromancer class features with shared modifiers", () => {
    const content = loadNecromancerFixture()
    expect(wired(content, "Ability Score Improvement", "Class: Necromancer")).toBe(true)
    expect(wired(content, "Epic Boon", "Class: Necromancer")).toBe(true)
  })
})

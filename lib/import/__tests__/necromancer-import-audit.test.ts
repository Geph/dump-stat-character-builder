import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { collectImportProposals } from "@/lib/import/import-proposals"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

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

  it("wires Animate Dead as an always-prepared action cast with Spirit companions", () => {
    const content = loadNecromancerFixture()
    expect(wired(content, "Animate Dead", "Class: Necromancer")).toBe(true)
    const feature = enrichImportContentModifiers(content).classes
      ?.find((row) => /necromancer/i.test(String(row.name)))
      ?.features?.find((row) => row.name === "Animate Dead") as Feature | undefined
    expect(feature?.activation?.action).toBe(true)
    const chars = feature?.linkedModifiers?.flatMap((instance) => instance.characteristics ?? []) ?? []
    const known = chars.find((row) => row.type === "spells_known")
    expect(known).toMatchObject({ alwaysPrepared: true })
    expect(
      known?.type === "spells_known" ? known.spells?.map((entry) => entry.spellId).join(" ") : "",
    ).toMatch(/Animate Dead/)
    const grant = chars.find((row) => row.type === "grant_creature")
    expect(grant).toMatchObject({
      type: "grant_creature",
      choiceOptions: expect.arrayContaining(["Skeleton", "Spirit", "Zombie"]),
    })
    const cast = feature?.linkedModifiers
      ?.flatMap((instance) => instance.activation?.effects ?? [])
      .find((effect) => effect.kind === "cast_spell")
    expect(cast).toMatchObject({
      kind: "cast_spell",
      castSpellName: "Animate Dead",
      castSpellCastingTime: "action",
    })
    expect(cast?.castSpellWithoutSlot).toBeFalsy()
  })

  it("wires common Necromancer class features with shared modifiers", () => {
    const content = loadNecromancerFixture()
    expect(wired(content, "Ability Score Improvement", "Class: Necromancer")).toBe(true)
    expect(wired(content, "Epic Boon", "Class: Necromancer")).toBe(true)
  })
})

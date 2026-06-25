import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import { collectImportProposals } from "@/lib/import/import-proposals"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import {
  isSubclassSpellTableFeature,
  parseSubclassSpellTable,
} from "@/lib/import/subclass-spell-table"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  hasHomebrewImportFixtures,
  homebrewFixturePath,
} from "@/lib/import/__tests__/homebrew-fixture-path"

function loadFixture(name: string): ImportContent {
  const path = homebrewFixturePath(name)
  if (!path) throw new Error(`Missing homebrew fixture: ${name}`)
  return normalizeAiImportContent(JSON.parse(readFileSync(path, "utf8")))
}

function wired(
  content: ImportContent,
  featureName: string,
  sourceLabel: string,
): boolean {
  const review = collectImportModifierReview(enrichImportContentModifiers(content))
  return review.some(
    (row) =>
      row.featureName === featureName &&
      row.sourceLabel === sourceLabel &&
      row.status === "wired",
  )
}

describe.runIf(hasHomebrewImportFixtures)("Inventor / Witch homebrew import fixtures", () => {
  it("loads inventor-class.json core wiring", () => {
    const content = loadFixture("inventor-class.json")
    expect(wired(content, "Inventor Specialization", "Class: Inventor")).toBe(true)
    expect(wired(content, "Spellcasting", "Class: Inventor")).toBe(true)
    expect(wired(content, "Tool Expertise", "Class: Inventor")).toBe(true)
    expect(wired(content, "Specialization Upgrade", "Class: Inventor")).toBe(true)
    expect(wired(content, "Study of Magic", "Class: Inventor")).toBe(true)
  })

  it("loads inventor-subclasses.json with upgrades resource and choices", () => {
    const content = loadFixture("inventor-subclasses.json")
    const proposals = collectImportProposals(content)
    expect(proposals.classResources.some((r) => r.resourceKey === "upgrades")).toBe(true)
    expect(wired(content, "Inventor Specialization", "Class: Inventor")).toBe(true)
    expect(wired(content, "Golem Companion", "Subclass: Golemsmith (Inventor)")).toBe(true)
    expect(wired(content, "Golem Upgrade", "Subclass: Golemsmith (Inventor)")).toBe(true)
    expect(wired(content, "Essential Tools", "Subclass: Gadgetsmith (Inventor)")).toBe(true)
  })

  it("parses inventor-spell-list.json spell list stub", () => {
    const path = homebrewFixturePath("inventor-spell-list.json")
    if (!path) throw new Error("Missing homebrew fixture: inventor-spell-list.json")
    const raw = readFileSync(path, "utf8")
    const parsed = parseImportContentJson(raw)
    expect(parsed).not.toBeNull()
    expect(parsed!.classes?.[0]?.spell_list?.length).toBeGreaterThan(50)
    const merged = applyClassSpellListsToImport(parsed!)
    expect(merged.classes?.[0]?.spell_list).toBeUndefined()
  })

  it("parses witch subclass spell tables from updated fixture", () => {
    const content = loadFixture("witch-subclasses.json")
    const spellFeatures = (content.subclasses ?? []).flatMap((sc) =>
      (sc.features ?? [])
        .filter((f) => /spell/i.test(f.name))
        .map((f) => ({ subclass: sc.name, feature: f.name, description: f.description ?? "" })),
    )
    for (const row of spellFeatures) {
      if (row.feature.endsWith("Spells") && /<table/i.test(row.description)) {
        expect(isSubclassSpellTableFeature(row.feature, row.description), row.feature).toBe(true)
        expect(parseSubclassSpellTable(row.description)?.rows.length ?? 0, row.feature).toBeGreaterThan(0)
      }
    }
    expect(content.subclasses?.length).toBeGreaterThanOrEqual(9)
  })

  it("wires witch subclass resource features", () => {
    const content = loadFixture("witch-subclasses.json")
    expect(wired(content, "Elder Tongue", "Subclass: Green Magic (Witch)")).toBe(true)
    expect(wired(content, "Deathseeker", "Subclass: Blood Magic (Witch)")).toBe(true)
    expect(wired(content, "Arcane Bloodletting", "Subclass: Blood Magic (Witch)")).toBe(true)
    expect(wired(content, "Tasseography", "Subclass: Tea Magic (Witch)")).toBe(true)
  })
})

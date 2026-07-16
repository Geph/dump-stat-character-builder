import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { normalizeAiImportContent } from "@/lib/import/import-content-ai-schema"
import { collectImportProposals } from "@/lib/import/import-proposals"
import {
  isSubclassSpellTableFeature,
  parseSubclassSpellTable,
} from "@/lib/import/subclass-spell-table"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  hasHomebrewFixture,
  homebrewFixturePath,
} from "@/lib/import/__tests__/homebrew-fixture-path"

function loadFixture(name: string): ImportContent {
  const path = homebrewFixturePath(name)
  if (!path) throw new Error(`Missing homebrew fixture: ${name}`)
  return normalizeAiImportContent(JSON.parse(readFileSync(path, "utf8")))
}

function unwiredNames(content: ImportContent): string[] {
  const enriched = enrichImportContentModifiers(content)
  return collectImportModifierReview(enriched)
    .filter((row) => row.status === "unwired")
    .map((row) => `${row.sourceLabel ?? "?"} L${row.featureLevel ?? "?"} ${row.featureName}`)
}

describe("Witch / KibblesTasty Psion homebrew import fixtures", () => {
  it.runIf(hasHomebrewFixture("witch-class.json"))("loads witch-class.json with core features wired", () => {
    const content = loadFixture("witch-class.json")
    const unwired = unwiredNames(content)
    const proposals = collectImportProposals(content)
    expect(content.classes?.[0]?.name).toBe("Witch")
    expect(proposals.classResources.length).toBeGreaterThan(0)
    expect(proposals.classResources.some((r) => r.resourceKey === "hexes_known")).toBe(true)
    expect(unwired).not.toContain("Class: Witch L1 Spellcasting")
    expect(unwired).not.toContain("Class: Witch L1 Hexes")
    expect(unwired).not.toContain("Class: Witch L1 Witch's Curse")
    expect(unwired).not.toContain("Class: Witch L11 Grand Hex")
  })

  it.runIf(hasHomebrewFixture("witch-subclasses.json"))(
    "parses witch subclass spell tables when fixture is valid JSON",
    () => {
      const content = loadFixture("witch-subclasses.json")
      const spellFeatures = (content.subclasses ?? []).flatMap((sc) =>
        (sc.features ?? [])
          .filter((f) => /spell/i.test(f.name))
          .map((f) => ({ subclass: sc.name, feature: f.name, description: f.description ?? "" })),
      )
      for (const row of spellFeatures) {
        const detected = isSubclassSpellTableFeature(row.feature, row.description)
        const parsed = parseSubclassSpellTable(row.description)
        if (row.feature.endsWith("Spells") && /<table/i.test(row.description)) {
          expect(detected, row.feature).toBe(true)
          expect(parsed?.rows.length ?? 0, row.feature).toBeGreaterThan(0)
        }
      }
    },
  )

  it.runIf(hasHomebrewFixture("witch-subclasses.json"))(
    "wires common witch subclass features from fixture",
    () => {
      const content = loadFixture("witch-subclasses.json")
      const enriched = enrichImportContentModifiers(content)
      const review = collectImportModifierReview(enriched)
      const wired = (name: string, subclass: string, className = "Witch") =>
        review.some(
          (row) =>
            row.featureName === name &&
            row.sourceLabel === `Subclass: ${subclass} (${className})` &&
            row.status === "wired",
        )

      expect(wired("Elder Tongue", "Green Magic")).toBe(true)
      expect(wired("Deathseeker", "Blood Magic")).toBe(true)
      expect(wired("Arcane Bloodletting", "Blood Magic")).toBe(true)
      expect(wired("Martial Training", "Steel Magic")).toBe(true)
      expect(wired("Tasseography", "Tea Magic")).toBe(true)
    },
  )

  it.runIf(hasHomebrewFixture("witch-grand-hex-options.json"))(
    "loads witch-grand-hex-options with companion stat block",
    () => {
      const content = loadFixture("witch-grand-hex-options.json")
      const proposals = collectImportProposals(content)
      const companion = proposals.customAbilities.find((a) =>
        /abominable familiar creature/i.test(a.name),
      )
      expect(companion?.companionStatBlock).toBeTruthy()
      expect(proposals.classResources.some((r) => r.resourceKey === "alchemy_points")).toBe(true)
    },
  )

  it.runIf(hasHomebrewFixture("psion-class.json"))("loads psion-class.json resources", () => {
    const content = loadFixture("psion-class.json")
    const proposals = collectImportProposals(content)
    expect(proposals.classResources.some((r) => r.resourceKey === "psi_points")).toBe(true)
    expect(proposals.classResources.some((r) => r.resourceKey === "psi_limit")).toBe(true)
  })

  it.runIf(hasHomebrewFixture("psion-disciplines.json"))(
    "loads psion-disciplines as custom abilities",
    () => {
      const content = loadFixture("psion-disciplines.json")
      const proposals = collectImportProposals(content)
      expect(proposals.customAbilities.length).toBeGreaterThan(5)
    },
  )
})

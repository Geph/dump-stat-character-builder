import { describe, expect, it } from "vitest"
import { enrichCustomFeatRow } from "@/lib/compendium/enrich-custom-feats"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import type { ImportContent } from "@/lib/import/content-schema"
import { KIBBLES_FEAT_MODIFIER_PRESETS } from "@/lib/compendium/kibbles-feat-modifier-presets"

const KIBBLES_FEAT_NAMES = Object.keys(KIBBLES_FEAT_MODIFIER_PRESETS).filter(
  (name) => name !== "Innovators Upgrade", // alias of Innovator's Upgrade
)

describe("Kibbles feat name presets", () => {
  it("wires Expert Alchemist as fixed ASI + tool proficiency", () => {
    const row = enrichCustomFeatRow({
      name: "Expert Alchemist",
      source: "Kibbles' Compendium",
      description: "Increase your Intelligence or Wisdom score by 1.",
    })
    const chars = ((row.linked_modifiers ?? []) as { characteristics?: { type: string; mode?: string; allowedAbilities?: string[] }[] }[])
      .flatMap((inst) => inst.characteristics ?? [])
    const asi = chars.find((c) => c.type === "ability_scores")
    expect(asi).toMatchObject({ mode: "asi_pool", allowedAbilities: ["intelligence", "wisdom"] })
    expect(chars.some((c) => c.type === "tool_proficiencies")).toBe(true)
  })

  it("wires Psionic Adept as discipline pick + psi uses", () => {
    const row = enrichCustomFeatRow({
      name: "Psionic Adept",
      source: "Kibbles' Compendium",
      description: "You gain one psionic discipline.",
    })
    expect(row.isChoice).toBe(true)
    expect((row.choices as { optionsSource?: string })?.optionsSource).toBe("class_disciplines")
    const chars = ((row.linked_modifiers ?? []) as { characteristics?: { type: string }[] }[])
      .flatMap((inst) => inst.characteristics ?? [])
    expect(chars.some((c) => c.type === "uses")).toBe(true)
  })

  it("marks all Kibbles feat presets wired on import review", () => {
    const content = {
      feats: KIBBLES_FEAT_NAMES.map((name) => ({
        name,
        category: "General",
        description: `${name} rules text.`,
      })),
    } as unknown as ImportContent

    const enriched = enrichImportContentModifiers(content)
    const review = collectImportModifierReview(enriched)
    const unwired = review.filter((row) => row.status === "unwired").map((row) => row.featureName)
    expect(unwired).toEqual([])
  })
})

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeInvestigatorImportContent } from "@/lib/import/enrichment-presets/packs/investigator"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import type { Feature } from "@/lib/types"

const DIR =
  "/Users/geph/Library/CloudStorage/GoogleDrive-thejeffginger@gmail.com/My Drive/Code Projects/dump stat working files/import-json"

function load(name: string) {
  return parseImportContentJson(readFileSync(`${DIR}/${name}`, "utf8"))!
}

function enrich(name: string) {
  return enrichImportContentModifiers(applyClassSpellListsToImport(applyImportEnrichmentPresets(load(name))))
}

describe("Investigator Drive import wiring", () => {
  it("remaps finisher_dice to finisher and strips Trinkets picker", () => {
    const content = enrich("magehandpress-investigator-class")
    expect(content.class_resources?.some((r) => r.resource_key === "finisher_dice")).toBe(false)
    const finisher = content.class_resources?.find((r) => r.resource_key === "finisher")
    expect(finisher?.uses.type).toBe("special")
    expect(finisher?.uses.dieType).toBe("d8")

    const trinkets = content.classes?.[0]?.features?.find((f) => f.name === "Trinkets") as Feature | undefined
    expect(trinkets?.isChoice).toBeFalsy()
    expect(trinkets?.choices).toBeUndefined()
  })

  it("auto-grants Antiquarian trinkets from subclass Trinkets feature", () => {
    const content = enrich("magehandpress-investigator-class")
    const antiquarian = content.subclasses?.find((s) => s.name === "Antiquarian")
    const trinkets = antiquarian?.features?.find((f) => f.name === "Trinkets") as Feature | undefined
    const grant = trinkets?.linkedModifiers?.flatMap((m) => m.characteristics ?? []).find(
      (c) => c.type === "grant_custom_ability",
    ) as { abilityNames?: string[] } | undefined
    expect(grant?.abilityNames).toEqual(
      expect.arrayContaining(["Hateful Arrowhead", "Warped Prism", "Razortooth Bandages"]),
    )
  })

  it("wires Finisher and Rushed Incantation", () => {
    const content = enrich("magehandpress-investigator-class")
    const finisher = content.classes?.[0]?.features?.find((f) => f.name === "Finisher") as Feature | undefined
    expect(finisher?.linkedModifiers?.some((m) => m.characteristics?.some((c) => c.type === "on_hit_trigger"))).toBe(
      true,
    )
    const rushed = content.classes?.[0]?.features?.find((f) => f.name === "Rushed Incantation") as Feature | undefined
    expect(rushed?.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "rushed_incantation",
    })
  })

  it("sanitize alone remaps finisher_dice without full enrich", () => {
    const next = sanitizeInvestigatorImportContent(load("magehandpress-investigator-class"))
    expect(next.class_resources?.find((r) => r.resource_key === "finisher")).toBeTruthy()
  })
})

describe("Martyr Drive import wiring", () => {
  it("keeps spell_uses + max_spell_level and does not invent slots", () => {
    const content = enrich("magehandpress-martyr-class")
    expect(content.class_resources?.map((r) => r.resource_key).sort()).toEqual([
      "max_spell_level",
      "spell_uses",
    ])
    expect(content.classes?.[0]?.spellcasting).toBeUndefined()
    const spellcasting = content.classes?.[0]?.features?.find((f) => f.name === "Spellcasting") as Feature | undefined
    expect(spellcasting?.description).toMatch(/Hit Point Spellcasting/i)
    expect(spellcasting?.description).toMatch(/narrative/i)
  })

  it("wires Undying, Miraculous Healing, and Reprisal activations", () => {
    const content = enrich("magehandpress-martyr-class")
    const undying = content.classes?.[0]?.features?.find((f) => f.name === "Undying") as Feature | undefined
    expect(undying?.limitedUses).toMatchObject({ type: "fixed", fixedAmount: 1 })
    expect(undying?.activation?.onDropToZeroHp).toBe(true)

    const heal = content.classes?.[0]?.features?.find((f) => f.name === "Miraculous Healing") as Feature | undefined
    expect(heal?.activation?.bonusAction).toBe(true)

    const reprisal = content.classes?.[0]?.features?.find((f) => f.name === "Reprisal") as Feature | undefined
    expect(reprisal?.activation?.reaction).toBe(true)
  })

  it("keeps Armor of Faith as a picker", () => {
    const content = enrich("magehandpress-martyr-class")
    const armor = content.classes?.[0]?.features?.find((f) => f.name === "Armor of Faith") as Feature | undefined
    expect(armor?.choices?.options?.length).toBeGreaterThanOrEqual(2)
  })
})

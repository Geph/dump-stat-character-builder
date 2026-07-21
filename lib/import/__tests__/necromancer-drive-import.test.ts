import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeNecromancerImportContent } from "@/lib/import/enrichment-presets/packs/necromancer"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import type { Feature } from "@/lib/types"

const PATH =
  "/Users/geph/Library/CloudStorage/GoogleDrive-thejeffginger@gmail.com/My Drive/Code Projects/dump stat working files/import-json/magehandpress-necromancer-class"

function load() {
  return parseImportContentJson(readFileSync(PATH, "utf8"))!
}

function enrich() {
  return enrichImportContentModifiers(applyClassSpellListsToImport(applyImportEnrichmentPresets(load())))
}

describe("Necromancer Drive import wiring", () => {
  it("keeps charnel_touch as at_level multiply_level and thrall caps as special", () => {
    const content = enrich()
    const charnel = content.class_resources?.find((r) => r.resource_key === "charnel_touch")
    expect(charnel?.uses).toMatchObject({
      type: "at_level",
      atLevelMode: "multiply_level",
      atLevelTable: [{ level: 1, count: 5 }],
    })
    expect(content.class_resources?.find((r) => r.resource_key === "thralls")?.uses.type).toBe("special")
    expect(content.class_resources?.find((r) => r.resource_key === "thrall_cr_total")?.uses.type).toBe(
      "special",
    )
  })

  it("sanitizes bare multiply_level charnel_touch shapes", () => {
    const next = sanitizeNecromancerImportContent({
      classes: [{ name: "Necromancer", description: "", hit_die: 6, primary_ability: ["Intelligence"], features: [] }],
      class_resources: [
        {
          class_name: "Necromancer",
          resource_key: "charnel_touch",
          name: "Charnel Touch",
          uses: { type: "multiply_level", multiplier: 5, recharges: [{ rest: "long_rest" }] } as never,
        },
      ],
    })
    expect(next.class_resources?.[0]?.uses).toMatchObject({
      type: "at_level",
      atLevelMode: "multiply_level",
      atLevelTable: [{ level: 1, count: 5 }],
    })
  })

  it("wires Thralls grant_creature without class_upgrades picker", () => {
    const content = enrich()
    const thralls = content.classes?.[0]?.features?.find((f) => f.name === "Thralls") as Feature | undefined
    expect(thralls?.choices).toBeUndefined()
    expect(thralls?.isChoice).toBeFalsy()
    const grant = thralls?.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "grant_creature") as { choiceOptions?: string[] } | undefined
    expect(grant?.choiceOptions).toEqual(
      expect.arrayContaining(["Skeleton", "Spirit", "Zombie", "Deadnaught"]),
    )
  })

  it("wires Charnel Touch, Dark Arcana, Undying Servitude, and Lichdom immunities", () => {
    const content = enrich()
    const charnel = content.classes?.[0]?.features?.find((f) => f.name === "Charnel Touch") as Feature | undefined
    expect(charnel?.activation?.action).toBe(true)

    const dark = content.classes?.[0]?.features?.find((f) => f.name === "Dark Arcana") as Feature | undefined
    expect(dark?.activation?.bonusAction).toBe(true)

    const undying = content.classes?.[0]?.features?.find((f) => f.name === "Undying Servitude") as Feature | undefined
    expect(undying?.activation?.reaction).toBe(true)

    const lichdom = content.classes?.[0]?.features?.find((f) => f.name === "Lichdom") as Feature | undefined
    const types = lichdom?.linkedModifiers?.flatMap((m) => (m.characteristics ?? []).map((c) => c.type)) ?? []
    expect(types).toContain("damage_immunity")
    expect(types).toContain("vision")
  })

  it("keeps Deadnaught as companion among thrall creatures", () => {
    const content = enrich()
    const dead = content.creatures?.find((c) => c.name === "Deadnaught") as { category?: string } | undefined
    expect(dead?.category).toBe("companion")
    expect(content.creatures?.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        "Skeleton",
        "Spirit",
        "Zombie",
        "Bone Beast",
        "Gorger",
        "Deadnaught",
        "Bloodlurk",
      ]),
    )
  })

  it("wires Lazarus Bolt charnel alternate refresh", () => {
    const content = enrich()
    const reanimator = content.subclasses?.find((s) => s.name === "Reanimator")
    const bolt = reanimator?.features?.find((f) => f.name === "Lazarus Bolt") as Feature | undefined
    expect(bolt?.limitedUses).toMatchObject({
      type: "fixed",
      fixedAmount: 1,
      restoreByResource: { resourceKey: "charnel_touch", resourceAmount: 20, restores: 1 },
    })
  })
})

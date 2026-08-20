import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import type { ImportContent } from "@/lib/import/content-schema"

function loadSeed(relativePath: string): ImportContent {
  return JSON.parse(
    readFileSync(join(process.cwd(), "lib", "seed-packs", relativePath), "utf8"),
  ) as ImportContent
}

function resourceMap(content: ImportContent) {
  return new Map((content.class_resources ?? []).map((resource) => [resource.resource_key, resource]))
}

describe("non-SRD seed class resources", () => {
  it.each([
    [
      "mage-hand-press/magehandpress-alchemist-class.json",
      ["reagents", "prime_bomb", "bomb_formulas_known", "discoveries_known"],
    ],
    [
      "mage-hand-press/magehandpress-craftsman-class.json",
      ["masterwork_bonus"],
    ],
    [
      "mage-hand-press/magehandpress-vagabond-class.json",
      [
        "battle_dice",
        "mage_brand_max_slot_level",
        "grudge_battle_die",
        "hound_battle_dice",
      ],
    ],
    [
      "mage-hand-press/magehandpress-warmage-class.json",
      ["tricks_known", "cantrip_bonus_dice", "battle_dice", "arcane_surge"],
    ],
  ])("%s contains enrichment-linked resource rows", (path, expectedKeys) => {
    const resources = resourceMap(loadSeed(path))
    expect([...resources.keys()]).toEqual(expect.arrayContaining(expectedKeys))
  })

  it("keeps Reagents an Alchemist-only pool", () => {
    const alchemist = resourceMap(
      loadSeed("mage-hand-press/magehandpress-alchemist-class.json"),
    ).get("reagents")
    // Reagents (1 per short rest) stacks with Reagent Synthesis (INT mod, once per long rest).
    expect(alchemist?.uses).toMatchObject({
      type: "at_level",
      recharges: [
        { rest: "short_rest", amount: 1 },
        {
          rest: "short_rest",
          amountFormula: "ability_modifier",
          amountFormulaAbility: "INT",
          maxPerLongRest: 1,
        },
        { rest: "long_rest" },
      ],
    })

    // The Inventor's "Alchemical Reagents Pouch" is a gating item, not a spendable pool, so it
    // must not carry the Alchemist's reagents key (or any reagents pool at all).
    const inventorKeys = [...resourceMap(loadSeed("kibbles-tasty/kibbles-inventor-class.json")).keys()]
    expect(inventorKeys).not.toContain("reagents")
    expect(inventorKeys.filter((key) => key.includes("reagent"))).toEqual([])
  })

  it("keeps subclass ownership on every newly reconciled resource", () => {
    const checks = [
      ["mage-hand-press/magehandpress-vagabond-class.json", "mage_brand_max_slot_level", "Mage Brand"],
      ["mage-hand-press/magehandpress-vagabond-class.json", "grudge_battle_die", "Rōnin"],
      ["mage-hand-press/magehandpress-vagabond-class.json", "hound_battle_dice", "Houndmaster"],
      ["mage-hand-press/magehandpress-warmage-class.json", "battle_dice", "House of Kings"],
    ] as const

    for (const [path, key, subclassName] of checks) {
      expect(resourceMap(loadSeed(path)).get(key)?.subclass_name).toBe(subclassName)
    }
  })

  it("does not encode a recharging pool as special", () => {
    const vagabond = resourceMap(
      loadSeed("mage-hand-press/magehandpress-vagabond-class.json"),
    )
    expect(vagabond.get("hound_battle_dice")?.uses).toMatchObject({
      type: "at_level",
      recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
    })
  })

  it("ships Momentum as Acrobat combat state rather than a long-rest pool", () => {
    const dancer = resourceMap(loadSeed("mage-hand-press/magehandpress-dancer-class.json"))
    expect(dancer.get("momentum")).toMatchObject({
      subclass_name: "Acrobat",
      uses: {
        type: "at_level",
        atLevelTable: [
          { level: 3, count: 1 },
          { level: 14, count: 3 },
        ],
      },
    })
    expect(dancer.get("momentum")?.uses.recharges).toBeUndefined()
  })
})

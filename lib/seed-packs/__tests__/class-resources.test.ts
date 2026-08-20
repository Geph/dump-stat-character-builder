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
      ["reagents", "prime_bomb", "bomb_formulas_known", "discoveries_known", "spell_dynamos"],
    ],
    [
      "mage-hand-press/magehandpress-craftsman-class.json",
      ["masterwork_bonus", "charge_points"],
    ],
    [
      "mage-hand-press/magehandpress-vagabond-class.json",
      [
        "battle_dice",
        "mage_brand_max_slot_level",
        "grudge_battle_die",
        "adrenaline_battle_die",
        "hound_battle_dice",
      ],
    ],
    [
      "mage-hand-press/magehandpress-warmage-class.json",
      ["tricks_known", "cantrip_bonus_dice", "battle_dice", "dice_of_fate", "arcane_surge"],
    ],
  ])("%s contains enrichment-linked resource rows", (path, expectedKeys) => {
    const resources = resourceMap(loadSeed(path))
    expect([...resources.keys()]).toEqual(expect.arrayContaining(expectedKeys))
  })

  it("keeps subclass ownership on every newly reconciled resource", () => {
    const checks = [
      ["mage-hand-press/magehandpress-alchemist-class.json", "spell_dynamos", "Dynamo Engineer"],
      ["mage-hand-press/magehandpress-craftsman-class.json", "charge_points", "Thunderlords' Guild"],
      [
        "mage-hand-press/magehandpress-vagabond-class.json",
        "adrenaline_battle_die",
        "Adrenaline Junkie",
      ],
      ["mage-hand-press/magehandpress-warmage-class.json", "dice_of_fate", "House of Dice"],
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

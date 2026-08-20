import { describe, expect, it } from "vitest"
import {
  damerauLevenshteinDistance,
  normalizeSearchText,
  rankSearchResults,
  searchItems,
} from "@/lib/search/ranked-search"
import { searchCompendiumRows } from "@/lib/search/compendium-search"

const rows = [
  { id: "bolt", name: "Fire Bolt", description: "A ranged cantrip", school: "Evocation" },
  { id: "ball", name: "Fireball", description: "A bright streak", school: "Evocation" },
  { id: "shield", name: "Shield", description: "Protected from incoming fire", school: "Abjuration" },
]

describe("ranked search", () => {
  it("normalizes punctuation, whitespace, apostrophes, ampersands, and diacritics", () => {
    expect(normalizeSearchText("  Café\u2019s  B&B  ")).toBe("cafe's b and b")
  })

  it("ranks exact and prefix name matches above metadata matches", () => {
    const results = rankSearchResults(rows, "fire", {
      name: (item) => item.name,
      fields: [{ name: "description", value: (item) => item.description }],
    })
    expect(results.map((result) => result.item.id)).toEqual(["bolt", "ball", "shield"])
    expect(results[0].kind).toBe("prefix")
    expect(results[2].kind).toBe("metadata")
  })

  it("matches query tokens across structured fields", () => {
    const spells = [
      { name: "Animate Dead", level: 3, school: "Necromancy", classes: ["Wizard"] },
      { name: "Fireball", level: 3, school: "Evocation", classes: ["Wizard"] },
    ]
    expect(searchCompendiumRows(spells, "level 3 necromancy", "spells")).toEqual([spells[0]])
  })

  it("uses spell aliases in browse search", () => {
    const spells = [{ name: "Befuddlement", level: 8, school: "Enchantment" }]
    expect(searchCompendiumRows(spells, "feeblemind", "spells")).toEqual(spells)
  })

  it("matches common rules abbreviations and equivalent terms", () => {
    const rules = [
      { name: "Ability Score Improvement", description: "Increase an ability score." },
      { name: "Sentinel", description: "Make an opportunity attack." },
    ]
    expect(searchItems(rules, "ASI", { name: (item) => item.name })[0]).toBe(rules[0])
    expect(
      searchItems(rules, "attack of opportunity", {
        name: (item) => item.name,
        fields: [{ name: "description", value: (item) => item.description }],
      }),
    ).toContain(rules[1])
  })

  it("falls back to typo-tolerant name matching", () => {
    expect(searchItems(rows, "fire blt", { name: (item) => item.name })[0]).toBe(rows[0])
    expect(searchItems(rows, "firbal", { name: (item) => item.name })[0]).toBe(rows[1])
    expect(damerauLevenshteinDistance("step", "stpe")).toBe(1)
  })

  it("does not fuzzy-match very short queries", () => {
    expect(searchItems(rows, "fr", { name: (item) => item.name })).toEqual([])
  })

  it("keeps original order for an empty query", () => {
    expect(searchItems(rows, "  ", { name: (item) => item.name })).toEqual(rows)
  })
})


import { describe, expect, it } from "vitest"
import {
  filterModifierCatalogEntries,
  modifierCatalogSearchScore,
} from "@/lib/compendium/modifier-catalog-search"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { buildDefaultModifierCatalog, normalizeModifierCatalog } from "@/lib/compendium/modifier-catalog"

function entry(name: string, summary?: string): ModifierCatalogEntry {
  return {
    id: `cat_${name.replace(/\s+/g, "_")}`,
    name,
    summary: summary ?? "",
    group: "Spells & magic",
    characteristics: [],
  }
}

describe("modifierCatalogSearchScore", () => {
  it("ranks title matches above summary-only matches for Spell", () => {
    const spellSave = entry("Spell Save DC Bonus", "Adds to save DC")
    const onCast = entry("On Cast Spell Trigger", "Fires when you cast a spell")
    expect(modifierCatalogSearchScore(spellSave, "spell")).toBeGreaterThan(
      modifierCatalogSearchScore(onCast, "spell"),
    )
  })

  it("handles catalog entries with missing group", () => {
    const partial = { id: "cat_partial", name: "Craftable Items Known" } as unknown as ModifierCatalogEntry
    expect(() => filterModifierCatalogEntries([partial], "craft")).not.toThrow()
    expect(normalizeModifierCatalog([partial])[0].group).toBe("Other")
  })

  it("assigns groups for every default catalog entry", () => {
    const missing = buildDefaultModifierCatalog().filter((entry) => !entry.group)
    expect(missing.map((entry) => entry.id)).toEqual([])
  })
})

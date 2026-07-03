import { describe, expect, it } from "vitest"
import { modifierCatalogSearchScore } from "@/lib/compendium/modifier-catalog-search"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"

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
})

import { describe, expect, it } from "vitest"
import { getSpellSlotTable } from "@/lib/compendium/spell-slots"

describe("getSpellSlotTable", () => {
  it("returns null for point-pool spellcasting classes", () => {
    expect(
      getSpellSlotTable("Alternate Sorcerer", 5, {
        ability: "Charisma",
        point_pool: {
          resource_key: "alternate_sorcerer_sorcery_points",
          cost_by_level: { 1: 2, 2: 3 },
          replaces_spell_slots: true,
        },
      }),
    ).toBeNull()
  })

  it("still returns a table for standard full casters", () => {
    const table = getSpellSlotTable("Wizard", 5, { ability: "Intelligence", progression: "full" })
    expect(table?.type).toBe("full")
    expect(table?.slotsByLevel[0]).toBeGreaterThan(0)
  })
})

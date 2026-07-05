import { describe, expect, it } from "vitest"
import { normalizeBackgroundRow } from "@/lib/compendium/normalize-backgrounds"
import { BackgroundImportSchema } from "@/lib/import/content-schema"
import { getBackgroundStartingEquipmentGroups, getBackgroundStartingGold } from "@/lib/compendium/background-equipment"
import { normalizeBackgroundProficiencies } from "@/lib/compendium/background-proficiencies"
import type { Background } from "@/lib/types"

describe("legacy background import", () => {
  it("accepts null ability_bonuses and feat_granted in the import schema", () => {
    const parsed = BackgroundImportSchema.parse({
      name: "Apothecary",
      description: "An herbalist.",
      skill_proficiencies: ["Medicine", "Nature"],
      feat_granted: null,
      ability_bonuses: null,
      feature: { name: "Herblore", description: "You know reagents." },
    })
    expect(parsed.ability_bonuses).toBeNull()
    expect(parsed.feat_granted).toBeNull()
  })

  it("round-trips Tinker language choice, equipment, and gold through normalize", () => {
    const row = normalizeBackgroundRow({
      name: "Tinker",
      description: "You build things.",
      skill_proficiencies: ["Investigation", "Persuasion"],
      tool_proficiencies: ["Tinker's tools"],
      feat_granted: null,
      ability_bonuses: null,
      proficiencies: { languages: ["One language of your choice"] },
      starting_gold: 10,
      starting_equipment: [
        { name: "Tinker's tools", quantity: 1 },
        { name: "Pack horse", quantity: 1 },
      ],
      feature: { name: "Tinker", description: "You can repair devices." },
    })

    expect(row.ability_bonuses).toBeNull()
    expect(row.feat_granted).toBeNull()
    expect(row.proficiencies).toEqual({ languages: ["One language of your choice"] })
    expect(row.starting_gold).toBe(10)

    const background = row as unknown as Background
    const prof = normalizeBackgroundProficiencies(background.proficiencies, background.tool_proficiencies)
    expect(prof.languages).toEqual(["One language of your choice"])
    expect(prof.tools).toContain("Tinker's tools")

    const equipmentGroups = getBackgroundStartingEquipmentGroups(background)
    expect(equipmentGroups[0]?.options[0]?.items.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Tinker's tools", "Pack horse"]),
    )
    expect(getBackgroundStartingGold(background)).toBe(10)
  })

  it("preserves Apothecary potion of healing in equipment", () => {
    const row = normalizeBackgroundRow({
      name: "Apothecary",
      description: "An herbalist.",
      skill_proficiencies: ["Medicine", "Nature"],
      feat_granted: null,
      ability_bonuses: null,
      starting_equipment: [{ name: "Potion of healing", quantity: 1 }],
      feature: { name: "Herblore", description: "You know reagents." },
    })

    const background = row as unknown as Background
    const items = getBackgroundStartingEquipmentGroups(background)[0]?.options[0]?.items ?? []
    expect(items.some((item) => /potion of healing/i.test(item.name))).toBe(true)
  })

  it("does not infer ability bonuses from description when ability_bonuses is explicitly null", () => {
    const row = normalizeBackgroundRow({
      name: "Apothecary",
      description: "Your Intelligence and Wisdom guide your craft.",
      ability_bonuses: null,
      feat_granted: null,
    })
    expect(row.ability_bonuses).toBeNull()
  })
})

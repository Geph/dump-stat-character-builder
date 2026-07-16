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

  it("remaps LLM-hallucinated desktop ability keys to dexterity on normalize", () => {
    const row = normalizeBackgroundRow({
      name: "Guide",
      description: "Outdoors.",
      skill_proficiencies: ["Stealth", "Survival"],
      feat_granted: "Magic Initiate (Druid)",
      ability_bonuses: { desktop: 0, constitution: 0, wisdom: 0 },
    })
    expect(row.ability_bonuses).toEqual({
      dexterity: 0,
      constitution: 0,
      wisdom: 0,
    })
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
    // Choice phrases move onto feature linkedModifiers; arrays keep only fixed grants.
    expect(row.proficiencies).toEqual({ languages: [], tools: ["Tinker's tools"] })
    expect(row.starting_gold).toBe(10)

    const background = row as unknown as Background
    const prof = normalizeBackgroundProficiencies(background.proficiencies, background.tool_proficiencies)
    expect(prof.languages).toEqual([])
    expect(prof.tools).toContain("Tinker's tools")
    const langMods = (
      (background.feature?.linkedModifiers ?? []) as {
        characteristics?: { type: string; choiceCount?: number }[]
      }[]
    ).flatMap((m) => m.characteristics ?? [])
    expect(langMods.some((c) => c.type === "languages" && c.choiceCount === 1)).toBe(true)

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

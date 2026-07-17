import { describe, expect, it } from "vitest"
import { normalizeBackgroundRow } from "@/lib/compendium/normalize-backgrounds"
import { isLegacyBackground } from "@/lib/compendium/background-origin-feat"
import { getBackgroundAbilityGrant } from "@/lib/builder/background-asi"
import { getBackgroundStartingEquipmentGroups, getBackgroundStartingGold } from "@/lib/compendium/background-equipment"
import type { Background } from "@/lib/types"

describe("kibbles crafting backgrounds wiring", () => {
  it("treats Apothecary as legacy with free ASI and Origin feat", () => {
    const row = normalizeBackgroundRow({
      name: "Apothecary",
      description: "Mixer of potions.",
      skill_proficiencies: ["Medicine", "Nature"],
      tool_proficiencies: ["Alchemist's supplies", "herbalism kit"],
      feat_granted: null,
      ability_bonuses: null,
      starting_equipment: [{ name: "Potion of Healing", quantity: 1 }],
      feature: { name: "Herblore", description: "Reagents." },
    })
    const bg = row as unknown as Background
    expect(bg.ability_bonuses).toBeNull()
    expect(bg.feat_granted).toBeNull()
    expect(isLegacyBackground(bg)).toBe(true)
    expect(getBackgroundAbilityGrant(bg).needsChoice).toBe(true)
  })

  it("keeps Engineer pouch gold and Blueprints feature", () => {
    const row = normalizeBackgroundRow({
      name: "Engineer",
      description: "Practical designs.",
      skill_proficiencies: ["Investigation", "Nature"],
      tool_proficiencies: ["Carpenter's tools", "mason's tools"],
      feat_granted: null,
      ability_bonuses: null,
      starting_gold: 10,
      starting_equipment: [
        { name: "Bottle of black ink", quantity: 1 },
        { name: "Belt pouch", quantity: 1 },
      ],
      feature: { name: "Blueprints", description: "You can plan constructions." },
    })
    const bg = row as unknown as Background
    expect(isLegacyBackground(bg)).toBe(true)
    expect(getBackgroundStartingGold(bg)).toBe(10)
    expect(bg.feature?.name).toBe("Blueprints")
  })

  it("keeps Tinker legacy after language choice wiring", () => {
    const row = normalizeBackgroundRow({
      name: "Tinker",
      description: "Wanderer.",
      skill_proficiencies: ["Insight", "Nature"],
      tool_proficiencies: ["Tinker's tools"],
      feat_granted: null,
      ability_bonuses: null,
      proficiencies: { languages: ["One of your choice"] },
      starting_equipment: [
        { name: "Tinker's tools", quantity: 1 },
        { name: "Pack horse", quantity: 1 },
      ],
      feature: { name: "Know-How", description: "Fix things." },
    })
    const bg = row as unknown as Background
    const langs = (bg.feature?.linkedModifiers ?? []).flatMap((m) => m.characteristics ?? [])
    expect(langs.some((c) => c.type === "languages" && c.choiceCount === 1)).toBe(true)
    expect(isLegacyBackground(bg)).toBe(true)
    expect(getBackgroundAbilityGrant(bg).needsChoice).toBe(true)
    expect(
      getBackgroundStartingEquipmentGroups(bg)[0]?.options[0]?.items.map((item) => item.name),
    ).toEqual(expect.arrayContaining(["Tinker's tools", "Pack horse"]))
  })
})

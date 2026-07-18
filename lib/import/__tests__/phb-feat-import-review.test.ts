import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { featHasNamePreset } from "@/lib/compendium/apply-feat-name-preset"

/** Representative 2024 PHB Origin / General / Fighting Style names from the user's import. */
const PHB_FEAT_NAMES = [
  "Alert",
  "Crafter",
  "Healer",
  "Lucky",
  "Magic Initiate",
  "Musician",
  "Savage Attacker",
  "Skilled",
  "Tavern Brawler",
  "Tough",
  "Ability Score Improvement",
  "Actor",
  "Athlete",
  "Charger",
  "Chef",
  "Crossbow Expert",
  "Crusher",
  "Defensive Duelist",
  "Dual Wielder",
  "Durable",
  "Elemental Adept",
  "Fey Touched",
  "Grappler",
  "Great Weapon Master",
  "Heavily Armored",
  "Heavy Armor Master",
  "Inspiring Leader",
  "Keen Mind",
  "Lightly Armored",
  "Mage Slayer",
  "Martial Weapon Training",
  "Medium Armor Master",
  "Moderately Armored",
  "Mounted Combatant",
  "Observant",
  "Piercer",
  "Poisoner",
  "Polearm Master",
  "Resilient",
  "Ritual Caster",
  "Sentinel",
  "Shadow Touched",
  "Sharpshooter",
  "Shield Master",
  "Skill Expert",
  "Skulker",
  "Slasher",
  "Speedy",
  "Spell Sniper",
  "Telekinetic",
  "Telepathic",
  "War Caster",
  "Weapon Master",
  "Archery",
  "Blind Fighting",
  "Defense",
  "Dueling",
  "Great Weapon Fighting",
  "Interception",
  "Protection",
  "Thrown Weapon Fighting",
  "Two-Weapon Fighting",
  "Unarmed Fighting",
] as const

describe("PHB feat import review wiring", () => {
  it("marks known name-preset feats as wired after import enrichment", () => {
    const missingPresets = PHB_FEAT_NAMES.filter((name) => !featHasNamePreset(name))
    expect(missingPresets).toEqual([])

    const content = enrichImportContentModifiers({
      feats: PHB_FEAT_NAMES.map((name) => ({
        name,
        description: `${name} description.`,
        category: "General",
      })),
    })

    const review = collectImportModifierReview(content)
    const featRows = review.filter((row) => row.sourceLabel.startsWith("Feat:"))
    const unwired = featRows.filter((row) => row.status === "unwired").map((row) => row.featureName)

    expect(unwired).toEqual([])
    expect(featRows.filter((row) => row.status === "wired").length).toBe(PHB_FEAT_NAMES.length)
  })
})

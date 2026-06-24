import { describe, expect, it } from "vitest"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierPreviews } from "@/lib/import/import-modifier-previews"
import type { ImportContent } from "@/lib/import/content-schema"

const alternateFighterFeatures = [
  {
    level: 5,
    name: "Extra Attack",
    description:
      "Beginning at 5th level, you can attack twice, instead of once, whenever you take the Attack action on your turn.",
  },
  {
    level: 1,
    name: "Archery",
    description:
      "You gain a +2 bonus to attack rolls with ranged weapons, and your attacks with ranged weapons ignore half-cover.",
  },
  {
    level: 1,
    name: "Classical Swordplay",
    description:
      "While wielding a single finesse weapon, no shield, and not wearing heavy armor, you gain a +2 bonus to attack rolls with that weapon and a +1 bonus to your Armor Class.",
  },
  {
    level: 1,
    name: "Defensive Fighting",
    description:
      "When you are wearing medium armor, heavy armor, or a shield you gain a +1 bonus to your Armor Class.",
  },
  {
    level: 3,
    name: "Tactical Reposition",
    description:
      "Whenever you use your Second Wind, you gain the benefits of the Disengage action and your speed increases by 10 feet until the end of your current turn.",
  },
  {
    level: 10,
    name: "Inscrutable Mind",
    description:
      "You gain resistance to psychic damage, and whenever you are forced to make an Intelligence, Wisdom, or Charisma saving throw you gain a bonus to the roll equal to your Exploit Die.",
  },
  {
    level: 3,
    name: "Combat Theorist",
    description: "You gain proficiency in History.",
  },
  {
    level: 6,
    name: "Action Surge",
    description:
      "Once during your turn, you can choose to take one additional action. After you do so, you must finish a short or long rest before you can use this feature again.",
  },
] as const

describe("Alternate Fighter homebrew detection", () => {
  it("wires key class and archetype mechanics from description text", () => {
    const content: ImportContent = {
      classes: [
        {
          name: "Alternate Fighter",
          description: null,
          hit_die: 10,
          primary_ability: ["Strength", "Dexterity"],
          features: alternateFighterFeatures.map((feature) => ({ ...feature })),
        },
      ],
      feats: [
        {
          name: "Archery",
          description: alternateFighterFeatures[1].description,
          prerequisite: "Dexterity of 13 or higher",
          category: "Fighting Style",
        },
        {
          name: "Defensive Fighting",
          description: alternateFighterFeatures[3].description,
          prerequisite: null,
          category: "Fighting Style",
        },
      ],
    }

    const enriched = enrichImportContentModifiers(content)
    const previews = collectImportModifierPreviews(enriched)

    expect(previews.some((entry) => entry.summary.includes("attack"))).toBe(true)
    expect(previews.some((entry) => entry.summary.includes("ac"))).toBe(true)
    expect(previews.some((entry) => entry.summary.includes("speed"))).toBe(true)
    expect(previews.some((entry) => entry.summary.includes("damage resistance"))).toBe(true)
    expect(previews.some((entry) => entry.summary.includes("skills"))).toBe(true)
    expect(previews.some((entry) => entry.ruleId.startsWith("uses."))).toBe(true)
    expect(previews.some((entry) => entry.ruleId === "check.bonus.resource_die")).toBe(true)
  })
})

describe("SRD preset fall-through detection", () => {
  it("supplements unmatched SRD features from description text", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Fighter", {
      level: 99,
      name: "Homebrew Probe Feature",
      description: "You gain proficiency in Stealth and Perception.",
    })

    expect(enriched.linkedModifiers?.length).toBeGreaterThan(0)
    expect(enriched.modifierRefs).toContain("cat_char_skills")
  })
})

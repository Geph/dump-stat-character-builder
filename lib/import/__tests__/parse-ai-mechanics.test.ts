import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import {
  collectImportModifierPreviews,
  removeImportModifierPreview,
} from "@/lib/import/import-modifier-previews"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"
import { sanitizeImportContentForPersist } from "@/lib/import/sanitize-import-content"
import type { ImportContent } from "@/lib/import/content-schema"

describe("aiMechanicsToDetections", () => {
  it("builds skill proficiency from AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [{ kind: "skills", skills: ["Stealth"], sourcePhrase: "You gain proficiency in Stealth." }],
      {
        contentKind: "class_feature",
        sourceName: "Rogue",
        featureName: "Skilled",
      },
    )
    expect(detections).toHaveLength(1)
    expect(detections[0]?.ruleId).toBe("ai.skills")
    expect(detections[0]?.instance.catalogRefId).toBe("cat_char_skills")
  })

  it("drops invalid AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [{ kind: "ac" }],
      { contentKind: "feat", featureName: "Bad AC" },
    )
    expect(detections).toEqual([])
  })

  it("builds spellcasting ability from AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "spellcasting_ability",
          spellcastingAbility: "intelligence",
          sourcePhrase: "Intelligence is your spellcasting ability for these spells.",
        },
      ],
      { contentKind: "feat", featureName: "Rimekin" },
    )
    expect(detections).toHaveLength(1)
    expect(detections[0]?.ruleId).toBe("ai.spellcasting_ability")
    expect(detections[0]?.instance.characteristics?.[0]?.type).toBe("spellcasting_ability")
  })

  it("builds creature-type damage from AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "damage_roll_modifiers",
          bonusDice: "2d10",
          damageType: "Radiant",
          targetCreatureTypes: ["Aberration"],
          sourcePhrase:
            "when you hit an Aberration with this weapon, the Aberration takes an extra 2d10 Radiant damage",
        },
      ],
      {
        contentKind: "class_feature",
        sourceName: "Item",
        featureName: "Shaarat'doovol",
      },
    )
    expect(detections).toHaveLength(1)
    expect(detections[0]?.ruleId).toBe("ai.damage.creature_type")
    const mod = detections[0]?.instance.characteristics?.[0]
    expect(mod?.type).toBe("damage_roll_modifiers")
    if (mod?.type === "damage_roll_modifiers") {
      expect(mod.entries[0]?.onlyVsCreatureTypes).toEqual(["Aberration"])
    }
  })

  it("wires requiresSheetToggle on damage modifiers from AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "damage_roll_modifiers",
          bonusDice: "2d6",
          damageType: "Radiant",
          requiresSheetToggle: "magic_item:abc:unyielding",
          sourcePhrase: "while the item grants you benefits",
        },
      ],
      {
        contentKind: "class_feature",
        sourceName: "Item",
        featureName: "Unyielding Duty",
      },
    )
    expect(detections).toHaveLength(1)
    const mod = detections[0]?.instance.characteristics?.[0]
    expect(mod?.requiresSheetToggle).toBe("magic_item:abc:unyielding")
  })
})

describe("import modifier review helpers", () => {
  const content = {
    classes: [
      {
        name: "Skirmisher",
        description: null,
        hit_die: 8,
        primary_ability: ["Dexterity"],
        features: [
          {
            level: 1,
            name: "Fleet Footwork",
            description: "Your walking speed increases by 10 feet.",
          },
        ],
      },
    ],
  }

  it("collects previews and removes a modifier before persist", () => {
    const enriched = enrichImportContentModifiers(content)
    const previews = collectImportModifierPreviews(enriched)
    expect(previews.length).toBeGreaterThan(0)

    const trimmed = removeImportModifierPreview(enriched, previews[0]!.id)
    expect(collectImportModifierPreviews(trimmed)).toHaveLength(previews.length - 1)

    const sanitized = sanitizeImportContentForPersist(trimmed)
    const feature = sanitized.classes?.[0]?.features?.[0] as Record<string, unknown>
    expect(feature.importModifierMeta).toBeUndefined()
    expect(feature.mechanics).toBeUndefined()
  })

  it("merges AI mechanics with detector output without duplicate skills", () => {
    const merged = enrichImportContentModifiers({
      feats: [
        {
          name: "Nimble",
          description: "You gain proficiency in Stealth.",
          prerequisite: null,
          mechanics: [{ kind: "skills", skills: ["Stealth"], sourcePhrase: "AI skill grant" }],
        },
      ],
    })
    const previews = collectImportModifierPreviews(merged)
    const skillPreviews = previews.filter((entry) => entry.summary.includes("skills"))
    expect(skillPreviews.length).toBeLessThanOrEqual(1)
  })
})

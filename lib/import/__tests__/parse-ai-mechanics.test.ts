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

  it("wires a fixed-amount, on-activation, self-target temporary_hit_points mechanic", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "temporary_hit_points",
          amount: 5,
          sourcePhrase: "you gain 5 temporary hit points",
        },
      ],
      { contentKind: "class_feature", sourceName: "Test Class", featureName: "Bolstering Strike" },
    )
    expect(detections).toHaveLength(1)
    expect(detections[0]?.ruleId).toBe("ai.temporary_hit_points")
    expect(detections[0]?.instance.catalogRefId).toBe("cat_fx_grant_temp_hp")
    const effect = detections[0]?.instance.activation?.effects?.[0]
    expect(effect?.kind).toBe("grant_temp_hp")
    expect(effect?.healMode).toBe("fixed")
    expect(effect?.healFixed).toBe(5)
  })

  it("wires amountDice and amountScaling variants of temporary_hit_points", () => {
    const dice = aiMechanicsToDetections(
      [{ kind: "temporary_hit_points", amountDice: "2d6" }],
      { contentKind: "class_feature", featureName: "Dice THP" },
    )
    const diceEffect = dice[0]?.instance.activation?.effects?.[0]
    expect(diceEffect?.healMode).toBe("dice")
    expect(diceEffect?.healDiceCount).toBe(2)
    expect(diceEffect?.healDieType).toBe("d6")

    const byLevel = aiMechanicsToDetections(
      [{ kind: "temporary_hit_points", amountScaling: "character_level", amount: 1 }],
      { contentKind: "class_feature", featureName: "Level-Scaled THP" },
    )
    const levelEffect = byLevel[0]?.instance.activation?.effects?.[0]
    expect(levelEffect?.healMode).toBe("character_level")
    expect(levelEffect?.healLevelMultiplier).toBe(1)

    const byAbility = aiMechanicsToDetections(
      [{ kind: "temporary_hit_points", amountScaling: "ability_modifier", ability: "constitution" }],
      { contentKind: "class_feature", featureName: "CON-Scaled THP" },
    )
    const abilityEffect = byAbility[0]?.instance.activation?.effects?.[0]
    expect(abilityEffect?.healMode).toBe("ability_modifier")
    expect(abilityEffect?.healAbility).toBe("CON")
  })

  it("does not wire temporary_hit_points triggers/targets the sheet can't apply yet", () => {
    // turn_start / on_hit triggers have no "grant temp HP" field on those characteristics.
    expect(
      aiMechanicsToDetections(
        [{ kind: "temporary_hit_points", amount: 5, thpTrigger: "turn_start" }],
        { contentKind: "class_feature", featureName: "Turn Start THP" },
      ),
    ).toEqual([])
    // Granting temp HP to another creature has no target on a single-character sheet.
    expect(
      aiMechanicsToDetections(
        [{ kind: "temporary_hit_points", amount: 5, thpTarget: "allies_in_range" }],
        { contentKind: "class_feature", featureName: "Ally THP" },
      ),
    ).toEqual([])
  })

  it("does not wire temporary_hit_points when the LLM mis-keys thpTrigger as generic `trigger` (Improved Warding Flare, Cleric domains audit)", () => {
    // Real-world case: the LLM emitted `trigger: "on_use"` / `target: "chosen_creature_in_range"`
    // instead of `thpTrigger` / `thpTarget`. Before the guard, thpTrigger/thpTarget silently
    // defaulted to "on_activation"/"self" and produced a bogus self-targeted "activate for temp
    // HP" effect on a feature that isn't independently activatable and doesn't target self at all.
    expect(
      aiMechanicsToDetections(
        [
          {
            kind: "temporary_hit_points",
            amountDice: "2d6",
            amountScaling: "ability_modifier",
            ability: "wisdom",
            trigger: "on_use",
            sourcePhrase: "give the target of the triggering attack temporary hit points",
          },
        ],
        { contentKind: "subclass_feature", featureName: "Improved Warding Flare" },
      ),
    ).toEqual([])
  })

  it("still does not wire movement_grant (accepted in schema, no characteristic mapping yet)", () => {
    expect(
      aiMechanicsToDetections(
        [{ kind: "movement_grant", distanceMode: "fraction_of_speed", fraction: 0.5 }],
        { contentKind: "class_feature", featureName: "Guiding Hand" },
      ),
    ).toEqual([])
  })

  it("wires alternateRefresh (spend another resource to restore a use) onto UsesConfig", () => {
    const byResource = aiMechanicsToDetections(
      [
        {
          kind: "uses",
          usesFixed: 1,
          usesRecharge: "long_rest",
          alternateRefresh: {
            spendResourceKey: "bardic_inspiration",
            spendAmount: 1,
            actionCost: "none",
          },
          sourcePhrase: "you can restore it by expending a Bardic Inspiration",
        },
      ],
      { contentKind: "class_feature", featureName: "Homebrew Rider" },
    )
    const uses = byResource[0]?.instance.characteristics?.[0]
    expect(uses?.type).toBe("uses")
    if (uses?.type === "uses") {
      expect(uses.uses?.restoreByResource).toEqual({
        resourceKey: "bardic_inspiration",
        resourceAmount: 1,
        restores: 1,
      })
    }

    const bySpellSlot = aiMechanicsToDetections(
      [
        {
          kind: "uses",
          usesAbility: "WIS",
          usesRecharge: "short_rest",
          alternateRefresh: { spendSpellSlotMinLevel: 1, actionCost: "none" },
        },
      ],
      { contentKind: "class_feature", featureName: "Homebrew Quarry" },
    )
    const usesBySlot = bySpellSlot[0]?.instance.characteristics?.[0]
    expect(usesBySlot?.type).toBe("uses")
    if (usesBySlot?.type === "uses") {
      expect(usesBySlot.uses?.restoreBySpellSlot).toEqual({ minSpellLevel: 1, restores: 1 })
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

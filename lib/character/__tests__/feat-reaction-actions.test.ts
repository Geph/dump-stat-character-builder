import { describe, expect, it } from "vitest"

import { collectSheetActions } from "@/lib/character/sheet-actions"
import { CUSTOM_FEAT_MODIFIER_PRESETS } from "@/lib/compendium/custom-feat-modifier-presets"
import { enrichCustomFeatRow } from "@/lib/compendium/enrich-custom-feats"
import type { Feat } from "@/lib/types"

function featFromPreset(name: string): Feat {
  const preset = CUSTOM_FEAT_MODIFIER_PRESETS[name]
  const row = enrichCustomFeatRow({
    id: `feat-${name.replace(/\s+/g, "-").toLowerCase()}`,
    name,
    description: `${name} fighting reaction.`,
    source: "Player's Handbook (2024)",
  })
  return {
    id: String(row.id ?? `feat-${name}`),
    name,
    description: typeof row.description === "string" ? row.description : null,
    category: "General",
    level_requirement: null,
    prerequisite: null,
    prerequisite_feat_ids: null,
    prerequisite_class_ids: null,
    prerequisite_species_ids: null,
    prerequisite_background_ids: null,
    benefits: null,
    linkedModifiers: preset.linkedModifiers,
    icon: null,
    source: "Player's Handbook (2024)",
    creator_url: null,
    created_at: "",
  }
}

function featDeclaresReaction(name: string): boolean {
  const preset = CUSTOM_FEAT_MODIFIER_PRESETS[name]
  return (preset.linkedModifiers ?? []).some((instance) => {
    if (instance.activation?.reaction) return true
    return (instance.characteristics ?? []).some(
      (characteristic) =>
        ("useReaction" in characteristic && characteristic.useReaction) ||
        characteristic.type === "damage_halving_reaction",
    )
  })
}

describe("feat reaction Combat cards", () => {
  const reactionFeatNames = Object.keys(CUSTOM_FEAT_MODIFIER_PRESETS).filter(featDeclaresReaction)

  it("wires Interception as a Combat Reaction with 1d10 + PB", () => {
    const actions = collectSheetActions({
      classDetails: [],
      species: null,
      feats: [featFromPreset("Interception")],
    })
    const interception = actions.find((action) => action.name === "Interception")
    expect(interception?.kinds).toContain("reaction")
    expect(interception?.category).toBe("combat")
    expect(interception?.showOnCombatTab).toBe(true)
    const reduction = interception
      ? (interception as { healEffects?: unknown }).healEffects
      : null
    void reduction
    const effect = CUSTOM_FEAT_MODIFIER_PRESETS.Interception.linkedModifiers?.[0]?.activation?.effects?.[0]
    expect(effect).toMatchObject({
      kind: "damage_reduction",
      bonusDice: "1d10",
      bonusConfig: { mode: "proficiency" },
    })
  })

  it.each(reactionFeatNames)("files %s as a Combat Reaction", (name) => {
    const actions = collectSheetActions({
      classDetails: [],
      species: null,
      feats: [featFromPreset(name)],
    })
    const card = actions.find(
      (action) => action.name === name || action.sourceLabel === name,
    )
    expect(card, `${name} should appear on the sheet`).toBeDefined()
    expect(card?.kinds, `${name} should be a Reaction`).toContain("reaction")
    expect(card?.showOnCombatTab).toBe(true)
  })
})

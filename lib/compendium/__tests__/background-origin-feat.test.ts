import { describe, expect, it } from "vitest"
import {
  getEffectiveBackgroundFeatGranted,
  isLegacyBackground,
  legacyBackgroundOriginFeatPickKey,
  legacyBackgroundOriginFeatPickComplete,
} from "@/lib/compendium/background-origin-feat"
import { findBackgroundGrantedFeat } from "@/lib/compendium/background-display"
import type { Background } from "@/lib/types"

function legacyBackground(overrides: Partial<Background> = {}): Background {
  return {
    id: "apothecary",
    name: "Apothecary",
    description: "An herbalist.",
    ability_bonuses: null,
    skill_proficiencies: ["Medicine"],
    tool_proficiencies: null,
    proficiencies: null,
    feat_granted: null,
    starting_gold: null,
    starting_equipment: null,
    starting_equipment_groups: null,
    equipment: null,
    feature: { name: "Herblore", description: "You know herbs." },
    icon: null,
    source: "Homebrew",
    creator_url: null,
    created_at: "",
    ...overrides,
  } as unknown as unknown as Background
}

describe("isLegacyBackground", () => {
  it("is true when both ability_bonuses and feat_granted are null", () => {
    expect(isLegacyBackground(legacyBackground())).toBe(true)
  })

  it("is false when feat_granted is fixed", () => {
    expect(isLegacyBackground(legacyBackground({ feat_granted: "Alert" }))).toBe(false)
  })

  it("is false when feature grants a feat pick via linked modifiers", () => {
    expect(
      isLegacyBackground(
        legacyBackground({
          feature: {
            name: "Pact Seeker",
            description: "You sought power.",
            linkedModifiers: [
              {
                instanceId: "inst-1",
                catalogRefId: "cat_char_grant_feat",
                characteristics: [{ id: "c1", type: "grant_feat", featCategories: ["Planar Pact"], count: 1 }],
              },
            ],
          },
        }),
      ),
    ).toBe(false)
  })
})

describe("legacy background origin feat pick", () => {
  it("resolves the player's pick as the effective feat grant", () => {
    const bg = legacyBackground()
    const key = legacyBackgroundOriginFeatPickKey(bg.id)
    const picks = { [key]: ["Magic Initiate (Cleric)"] }
    expect(getEffectiveBackgroundFeatGranted(bg, picks)).toBe("Magic Initiate (Cleric)")
    expect(legacyBackgroundOriginFeatPickComplete(bg, picks)).toBe(true)
  })

  it("prefers a fixed feat_granted over a stale legacy pick", () => {
    const bg = legacyBackground({ feat_granted: "Alert" })
    const key = legacyBackgroundOriginFeatPickKey(bg.id)
    expect(getEffectiveBackgroundFeatGranted(bg, { [key]: ["Magic Initiate (Cleric)"] })).toBe("Alert")
  })

  it("resolves Magic Initiate variants through findBackgroundGrantedFeat", () => {
    const feats = [
      { id: "mi", name: "Magic Initiate", description: "Learn spells." },
      { id: "alert", name: "Alert", description: "Always on guard." },
    ]
    const resolved = findBackgroundGrantedFeat("Magic Initiate (Cleric)", feats as unknown as import("@/lib/types").Feat[])
    expect(resolved?.id).toBe("mi")
  })
})

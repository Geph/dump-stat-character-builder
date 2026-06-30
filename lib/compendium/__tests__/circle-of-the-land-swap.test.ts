import { describe, expect, it } from "vitest"
import { enrichSrdSubclassRow } from "@/lib/compendium/enrich-srd-subclasses"
import { collectSubclassAlwaysPreparedSpells } from "@/lib/character/subclass-granted-spells"
import { featureChoiceKey } from "@/lib/builder/choices"
import type { Feature } from "@/lib/types"
import bundledSubclasses from "@/lib/srd/seed-data/subclasses.json"

const circleSeed = bundledSubclasses.find((s) => s.name === "Circle of the Land")!

function enrichedCircleFeatures(): Feature[] {
  const row = enrichSrdSubclassRow(
    { ...circleSeed, source: "SRD", id: "col-test", class_id: "druid-test" },
    "Druid",
  )
  return (row.features as Feature[]) ?? []
}

function spellsFeature(): Feature {
  const feature = enrichedCircleFeatures().find((f) => f.name === "Circle of the Land Spells")
  if (!feature) throw new Error("Circle of the Land Spells feature missing")
  return feature
}

const SPELL_CATALOG = [
  "Blur",
  "Burning Hands",
  "Fire Bolt",
  "Fireball",
  "Blight",
  "Wall of Stone",
  "Fog Cloud",
  "Hold Person",
  "Ray of Frost",
  "Sleet Storm",
  "Ice Storm",
  "Cone of Cold",
].map((name, i) => ({ id: `spell-${i}`, name }))

describe("Circle of the Land rest-swappable land choice", () => {
  it("turns Circle of the Land Spells into a swappable long-rest choice with four lands", () => {
    const feature = spellsFeature()
    expect(feature.isChoice).toBe(true)
    expect(feature.choices?.swappableOnRest).toBe(true)
    expect(feature.choices?.swapRestType).toBe("long")
    expect(feature.choices?.count).toBe(1)
    expect(feature.choices?.options.map((o) => o.name)).toEqual([
      "Arid",
      "Polar",
      "Temperate",
      "Tropical",
    ])
  })

  it("attaches the matching Nature's Ward resistance to each land option", () => {
    const options = spellsFeature().choices?.options ?? []
    const resistanceFor = (land: string) =>
      options
        .find((o) => o.name === land)
        ?.linkedModifiers?.flatMap((m) => m.characteristics ?? [])
        .filter((c) => c.type === "damage_resistance")
        .flatMap((c) => (c as { damageTypes?: string[] }).damageTypes ?? [])
    expect(resistanceFor("Arid")).toEqual(["Fire"])
    expect(resistanceFor("Polar")).toEqual(["Cold"])
    expect(resistanceFor("Temperate")).toEqual(["Lightning"])
    expect(resistanceFor("Tropical")).toEqual(["Poison"])
  })

  it("grants only the chosen land's always-prepared spells, gated by druid level", () => {
    const features = enrichedCircleFeatures()
    const key = featureChoiceKey("druid-test", "Circle of the Land Spells", 3)

    const aridAt9 = collectSubclassAlwaysPreparedSpells(features, 9, SPELL_CATALOG, {
      classId: "druid-test",
      featureChoicePicks: { [key]: ["Arid"] },
    })
    const aridNames = aridAt9
      .map((g) => SPELL_CATALOG.find((s) => s.id === g.spellId)?.name)
      .sort()
    expect(aridNames).toEqual(
      ["Blight", "Blur", "Burning Hands", "Fire Bolt", "Fireball", "Wall of Stone"].sort(),
    )
    // Polar spells must not leak into the Arid selection.
    expect(aridNames).not.toContain("Fog Cloud")
  })

  it("excludes higher-level spells until the druid reaches the unlock level", () => {
    const features = enrichedCircleFeatures()
    const key = featureChoiceKey("druid-test", "Circle of the Land Spells", 3)
    const aridAt3 = collectSubclassAlwaysPreparedSpells(features, 3, SPELL_CATALOG, {
      classId: "druid-test",
      featureChoicePicks: { [key]: ["Arid"] },
    })
    const names = aridAt3.map((g) => SPELL_CATALOG.find((s) => s.id === g.spellId)?.name)
    expect(names).toContain("Blur")
    expect(names).not.toContain("Fireball") // unlocks at level 5
  })

  it("grants no land spells until a land is chosen", () => {
    const features = enrichedCircleFeatures()
    const granted = collectSubclassAlwaysPreparedSpells(features, 9, SPELL_CATALOG, {
      classId: "druid-test",
      featureChoicePicks: {},
    })
    expect(granted).toHaveLength(0)
  })
})

import { describe, expect, it } from "vitest"
import { enrichWildcardFeaturePresets } from "@/lib/compendium/enrich-srd-class-features"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

/**
 * `enrichWildcardFeaturePresets` used to only resolve the generic `*::FeatureName` wildcard,
 * even when the caller (class/subclass import) knew the class and subclass. Class/subclass-
 * scoped presets authored specifically to win over a colliding generic wildcard (e.g. the
 * SRD 2024 Monk's "Elemental Attunement" vs. an unrelated homebrew "Martial Form" picker of
 * the same name) could therefore never fire on a real import — only on the static SRD
 * seed-data build path (`enrichClassFeatureWithModifierPresets`). These tests guard the fix:
 * `enrichImportContentModifiers` now threads class/subclass context into preset resolution
 * for classes[] and subclasses[], while unscoped callers keep the old generic-only behavior.
 */
describe("class/subclass-scoped wildcard preset resolution", () => {
  const elementalAttunementFeature: Feature = {
    level: 3,
    name: "Elemental Attunement",
    description:
      "At the start of your turn, you can expend 1 Focus Point to imbue yourself with elemental energy. Reach: your reach is 10 feet greater than normal on Unarmed Strikes while this is active.",
  }

  it("resolves the Monk::Warrior of the Elements-scoped preset when importing a subclass with matching class/subclass names", () => {
    const enriched = enrichImportContentModifiers({
      subclasses: [
        {
          name: "Warrior of the Elements",
          class_name: "Monk",
          description: null,
          features: [elementalAttunementFeature],
        },
      ],
    } as unknown as ImportContent)

    const feature = enriched.subclasses?.[0]?.features?.[0] as Feature
    const reachMod = feature.linkedModifiers
      ?.flatMap((entry) => entry.characteristics ?? [])
      .find((c) => c.type === "weapon_reach_modifier")
    expect(reachMod).toBeDefined()
    if (reachMod?.type === "weapon_reach_modifier") {
      expect(reachMod.reachBonusFeet).toBe(10)
      expect(reachMod.requiresSheetToggle).toBe("elemental_attunement_active")
    }

    // Must NOT fall through to the unrelated generic "Martial Form / Elemental Attunement"
    // feature-option-picker wildcard.
    expect(feature.isChoice).not.toBe(true)
    expect(feature.choices?.category ?? "").not.toMatch(/martial form/i)
  })

  it("still falls back to the generic *::FeatureName wildcard for an unrelated class/subclass", () => {
    const enriched = enrichImportContentModifiers({
      subclasses: [
        {
          name: "Some Homebrew Order",
          class_name: "Fighter",
          description: null,
          features: [elementalAttunementFeature],
        },
      ],
    } as unknown as ImportContent)

    const feature = enriched.subclasses?.[0]?.features?.[0] as Feature
    // The generic wildcard's featureOptionPicker gets migrated into isChoice/choices by
    // migrateFeatureOptionPickers rather than staying a raw characteristic.
    expect(feature.isChoice).toBe(true)
    expect(feature.choices?.category).toMatch(/martial form/i)
  })

  it("direct enrichWildcardFeaturePresets call still defaults to generic-only when no presetScope is given", () => {
    const feature = enrichWildcardFeaturePresets(elementalAttunementFeature)
    expect(feature.isChoice).toBe(true)
    expect(feature.choices?.category).toMatch(/martial form/i)
  })

  it("direct enrichWildcardFeaturePresets call with presetScope resolves the scoped preset", () => {
    const feature = enrichWildcardFeaturePresets(elementalAttunementFeature, {
      className: "Monk",
      subclassName: "Warrior of the Elements",
    })
    const reachMod = feature.linkedModifiers
      ?.flatMap((entry) => entry.characteristics ?? [])
      .find((c) => c.type === "weapon_reach_modifier")
    expect(reachMod).toBeDefined()
  })
})

import { describe, expect, it } from "vitest"
import {
  assertModifierWiringRegistryComplete,
  DESCRIPTION_PHRASE_WIRING,
  FEATURE_NAME_WIRING,
  formatModifierWiringRegistryCoverage,
  getModifierWiringRegistryCoverage,
} from "@/lib/import/modifier-wiring-registry"
import {
  FEATURE_MODIFIER_RULES,
  FEATURE_NAME_MODIFIER_RULES,
} from "@/lib/import/detect-feature-modifier-rules"

describe("modifier-wiring-registry", () => {
  it("covers every description and name detector rule", () => {
    expect(() => assertModifierWiringRegistryComplete()).not.toThrow()
  })

  it("has one registry entry per FEATURE_MODIFIER_RULES id", () => {
    expect(DESCRIPTION_PHRASE_WIRING.map((entry) => entry.ruleId).sort()).toEqual(
      FEATURE_MODIFIER_RULES.map((rule) => rule.id).sort(),
    )
  })

  it("has one registry entry per FEATURE_NAME_MODIFIER_RULES id", () => {
    expect(FEATURE_NAME_WIRING.map((entry) => entry.ruleId).sort()).toEqual(
      FEATURE_NAME_MODIFIER_RULES.map((rule) => rule.id).sort(),
    )
  })

  it("reports full registry coverage counts", () => {
    const coverage = getModifierWiringRegistryCoverage()
    expect(coverage.phraseRules.documented).toBe(FEATURE_MODIFIER_RULES.length)
    expect(coverage.nameRules.documented).toBe(FEATURE_NAME_MODIFIER_RULES.length)
    expect(coverage.isComplete).toBe(true)
    expect(formatModifierWiringRegistryCoverage(coverage)).toMatch(/BYO wiring index:/)
  })

  it("keeps AI_MECHANIC_KINDS in sync with every INDEX catalog that documents a kind", () => {
    expect(() => assertModifierWiringRegistryComplete()).not.toThrow()
  })
})

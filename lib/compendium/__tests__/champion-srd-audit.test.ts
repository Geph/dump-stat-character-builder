import { describe, expect, it } from "vitest"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import {
  collectDeathSaveCritThreshold,
  collectFeatureRollModes,
  featureEffectMatchesRollContext,
} from "@/lib/character/collect-feature-roll-modes"
import { collectTurnStartTriggers, applyTurnStartTriggers } from "@/lib/character/collect-turn-start-triggers"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { Feature } from "@/lib/types"

function survivorFeature(): Feature {
  return enrichClassFeatureWithModifierPresets(
    "Fighter",
    {
      level: 18,
      name: "Survivor",
      description:
        "Defy Death. You have Advantage on Death Saving Throws, and 18-20 counts as rolling a 20. Heroic Rally: regain 5 + CON at the start of your turn while Bloodied.",
    },
    "Champion",
  )
}

describe("Champion Survivor wiring", () => {
  it("grants advantage on death saves specifically, not on ability-specific saves", () => {
    const feature = survivorFeature()
    const deathSaveResult = collectFeatureRollModes([feature], { kind: "death_save" }, { currentHp: 0 })
    expect(deathSaveResult.mode).toBe("advantage")

    // A regular ability save (e.g. Dexterity) should NOT pick up this death-save-scoped advantage.
    const dexSaveResult = collectFeatureRollModes(
      [feature],
      { kind: "save", ability: "dexterity" },
      { currentHp: 0 },
    )
    expect(dexSaveResult.mode).toBe("normal")
  })

  it("does not grant death save advantage above 0 HP (limitation gate)", () => {
    const feature = survivorFeature()
    const result = collectFeatureRollModes([feature], { kind: "death_save" }, { currentHp: 5 })
    expect(result.mode).toBe("normal")
  })

  it("reports a deathSaveCritThreshold of 18", () => {
    const feature = survivorFeature()
    expect(collectDeathSaveCritThreshold([feature], { currentHp: 0 })).toBe(18)
  })

  it("defaults to 20 when no crit-threshold effect is present", () => {
    expect(collectDeathSaveCritThreshold([], {})).toBe(20)
  })

  it("death_save checkCategory only matches death_save roll context", () => {
    const effect = {
      id: "x",
      kind: "check_roll_modifier",
      checkRollMode: "advantage" as const,
      checkCategory: "death_save" as const,
    }
    expect(featureEffectMatchesRollContext(effect, { kind: "death_save" })).toBe(true)
    expect(featureEffectMatchesRollContext(effect, { kind: "save", ability: "wisdom" })).toBe(false)
  })

  it("heals 5 + CON modifier via Heroic Rally when Bloodied and above 0 HP", () => {
    const feature = survivorFeature()
    const classDetails = [
      {
        row: { class_id: "fighter-1", level: 18 },
        class: { name: "Fighter", features: [] },
        subclass: { features: [feature] },
      },
    ] as unknown as CharacterClassDetail[]

    const triggers = collectTurnStartTriggers(classDetails)
    expect(triggers).toHaveLength(1)

    const bloodied = applyTurnStartTriggers({
      triggers,
      usedResourcesById: {},
      resourceEntries: [],
      resolveContext: { proficiencyBonus: 6, abilityModifiers: {} },
      currentHp: 20, // half of 50 or less counts as Bloodied
      maxHp: 50,
      activeConditions: [],
      abilityMods: { constitution: 3 },
    })
    expect(bloodied.currentHp).toBe(28) // 20 + (5 + 3)

    const notBloodied = applyTurnStartTriggers({
      triggers,
      usedResourcesById: {},
      resourceEntries: [],
      resolveContext: { proficiencyBonus: 6, abilityModifiers: {} },
      currentHp: 40,
      maxHp: 50,
      activeConditions: [],
      abilityMods: { constitution: 3 },
    })
    expect(notBloodied.currentHp).toBe(40)

    const downed = applyTurnStartTriggers({
      triggers,
      usedResourcesById: {},
      resourceEntries: [],
      resolveContext: { proficiencyBonus: 6, abilityModifiers: {} },
      currentHp: 0,
      maxHp: 50,
      activeConditions: [],
      abilityMods: { constitution: 3 },
    })
    expect(downed.currentHp).toBe(0) // hpAtLeast: 1 blocks healing at 0 HP
  })
})

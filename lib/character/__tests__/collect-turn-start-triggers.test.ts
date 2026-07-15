import { describe, expect, it } from "vitest"
import { applyTurnStartTriggers } from "@/lib/character/collect-turn-start-triggers"
import type { TurnStartTriggerEntry } from "@/lib/character/collect-turn-start-triggers"

describe("applyTurnStartTriggers", () => {
  const trigger: TurnStartTriggerEntry = {
    id: "warriors-spirit",
    name: "Warrior's Spirit",
    classId: "monk-1",
    classLevel: 5,
    trigger: {
      id: "t1",
      type: "turn_start_trigger",
      restoreResourceKey: "alternate_monk_ki_points",
      restoreResourceAmount: 1,
      blockedByConditions: ["Incapacitated"],
    },
  }

  const resourceEntries = [
    {
      id: "monk-1_alternate_monk_ki_points",
      uses: { type: "fixed" as const, fixedAmount: 5 },
      classLevel: 5,
    },
  ]

  it("restores Ki at turn start when not incapacitated", () => {
    const result = applyTurnStartTriggers({
      triggers: [trigger],
      usedResourcesById: { "monk-1_alternate_monk_ki_points": 3 },
      resourceEntries,
      resolveContext: { proficiencyBonus: 3, abilityModifiers: {} },
      currentHp: 20,
      maxHp: 30,
      activeConditions: [],
    })
    expect(result.usedResourcesById["monk-1_alternate_monk_ki_points"]).toBe(2)
  })

  it("skips when Incapacitated", () => {
    const result = applyTurnStartTriggers({
      triggers: [trigger],
      usedResourcesById: { "monk-1_alternate_monk_ki_points": 3 },
      resourceEntries,
      resolveContext: { proficiencyBonus: 3, abilityModifiers: {} },
      currentHp: 20,
      maxHp: 30,
      activeConditions: ["Incapacitated"],
    })
    expect(result.usedResourcesById["monk-1_alternate_monk_ki_points"]).toBe(3)
  })

  it("accrues influence when in-combat toggle is active", () => {
    const influenceTrigger: TurnStartTriggerEntry = {
      id: "influence",
      name: "Influence",
      classId: "psion-1",
      classLevel: 5,
      trigger: {
        id: "inf",
        type: "turn_start_trigger",
        accrueResourceKey: "influence_points",
        accrueResourceAmount: 1,
        accrueResourceMaxAbility: "intelligence",
        accrueDecayMinutes: 1,
        requiresSheetToggle: "in_combat_or_high_stakes",
      },
    }
    const result = applyTurnStartTriggers({
      triggers: [influenceTrigger],
      usedResourcesById: {},
      resourceEntries: [],
      resolveContext: { proficiencyBonus: 3, abilityModifiers: { INT: 3 } },
      currentHp: 20,
      maxHp: 30,
      activeConditions: [],
      activeSheetToggleIds: ["in_combat_or_high_stakes"],
      accumulatedResources: {},
      abilityMods: { intelligence: 3 },
    })
    expect(result.accumulatedResources.influence_points?.value).toBe(1)
  })

  it("heals ability_modifier + flat bonus while Bloodied and above 0 HP (Heroic Rally)", () => {
    const healTrigger: TurnStartTriggerEntry = {
      id: "heroic-rally",
      name: "Heroic Rally",
      classId: "fighter-1",
      classLevel: 18,
      trigger: {
        id: "hr",
        type: "turn_start_trigger",
        healMode: "ability_modifier",
        healAbility: "constitution",
        healFlatBonus: 5,
        hpBelowFraction: 0.5,
        hpAtLeast: 1,
      },
    }
    const result = applyTurnStartTriggers({
      triggers: [healTrigger],
      usedResourcesById: {},
      resourceEntries: [],
      resolveContext: { proficiencyBonus: 3, abilityModifiers: {} },
      currentHp: 10,
      maxHp: 30,
      activeConditions: [],
      abilityMods: { constitution: 2 },
    })
    expect(result.currentHp).toBe(17) // 10 + (5 + 2)
  })

  it("caps healing at maxHp", () => {
    const healTrigger: TurnStartTriggerEntry = {
      id: "heroic-rally",
      name: "Heroic Rally",
      classId: "fighter-1",
      classLevel: 18,
      trigger: {
        id: "hr",
        type: "turn_start_trigger",
        healMode: "fixed",
        healFixed: 100,
        hpBelowFraction: 0.5,
      },
    }
    const result = applyTurnStartTriggers({
      triggers: [healTrigger],
      usedResourcesById: {},
      resourceEntries: [],
      resolveContext: { proficiencyBonus: 3, abilityModifiers: {} },
      currentHp: 10,
      maxHp: 30,
      activeConditions: [],
    })
    expect(result.currentHp).toBe(30)
  })

  it("does not heal when not Bloodied", () => {
    const healTrigger: TurnStartTriggerEntry = {
      id: "heroic-rally",
      name: "Heroic Rally",
      classId: "fighter-1",
      classLevel: 18,
      trigger: {
        id: "hr",
        type: "turn_start_trigger",
        healMode: "fixed",
        healFixed: 10,
        hpBelowFraction: 0.5,
      },
    }
    const result = applyTurnStartTriggers({
      triggers: [healTrigger],
      usedResourcesById: {},
      resourceEntries: [],
      resolveContext: { proficiencyBonus: 3, abilityModifiers: {} },
      currentHp: 25,
      maxHp: 30,
      activeConditions: [],
    })
    expect(result.currentHp).toBe(25)
  })
})

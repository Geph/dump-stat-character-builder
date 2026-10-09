import { describe, expect, it } from "vitest"
import { readLinkedModifiers, syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { removeRedundantTriggerDamage } from "@/lib/compendium/redundant-trigger-damage"

const damage = { id: "mod_import_damage", type: "damage_roll_modifiers" as const, label: "Extra 2d8 damage", entries: [{ bonus: 0, target: "all", customTarget: "2d8" }] }
const flat: LinkedModifierInstance = { instanceId: "flat", catalogRefId: "damage", characteristics: [damage] }
const trigger: LinkedModifierInstance = { instanceId: "trigger", catalogRefId: "hit", characteristics: [{ id: "hit", type: "on_hit_trigger", triggerOn: "hit", oncePerTurn: true, effect: { ...flat, instanceId: "nested" } }] }

describe("redundant imported trigger damage", () => {
  it("removes the unconditional copy on read and import without removing the conditional effect", () => {
    const linked = [trigger, flat]
    expect(readLinkedModifiers({ linkedModifiers: linked })).toHaveLength(1)
    expect(syncModifierRefs({ linkedModifiers: linked, modifierRefs: ["hit", "damage"] })).toEqual({ linkedModifiers: [trigger], modifierRefs: ["hit"] })
    expect(linked).toHaveLength(2)
  })
  it("preserves independent sources, different damage and intentional authored bonuses", () => {
    expect(removeRedundantTriggerDamage([flat])).toEqual([flat])
    const authored = { ...flat, characteristics: [{ ...damage, id: "authored" }] }
    expect(removeRedundantTriggerDamage([trigger, authored])).toHaveLength(2)
    const different = { ...flat, characteristics: [{ ...damage, entries: [{ bonus: 0, target: "all", customTarget: "1d6" }] }] }
    expect(removeRedundantTriggerDamage([trigger, different])).toHaveLength(2)
  })
  it("preserves unrelated mechanics on an instance containing duplicate damage", () => {
    const mixed = { ...flat, characteristics: [damage, { id: "reach", type: "weapon_reach_modifier" as const, reachBonusFeet: 5 }] }
    expect(removeRedundantTriggerDamage([trigger, mixed])[1].characteristics).toEqual([mixed.characteristics[1]])
  })
})

import { describe, expect, it } from "vitest"
import { enrichSrdSpellRow } from "@/lib/compendium/enrich-srd-spells"
import { enrichSrdMagicItemRow } from "@/lib/compendium/enrich-srd-magic-items"
import { grantCreaturesFromLinkedModifiers } from "@/lib/compendium/grant-creature-catalog"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { SRD_SOURCE } from "@/lib/srd/source"

describe("spell summon-creature enrichment", () => {
  it("wires Find Familiar with a form choice grant", () => {
    const row = enrichSrdSpellRow({ name: "Find Familiar", source: SRD_SOURCE, level: 1 })
    const linked = (row.linkedModifiers ?? row.linked_modifiers) as LinkedModifierInstance[]
    const grants = grantCreaturesFromLinkedModifiers([], linked)
    expect(grants).toHaveLength(1)
    expect(grants[0].choiceOptions).toContain("Owl")
    expect(grants[0].choiceOptions).toContain("Bat")
    expect(grants[0].count).toBe(1)
  })

  it("wires Find Steed, Summon Dragon, Animate Dead, and Awaken", () => {
    for (const [name, expected] of [
      ["Find Steed", ["Otherworldly Steed"]],
      ["Summon Dragon", ["Draconic Spirit"]],
      ["Animate Dead", ["Skeleton", "Zombie"]],
      ["Awaken", ["Awakened Shrub", "Awakened Tree"]],
    ] as const) {
      const row = enrichSrdSpellRow({ name, source: SRD_SOURCE, level: 1 })
      const linked = (row.linkedModifiers ?? row.linked_modifiers) as LinkedModifierInstance[]
      const grants = grantCreaturesFromLinkedModifiers([], linked)
      expect(grants[0]?.creatureNames ?? grants[0]?.choiceOptions).toEqual(
        expect.arrayContaining([...expected]),
      )
    }
  })
})

describe("magic item summon-creature enrichment", () => {
  it("grants Djinni / Efreeti / Griffon / Roc / Knight from SRD items", () => {
    const cases: [string, string[]][] = [
      ["Ring of Djinni Summoning", ["Djinni"]],
      ["Efreeti Bottle", ["Efreeti"]],
      ["Figurine of Wondrous Power", ["Griffon", "Giant Fly"]],
      ["Feather Token", ["Roc"]],
      ["Mysterious Deck", ["Knight"]],
      ["Horn of Valhalla", ["Berserker"]],
      ["Bowl of Commanding Water Elementals", ["Water Elemental"]],
    ]
    for (const [name, creatures] of cases) {
      const row = enrichSrdMagicItemRow({ name, source: SRD_SOURCE })
      const grants = grantCreaturesFromLinkedModifiers([], row.magic_effects)
      const names = grants.flatMap((g) => g.choiceOptions ?? g.creatureNames)
      for (const creature of creatures) {
        expect(names).toContain(creature)
      }
    }
  })
})

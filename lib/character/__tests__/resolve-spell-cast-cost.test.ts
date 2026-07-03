import { describe, expect, it } from "vitest"
import {
  metamagicOptionsFromFeats,
  resolveSpellCastCost,
} from "@/lib/character/resolve-spell-cast-cost"
import { DEFAULT_ALTERNATE_SORCERER_COST_BY_LEVEL } from "@/lib/character/point-pool-spellcasting"
import type { DndClass, Feat } from "@/lib/types"

const ctx = { proficiencyBonus: 3, abilityModifiers: {} as Record<string, number> }

const alternateSorcererClass: Pick<DndClass, "class_resources"> = {
  class_resources: [
    {
      id: "alternate_sorcerer_spell_limit",
      name: "Spell Limit",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        atLevelTable: [
          { level: 1, count: 2 },
          { level: 5, count: 4 },
          { level: 11, count: 6 },
        ],
      },
    },
  ],
}

const pointPoolSpellcasting: DndClass["spellcasting"] = {
  ability: "Charisma",
  point_pool: {
    resource_key: "alternate_sorcerer_sorcery_points",
    cost_by_level: DEFAULT_ALTERNATE_SORCERER_COST_BY_LEVEL,
    base_cost_cap_resource_key: "alternate_sorcerer_spell_limit",
    metamagic_cost_cap: "proficiency_bonus",
    replaces_spell_slots: true,
  },
}

describe("metamagicOptionsFromFeats", () => {
  it("parses sorcery point costs from Metamagic feat descriptions", () => {
    const feats: Feat[] = [
      {
        id: "mm_twinned",
        name: "Twinned Spell",
        category: "Metamagic",
        description: "When you cast a spell, you can spend 1 sorcery point to twin it.",
      } as Feat,
    ]
    expect(metamagicOptionsFromFeats(feats)).toEqual([
      { id: "mm_twinned", name: "Twinned Spell", cost: 1 },
    ])
  })
})

describe("resolveSpellCastCost", () => {
  it("returns slot mode when no point pool is configured", () => {
    const result = resolveSpellCastCost({
      spellLevel: 3,
      spellcasting: { ability: "Charisma" },
      classRow: alternateSorcererClass,
      classLevel: 5,
      availablePoints: 10,
      selectedMetamagic: [],
      ctx,
    })
    expect(result.mode).toBe("slots")
    expect(result.canCast).toBe(true)
  })

  it("enforces Spell Limit and Proficiency Bonus caps independently", () => {
    const result = resolveSpellCastCost({
      spellLevel: 2,
      spellcasting: pointPoolSpellcasting,
      classRow: alternateSorcererClass,
      classLevel: 11,
      availablePoints: 20,
      selectedMetamagic: [{ id: "a", name: "A", cost: 2 }, { id: "b", name: "B", cost: 2 }],
      ctx,
    })
    expect(result.baseCost).toBe(3)
    expect(result.metamagicCost).toBe(4)
    expect(result.canCast).toBe(false)
    expect(result.blockReason).toBe("metamagic_over_proficiency_cap")
  })

  it("blocks when base cost exceeds Spell Limit even with enough points", () => {
    const result = resolveSpellCastCost({
      spellLevel: 5,
      spellcasting: pointPoolSpellcasting,
      classRow: alternateSorcererClass,
      classLevel: 3,
      availablePoints: 20,
      selectedMetamagic: [],
      ctx,
    })
    expect(result.baseCost).toBe(7)
    expect(result.canCast).toBe(false)
    expect(result.blockReason).toBe("base_over_spell_limit")
  })

  it("routes high-level spells through Innate Arcanum", () => {
    const result = resolveSpellCastCost({
      spellLevel: 7,
      spellcasting: pointPoolSpellcasting,
      classRow: alternateSorcererClass,
      classLevel: 13,
      availablePoints: 20,
      selectedMetamagic: [],
      ctx,
      arcanumAvailable: false,
    })
    expect(result.castKind).toBe("arcanum")
    expect(result.totalCost).toBe(0)
    expect(result.canCast).toBe(false)
  })
})

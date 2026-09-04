import { describe, expect, it } from "vitest"
import {
  applyFeatureResourceRefresh,
  collectResourceRefreshEffects,
} from "@/lib/character/collect-resource-refresh-effects"
import { inferClassResourceSpendFromText } from "@/lib/character/infer-class-resource-spend"
import { resolveSpellCastCost } from "@/lib/character/resolve-spell-cast-cost"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import {
  applyInitiativeResourceRecharge,
  applySheetRest,
  charnelTouchRestoreFromSlot,
  pactSlotRestoreCount,
  restoreExpendedSpellSlots,
  restoreSpellSlotsByCombinedLevel,
  spendLowestAvailableSpellSlot,
} from "@/lib/character/sheet-rest"
import { enrichClassFeatureWithResource } from "@/lib/compendium/class-resource-features"
import { buildDefaultMetamagicOptions } from "@/lib/compendium/system-option-catalogs"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import { resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"
import classes from "@/lib/srd/seed-data/classes.json"
import type { CustomAbility, DndClass, Feature } from "@/lib/types"

const ctx = {
  proficiencyBonus: 3,
  abilityModifiers: { STR: 2, DEX: 2, CON: 2, INT: 2, WIS: 2, CHA: 3 },
}

function detailFromClass(cls: DndClass, level: number): CharacterClassDetail {
  const classId = String(cls.id || cls.name || "class").toLowerCase()
  return {
    row: { class_id: classId, level, subclass_id: null, order: 0 },
    class: { ...cls, id: classId },
    subclass: null,
  }
}

describe("inferClassResourceSpendFromText", () => {
  it("detects Battle Die spend only when that pool is available", () => {
    expect(
      inferClassResourceSpendFromText("You can expend one Battle Die as a Bonus Action.", [
        "battle_dice",
      ]),
    ).toEqual({ resourceKey: "battle_dice", amount: 1 })
    expect(
      inferClassResourceSpendFromText("You can expend one Battle Die as a Bonus Action.", [
        "risk_dice",
      ]),
    ).toBeNull()
  })
})

describe("maneuver spend hooks", () => {
  const battleDice = {
    id: "battle_dice",
    name: "Battle Dice",
    uses: {
      type: "at_level" as const,
      atLevelMode: "tier" as const,
      atLevelTable: [{ level: 1, count: 4 }],
      recharges: [{ rest: "short_rest" as const }, { rest: "long_rest" as const }],
    },
  }

  it("surfaces Captain-style maneuvers that spend a Battle Die", () => {
    const actions = collectSheetActions({
      classDetails: [
        {
          row: { class_id: "captain-1", level: 3, subclass_id: null, order: 0 },
          class: {
            id: "captain-1",
            name: "Captain",
            class_resources: [battleDice],
            features: [],
          } as unknown as CharacterClassDetail["class"],
          subclass: null,
        },
      ],
      species: null,
      customAbilities: [
        {
          id: "bolster",
          name: "Bolster",
          description:
            "<p>When you hit a creature with an attack, you can expend one Battle Die as a Bonus Action to rally an ally.</p>",
          ability_role: "knack",
          attached_to_type: "class",
          attached_to_id: "captain-1",
        } as CustomAbility,
      ],
    })
    const bolster = actions.find((action) => action.name === "Bolster")
    expect(bolster?.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "battle_dice",
      classResourceAmount: 1,
    })
    expect(bolster?.kinds).toEqual(["bonus"])
    expect(bolster?.classId).toBe("captain-1")
    expect(bolster?.healEffects?.some((effect) => effect.healTarget === "choose_ally")).toBe(true)
  })

  it("lets Rally heal and Blitz command a chosen ally or cohort", () => {
    const actions = collectSheetActions({
      classDetails: [
        {
          row: { class_id: "captain-1", level: 5, subclass_id: null, order: 0 },
          class: {
            id: "captain-1",
            name: "Captain",
            class_resources: [battleDice],
            features: [
              {
                level: 5,
                name: "Blitz",
                description:
                  "Once on each of your turns, you can direct your Cohort or an ally within 60 feet of yourself that can see or hear you. The chosen creature can take a Reaction to move up to its Speed or make one attack with a weapon or Unarmed Strike.",
              },
            ],
          } as unknown as CharacterClassDetail["class"],
          subclass: null,
        },
      ],
      species: null,
      customAbilities: [
        {
          id: "rally",
          name: "Rally",
          description:
            "<p>As a Bonus Action on your turn, you can expend one Battle Die to choose one ally within 60 feet of yourself that can see or hear you. That creature regains Hit Points equal to the number rolled + your Charisma modifier.</p>",
          ability_role: "knack",
          attached_to_type: "class",
          attached_to_id: "captain-1",
        } as CustomAbility,
      ],
    })
    const rally = actions.find((action) => action.name === "Rally")
    expect(rally?.healEffects?.[0]).toMatchObject({
      kind: "heal_self",
      healTarget: "choose_ally",
      healAbility: "CHA",
    })
    const blitz = actions.find((action) => action.name === "Blitz")
    expect(blitz).toBeDefined()
    expect(blitz?.healEffects?.[0]).toMatchObject({
      kind: "modify_creature",
      healTarget: "choose_ally",
    })
    expect(blitz?.spendsEconomy).toBe(false)
    expect(blitz?.kinds).not.toContain("reaction")
    expect(blitz?.trigger).toBe("Once on each of your turns")
  })

  it("surfaces Warmage Kings disciplines that spend a Battle Die with no listed action", () => {
    const actions = collectSheetActions({
      classDetails: [
        {
          row: { class_id: "warmage-1", level: 3, subclass_id: null, order: 0 },
          class: {
            id: "warmage-1",
            name: "Warmage",
            class_resources: [battleDice],
            features: [],
          } as unknown as CharacterClassDetail["class"],
          subclass: null,
        },
      ],
      species: null,
      customAbilities: [
        {
          id: "flash",
          name: "Flash of Brilliance",
          description:
            "<p>When you fail an Intelligence or Wisdom check, you can expend one Battle Die to add it to the roll.</p>",
          ability_role: "discipline",
          attached_to_type: "class",
          attached_to_id: "warmage-1",
        } as CustomAbility,
      ],
    })
    const flash = actions.find((action) => action.name === "Flash of Brilliance")
    expect(flash?.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "battle_dice",
    })
    expect(flash?.kinds).toEqual(["action"])
    expect(flash?.spendsEconomy).toBe(false)
  })
})

describe("SRD 2024 class resource tables", () => {
  it("uses the 2024 Rage table with short-rest +1", () => {
    const rage = SRD_CLASS_RESOURCES_BY_NAME.Barbarian.find((row) => row.id === "rage")!
    expect(rage.uses.atLevelTable).toEqual([
      { level: 1, count: 2 },
      { level: 3, count: 3 },
      { level: 6, count: 4 },
      { level: 12, count: 5 },
      { level: 17, count: 6 },
    ])
    expect(rage.uses.recharges).toEqual(
      expect.arrayContaining([{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }]),
    )
    expect(resolveUsesAtLevel(rage.uses, 1, ctx)).toBe(2)
    expect(resolveUsesAtLevel(rage.uses, 12, ctx)).toBe(5)
  })

  it("uses the 2024 Wild Shape table with short-rest +1", () => {
    const wildShape = SRD_CLASS_RESOURCES_BY_NAME.Druid.find((row) => row.id === "wild_shape")!
    expect(wildShape.uses.atLevelTable).toEqual([
      { level: 2, count: 2 },
      { level: 6, count: 3 },
      { level: 17, count: 4 },
    ])
    expect(wildShape.uses.recharges).toEqual(
      expect.arrayContaining([{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }]),
    )
  })
})

describe("Warlock Magical Cunning and Mystic Arcanum", () => {
  const enriched = enrichSrdClassList(classes as Record<string, unknown>[])
  const warlock = enriched.find((row) => row.name === "Warlock") as unknown as DndClass

  it("tracks Magical Cunning once per long rest and restores half pact slots", () => {
    const actions = collectSheetActions({
      classDetails: [detailFromClass(warlock, 11)],
      species: null,
    })
    const cunning = actions.find((action) => action.name === "Magical Cunning")
    expect(cunning?.limitedUses).toMatchObject({
      type: "fixed",
      fixedAmount: 1,
      recharges: [{ rest: "long_rest" }],
    })
    expect(cunning?.restorePactSlotsOnUse).toBe("half_round_up")
    expect(cunning?.spendsEconomy).toBe(false)
  })

  it("restores all pact slots when Eldritch Master is unlocked", () => {
    const actions = collectSheetActions({
      classDetails: [detailFromClass(warlock, 20)],
      species: null,
    })
    const cunning = actions.find((action) => action.name === "Magical Cunning")
    expect(cunning?.restorePactSlotsOnUse).toBe("all")
  })

  it("unlocks Mystic Arcanum tiers at 11/13/15/17", () => {
    const feature = (warlock.features as Feature[]).find((row) => row.name === "Mystic Arcanum")
    const grants =
      feature?.linkedModifiers
        ?.flatMap((mod) => mod.characteristics ?? [])
        .find((char) => char.type === "spells_known")?.choiceGrants ?? []
    expect(grants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: 6, unlocksAtClassLevel: 11 }),
        expect.objectContaining({ level: 7, unlocksAtClassLevel: 13 }),
        expect.objectContaining({ level: 8, unlocksAtClassLevel: 15 }),
        expect.objectContaining({ level: 9, unlocksAtClassLevel: 17 }),
      ]),
    )
  })
})

describe("feature resource refresh", () => {
  const enriched = enrichSrdClassList(classes as Record<string, unknown>[])
  const bard = enriched.find((row) => row.name === "Bard") as unknown as DndClass
  const rogue = enriched.find((row) => row.name === "Rogue") as unknown as DndClass

  it("lets Font of Inspiration restore Bardic Inspiration on a short rest", () => {
    const bardDetail = detailFromClass(bard, 5)
    const effects = collectResourceRefreshEffects([bardDetail])
    const font = effects.find((effect) => /font of inspiration/i.test(effect.featureName))
    expect(font).toMatchObject({
      resourceKey: "bardic_inspiration",
      onRest: "short_or_long_rest",
    })
    const resourceId = `${bardDetail.row.class_id}_bardic_inspiration`

    const result = applySheetRest({
      rest: "short_rest",
      maxHp: 30,
      activeConditions: [],
      usedSpellSlotsByKey: {},
      spellSlotTables: [],
      usedResourcesById: { [resourceId]: 3 },
      resourceEntries: [
        {
          id: resourceId,
          name: "Bardic Inspiration",
          uses: SRD_CLASS_RESOURCES_BY_NAME.Bard.find((row) => row.id === "bardic_inspiration")!.uses,
          classLevel: 5,
        },
      ],
      usedActionUsesById: {},
      sheetActions: [],
      resolveContext: ctx,
      resourceRefreshEffects: effects,
    })
    expect(result.usedResourcesById[resourceId]).toBe(0)
  })

  it("fills Superior Inspiration until 2 remain on initiative", () => {
    const bardDetail = detailFromClass(bard, 18)
    const effects = collectResourceRefreshEffects([bardDetail])
    const superior = effects.find((effect) => /superior inspiration/i.test(effect.featureName))
    expect(superior?.fillUntilRemaining).toBe(2)
    const resourceId = `${bardDetail.row.class_id}_bardic_inspiration`

    const refreshed = applyFeatureResourceRefresh({
      usedResourcesById: { [resourceId]: 4 },
      resourceEntries: [
        {
          id: resourceId,
          uses: {
            type: "ability_modifier",
            abilityModifier: "CHA",
            recharges: [{ rest: "long_rest" }],
          },
          classLevel: 18,
        },
      ],
      resolveContext: ctx,
      effects,
      trigger: "initiative",
    })
    expect(refreshed.usedResourcesById[resourceId]).toBe(1)
  })

  it("restores one die on initiative and on a critical hit, not the whole pool", () => {
    const resourceId = "gunslinger_risk_dice"
    const detail: CharacterClassDetail = {
      row: { class_id: "gunslinger", level: 15, subclass_id: null, order: 0 },
      class: {
        id: "gunslinger",
        name: "Gunslinger",
        features: [
          {
            name: "Dire Gambit",
            level: 15,
            description:
              "When you roll initiative or score a critical hit, you regain one expended Risk Die.",
            linkedModifiers: [
              {
                instanceId: "dire_gambit",
                catalogRefId: "cat_fx_class_resource",
                activation: {
                  effects: [
                    {
                      id: "mod_dire_gambit_init",
                      kind: "class_resource",
                      classResourceKey: "risk_dice",
                      classResourceChange: "increase",
                      classResourceAmount: 1,
                      resourceRefreshOnInitiative: true,
                      resourceRefreshOnCriticalHit: true,
                    },
                  ],
                },
              },
            ],
          },
        ],
      } as unknown as DndClass,
    }
    const effects = collectResourceRefreshEffects([detail])
    const dire = effects.find((effect) => /dire gambit/i.test(effect.featureName))
    expect(dire).toMatchObject({
      resourceKey: "risk_dice",
      onInitiative: true,
      onCriticalHit: true,
      restoreAmount: 1,
    })

    const resourceEntries = [
      {
        id: resourceId,
        uses: { type: "fixed" as const, fixedAmount: 5, rechargeOnInitiative: true },
        classLevel: 15,
      },
    ]
    const afterPool = applyInitiativeResourceRecharge(
      { [resourceId]: 4 },
      resourceEntries,
      ctx,
      effects.filter((effect) => effect.onInitiative).map((effect) => effect.resourceKey),
    )
    expect(afterPool[resourceId]).toBe(4)

    const onInitiative = applyFeatureResourceRefresh({
      usedResourcesById: afterPool,
      resourceEntries,
      resolveContext: ctx,
      effects,
      trigger: "initiative",
    })
    expect(onInitiative.usedResourcesById[resourceId]).toBe(3)

    const onCrit = applyFeatureResourceRefresh({
      usedResourcesById: { [resourceId]: 3 },
      resourceEntries,
      resolveContext: ctx,
      effects,
      trigger: "critical_hit",
    })
    expect(onCrit.usedResourcesById[resourceId]).toBe(2)
  })

  it("infers a critical-hit restore from initiative wiring plus feature prose", () => {
    const resourceId = "gunslinger_risk_dice"
    const detail: CharacterClassDetail = {
      row: { class_id: "gunslinger", level: 15, subclass_id: null, order: 0 },
      class: {
        id: "gunslinger",
        name: "Gunslinger",
        features: [
          {
            name: "Dire Gambit",
            level: 15,
            description: "Regain one Risk Die when you roll initiative or score a critical hit.",
            linkedModifiers: [
              {
                instanceId: "dire_legacy",
                catalogRefId: "cat_fx_class_resource",
                activation: {
                  effects: [
                    {
                      id: "mod_dire_gambit_init",
                      kind: "class_resource",
                      classResourceKey: "risk_dice",
                      classResourceChange: "reset",
                      resourceRefreshOnInitiative: true,
                    },
                  ],
                },
              },
            ],
          },
        ],
      } as unknown as DndClass,
    }
    const effects = collectResourceRefreshEffects([detail])
    const dire = effects.find((effect) => /dire gambit/i.test(effect.featureName))
    expect(dire).toMatchObject({
      onInitiative: true,
      onCriticalHit: true,
      restoreAmount: 1,
    })

    const refreshed = applyFeatureResourceRefresh({
      usedResourcesById: { [resourceId]: 4 },
      resourceEntries: [
        {
          id: resourceId,
          uses: { type: "fixed", fixedAmount: 5 },
          classLevel: 15,
        },
      ],
      resolveContext: ctx,
      effects,
      trigger: "critical_hit",
    })
    expect(refreshed.usedResourcesById[resourceId]).toBe(3)
  })

  it("lets Stroke of Luck recharge on a short rest", () => {
    const feature = (rogue.features as Feature[]).find((row) => row.name === "Stroke of Luck")
    const uses = feature?.linkedModifiers
      ?.flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "uses")?.uses
    expect(uses?.recharges).toEqual(
      expect.arrayContaining([{ rest: "short_rest" }, { rest: "long_rest" }]),
    )
  })
})

describe("Martyr spell uses", () => {
  it("spends one Spell Use for a 1st-level spell", () => {
    const result = resolveSpellCastCost({
      spellLevel: 1,
      spellcasting: { ability: "Wisdom" },
      classRow: {
        class_resources: [
          {
            id: "spell_uses",
            name: "Spell Uses",
            uses: {
              type: "at_level",
              atLevelMode: "tier",
              atLevelTable: [{ level: 1, count: 2 }],
              recharges: [{ rest: "long_rest" }],
            },
          },
        ],
      },
      classLevel: 3,
      availablePoints: 2,
      selectedMetamagic: [],
      ctx,
    })
    expect(result.mode).toBe("resource")
    expect(result.resourceKey).toBe("spell_uses")
    expect(result.baseCost).toBe(1)
    expect(result.canCast).toBe(true)
    expect(result.hitPointsCost).toBe(0)
  })

  it("adds Hit Point Spellcasting cost for the created slot level", () => {
    const result = resolveSpellCastCost({
      spellLevel: 5,
      spellcasting: {
        ability: "Wisdom",
        hit_point_cost_by_level: { 1: 5, 2: 10, 3: 20, 4: 30, 5: 45 },
      },
      classRow: {
        class_resources: [
          {
            id: "spell_uses",
            name: "Spell Uses",
            uses: {
              type: "at_level",
              atLevelMode: "tier",
              atLevelTable: [{ level: 1, count: 2 }],
              recharges: [{ rest: "long_rest" }],
            },
          },
        ],
      },
      classLevel: 17,
      availablePoints: 2,
      selectedMetamagic: [],
      ctx,
    })
    expect(result.mode).toBe("resource")
    expect(result.hitPointsCost).toBe(45)
    expect(result.canCast).toBe(true)
  })

  it("does not spend Spell Uses on cantrips", () => {
    const result = resolveSpellCastCost({
      spellLevel: 0,
      spellcasting: { ability: "Wisdom" },
      classRow: {
        class_resources: [
          {
            id: "spell_uses",
            name: "Spell Uses",
            uses: {
              type: "at_level",
              atLevelMode: "tier",
              atLevelTable: [{ level: 1, count: 2 }],
            },
          },
        ],
      },
      classLevel: 3,
      availablePoints: 0,
      selectedMetamagic: [],
      ctx,
    })
    expect(result.mode).toBe("slots")
    expect(result.baseCost).toBe(0)
  })
})

describe("pact slot restore helpers", () => {
  it("restores half of max pact slots rounded up", () => {
    expect(pactSlotRestoreCount([0, 0, 2, 0, 0, 0, 0, 0, 0], "half_round_up")).toBe(1)
    expect(pactSlotRestoreCount([0, 0, 0, 0, 3, 0, 0, 0, 0], "half_round_up")).toBe(2)
    expect(restoreExpendedSpellSlots([0, 0, 2, 0, 0, 0, 0, 0, 0], 1)).toEqual([
      0, 0, 1, 0, 0, 0, 0, 0, 0,
    ])
    expect(restoreExpendedSpellSlots([0, 0, 2, 0, 0, 0, 0, 0, 0], "all")).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
  })
})

describe("remaining SRD and MHP spend hooks", () => {
  const enriched = enrichSrdClassList(classes as Record<string, unknown>[])
  const wizard = enriched.find((row) => row.name === "Wizard") as unknown as DndClass
  const druid = enriched.find((row) => row.name === "Druid") as unknown as DndClass

  it("lets Arcane Recovery restore slots by combined level", () => {
    const actions = collectSheetActions({
      classDetails: [detailFromClass(wizard, 10)],
      species: null,
    })
    const recovery = actions.find((action) => action.name === "Arcane Recovery")
    expect(recovery?.restoreSpellSlotsOnUse).toEqual({
      mode: "combined_level_half_up",
      maxSlotLevel: 5,
    })
    expect(restoreSpellSlotsByCombinedLevel([2, 1, 1, 0, 0, 1], 5, 5)).toEqual([
      2, 0, 0, 0, 0, 1,
    ])
  })

  it("refills one Wild Shape on initiative at Archdruid, not the whole pool", () => {
    const effects = collectResourceRefreshEffects([detailFromClass(druid, 20)])
    const evergreen = effects.find((effect) => /evergreen|archdruid/i.test(effect.featureName))
    expect(evergreen?.fillUntilRemaining).toBe(1)
    expect(evergreen?.onInitiative).toBe(true)
  })

  it("spends a Bardic Inspiration die on Mantle of Inspiration", () => {
    const mantle = enrichClassFeatureWithModifierPresets(
      "Bard",
      { name: "Mantle of Inspiration", level: 3, description: "Grant temporary hit points." },
      "College of Glamour",
    )
    expect(mantle.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "bardic_inspiration",
      classResourceAmount: 1,
    })
  })

  it("offers a free reduce and a 1-Focus redirect on Deflect Attacks", () => {
    const deflect = enrichClassFeatureWithModifierPresets("Monk", {
      name: "Deflect Attacks",
      level: 2,
      description: "Reduce damage from an attack.",
    })
    const menu = (deflect.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "resource_ability_menu")
    expect(menu).toMatchObject({
      resourceKey: "focus_points",
      options: expect.arrayContaining([
        expect.objectContaining({ name: "Reduce Damage", resourceCost: 0 }),
        expect.objectContaining({ name: "Redirect Attack", resourceCost: 1 }),
      ]),
    })
  })

  it("infers Dance and Charnel Touch spends from prose", () => {
    expect(
      inferClassResourceSpendFromText("You can expend a Dance to cast Charm Person.", ["dances"]),
    ).toEqual({ resourceKey: "dances", amount: 1 })
    expect(
      inferClassResourceSpendFromText("Expend 10 Charnel Touch points.", ["charnel_touch"]),
    ).toEqual({ resourceKey: "charnel_touch", amount: 10 })
    expect(charnelTouchRestoreFromSlot(3, 2)).toBe(11)
  })

  it("does not spend a flat 1 Sorcery Point on the Metamagic feature", () => {
    const sorcerer = enriched.find((row) => row.name === "Sorcerer") as unknown as DndClass
    const metamagic = (sorcerer.features ?? []).find((feature) => feature.name === "Metamagic")
    expect(metamagic?.limitedUses?.type).not.toBe("class_resource")
    const resourceOnly = enrichClassFeatureWithResource("Sorcerer", {
      name: "Metamagic",
      level: 2,
      description: "Choose Metamagic options.",
    })
    expect(resourceOnly.limitedUses).toBeFalsy()
    const catalog = buildDefaultMetamagicOptions()
    expect(catalog.find((row) => row.name === "Heightened Spell")?.summary).toMatch(/Cost:\s*2\s*SP/i)
    expect(catalog.find((row) => row.name === "Quickened Spell")?.summary).toMatch(/Cost:\s*2\s*SP/i)
  })

  it("restores Hurl Through Hell by expending a Pact Magic slot", () => {
    const hurl = enrichClassFeatureWithModifierPresets(
      "Warlock",
      { name: "Hurl Through Hell", level: 14, description: "Hurl a creature through the Lower Planes." },
      "Fiend",
    )
    expect(hurl.limitedUses).toMatchObject({
      type: "fixed",
      fixedAmount: 1,
      restoreBySpellSlot: { minSpellLevel: 1, restores: 1 },
    })
    const damage = (hurl.linkedModifiers ?? [])
      .flatMap((mod) => mod.activation?.effects ?? [])
      .find((effect) => effect.kind === "extra_damage_on_hit")
    expect(damage?.bonusDice).toBe("8d10")
  })

  it("offers Protective Field, Psionic Strike, and Telekinetic Movement on Psi Warrior", () => {
    const power = enrichClassFeatureWithModifierPresets(
      "Fighter",
      { name: "Psionic Power", level: 3, description: "You harbor a wellspring of psionic energy." },
      "Psi Warrior",
    )
    const menu = (power.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "resource_ability_menu")
    expect(menu).toMatchObject({
      resourceKey: "psionic_energy_dice",
      options: expect.arrayContaining([
        expect.objectContaining({ name: "Protective Field", resourceCost: 1 }),
        expect.objectContaining({ name: "Psionic Strike", resourceCost: 1 }),
        expect.objectContaining({ name: "Telekinetic Movement", resourceCost: 1 }),
      ]),
    })
  })

  it("adds Psychic Teleportation to Soul Blades", () => {
    const blades = enrichClassFeatureWithModifierPresets(
      "Rogue",
      { name: "Soul Blades", level: 9, description: "Your Psychic Blades improve." },
      "Soulknife",
    )
    const menu = (blades.linkedModifiers ?? [])
      .flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "resource_ability_menu")
    expect(menu).toMatchObject({
      resourceKey: "psionic_energy_dice",
      options: expect.arrayContaining([
        expect.objectContaining({ name: "Psychic Teleportation", resourceCost: 1, actionKind: "bonus" }),
      ]),
    })
  })

  it("spends a spell slot when Traditional Expertise is used", () => {
    expect(spendLowestAvailableSpellSlot([0, 0, 0], [4, 3, 2], 1)).toEqual({
      nextUsed: [1, 0, 0],
      spentLevel: 1,
    })
    expect(spendLowestAvailableSpellSlot([4, 3, 0], [4, 3, 2], 1)).toEqual({
      nextUsed: [4, 3, 1],
      spentLevel: 3,
    })
    expect(spendLowestAvailableSpellSlot([4, 3, 2], [4, 3, 2], 1)).toBeNull()
    const actions = collectSheetActions({
      classDetails: [
        {
          row: { class_id: "occultist-1", level: 10, subclass_id: null, order: 0 },
          class: {
            id: "occultist-1",
            name: "Occultist",
            features: [
              {
                name: "Traditional Expertise",
                level: 10,
                description: "Expend a spell slot to gain advantage on a Wisdom check.",
                activation: { action: true, noEconomyCost: true },
              },
            ],
          } as unknown as CharacterClassDetail["class"],
          subclass: null,
        },
      ],
      species: null,
    })
    const expertise = actions.find((action) => action.name === "Traditional Expertise")
    expect(expertise?.spendSpellSlotOnUse).toEqual({ minSpellLevel: 1 })
    expect(expertise?.spendsEconomy).toBe(false)
  })
})

describe("spell-slot hooks come from class_resource effects, not feature names", () => {
  function slotEffectClass(featureName: string, effect: Record<string, unknown>) {
    return {
      row: { class_id: "homebrew-1", level: 12, subclass_id: null, order: 0 },
      class: {
        id: "homebrew-1",
        name: "Homebrew",
        features: [
          {
            name: featureName,
            level: 1,
            description: "Wired through the Compendium row.",
            activation: { action: true, noEconomyCost: true },
            linkedModifiers: [
              {
                instanceId: `modinst_${featureName.toLowerCase().replace(/\W+/g, "_")}`,
                catalogRefId: "cat_fx_class_resource",
                activation: { effects: [{ id: "mod_slot_effect", ...effect }] },
              },
            ],
          },
        ],
      } as unknown as CharacterClassDetail["class"],
      subclass: null,
    }
  }

  it("restores pact slots from a pact_magic_slots reset effect", () => {
    const actions = collectSheetActions({
      classDetails: [
        slotEffectClass("Occult Refresh", {
          kind: "class_resource",
          classResourceKey: "pact_magic_slots",
          classResourceChange: "reset",
          resourceRefreshFormula: "half_level",
        }),
      ],
      species: null,
    })
    expect(
      actions.find((action) => action.name === "Occult Refresh")?.restorePactSlotsOnUse,
    ).toBe("half_round_up")
  })

  it("upgrades to a full pact restore when another feature links to it", () => {
    const pactRefresh = slotEffectClass("Occult Refresh", {
      kind: "class_resource",
      classResourceKey: "pact_magic_slots",
      classResourceChange: "reset",
      resourceRefreshFormula: "half_level",
    })
    const upgrade = slotEffectClass("Occult Mastery", {
      kind: "class_resource",
      classResourceKey: "pact_magic_slots",
      classResourceChange: "reset",
      regainAllOnLinkedFeatureUse: true,
      linkedFeatureName: "Occult Refresh",
    })
    const features = [
      ...((pactRefresh.class?.features ?? []) as Feature[]),
      ...((upgrade.class?.features ?? []) as Feature[]),
    ]
    const actions = collectSheetActions({
      classDetails: [
        { ...pactRefresh, class: { ...pactRefresh.class, features } as typeof pactRefresh.class },
      ],
      species: null,
    })
    expect(
      actions.find((action) => action.name === "Occult Refresh")?.restorePactSlotsOnUse,
    ).toBe("all")
  })

  it("recovers spell slots by combined level and honours the authored slot-level ceiling", () => {
    const actions = collectSheetActions({
      classDetails: [
        slotEffectClass("Studied Recovery", {
          kind: "class_resource",
          classResourceKey: "spell_slots",
          classResourceChange: "reset",
          resourceRefreshFormula: "half_level",
          spellSlotMaxLevel: 4,
        }),
      ],
      species: null,
    })
    expect(
      actions.find((action) => action.name === "Studied Recovery")?.restoreSpellSlotsOnUse,
    ).toEqual({ mode: "combined_level_half_up", maxSlotLevel: 4 })
  })

  it("spends a spell slot from a spell_slots reduce effect", () => {
    const actions = collectSheetActions({
      classDetails: [
        slotEffectClass("Ritual Insight", {
          kind: "class_resource",
          classResourceKey: "spell_slots",
          classResourceChange: "reduce",
          spellSlotMinLevel: 2,
        }),
      ],
      species: null,
    })
    expect(actions.find((action) => action.name === "Ritual Insight")?.spendSpellSlotOnUse).toEqual(
      { minSpellLevel: 2 },
    )
  })

  it("converts a spell slot into a class resource from an increase effect", () => {
    const actions = collectSheetActions({
      classDetails: [
        slotEffectClass("Grave Bargain", {
          kind: "class_resource",
          classResourceKey: "charnel_touch",
          classResourceChange: "increase",
          restoreFromSpellSlot: true,
          classResourceAmountConfig: { mode: "ability_modifier", ability: "INT" },
        }),
      ],
      species: null,
    })
    expect(
      actions.find((action) => action.name === "Grave Bargain")?.restoreResourceFromSpellSlotOnUse,
    ).toEqual({ resourceKey: "charnel_touch", ability: "INT" })
  })

  it("wires the SRD Warlock and Wizard rows through the catalog rather than the legacy names", () => {
    const enriched = enrichSrdClassList(classes as Record<string, unknown>[])
    const findEffect = (className: string, featureName: string) => {
      const cls = enriched.find((row) => row.name === className) as unknown as DndClass
      const feature = (cls.features as Feature[]).find((row) => row.name === featureName)
      return (feature?.linkedModifiers ?? []).flatMap(
        (instance) => instance.activation?.effects ?? [],
      )
    }
    expect(findEffect("Warlock", "Magical Cunning")).toContainEqual(
      expect.objectContaining({
        kind: "class_resource",
        classResourceKey: "pact_magic_slots",
        classResourceChange: "reset",
      }),
    )
    expect(findEffect("Wizard", "Arcane Recovery")).toContainEqual(
      expect.objectContaining({
        kind: "class_resource",
        classResourceKey: "spell_slots",
        spellSlotMaxLevel: 5,
      }),
    )
  })
})

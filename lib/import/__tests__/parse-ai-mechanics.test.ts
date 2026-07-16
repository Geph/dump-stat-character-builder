import { describe, expect, it } from "vitest"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import {
  collectImportModifierPreviews,
  removeImportModifierPreview,
} from "@/lib/import/import-modifier-previews"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"
import { sanitizeImportContentForPersist } from "@/lib/import/sanitize-import-content"
import type { ImportContent } from "@/lib/import/content-schema"

describe("aiMechanicsToDetections", () => {
  it("builds skill proficiency from AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [{ kind: "skills", skills: ["Stealth"], sourcePhrase: "You gain proficiency in Stealth." }],
      {
        contentKind: "class_feature",
        sourceName: "Rogue",
        featureName: "Skilled",
      },
    )
    expect(detections).toHaveLength(1)
    expect(detections[0]?.ruleId).toBe("ai.skills")
    expect(detections[0]?.instance.catalogRefId).toBe("cat_char_skills")
  })

  it("drops invalid AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [{ kind: "ac" }],
      { contentKind: "feat", featureName: "Bad AC" },
    )
    expect(detections).toEqual([])
  })

  it("builds spellcasting ability from AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "spellcasting_ability",
          spellcastingAbility: "intelligence",
          sourcePhrase: "Intelligence is your spellcasting ability for these spells.",
        },
      ],
      { contentKind: "feat", featureName: "Rimekin" },
    )
    expect(detections).toHaveLength(1)
    expect(detections[0]?.ruleId).toBe("ai.spellcasting_ability")
    expect(detections[0]?.instance.characteristics?.[0]?.type).toBe("spellcasting_ability")
  })

  it("builds creature-type damage from AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "damage_roll_modifiers",
          bonusDice: "2d10",
          damageType: "Radiant",
          targetCreatureTypes: ["Aberration"],
          sourcePhrase:
            "when you hit an Aberration with this weapon, the Aberration takes an extra 2d10 Radiant damage",
        },
      ],
      {
        contentKind: "class_feature",
        sourceName: "Item",
        featureName: "Shaarat'doovol",
      },
    )
    expect(detections).toHaveLength(1)
    expect(detections[0]?.ruleId).toBe("ai.damage.creature_type")
    const mod = detections[0]?.instance.characteristics?.[0]
    expect(mod?.type).toBe("damage_roll_modifiers")
    if (mod?.type === "damage_roll_modifiers") {
      expect(mod.entries[0]?.onlyVsCreatureTypes).toEqual(["Aberration"])
    }
  })

  it("wires on_hit_trigger's bonus damage as a nested damage_roll_modifiers effect (Psi Warrior's Psionic Strike)", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "on_hit_trigger",
          triggerOn: "hit",
          oncePerTurn: true,
          bonusDice: "1d6",
          damageType: "Force",
          spendResourceKey: "psionic_energy_dice",
          spendResourceAmount: 1,
          sourcePhrase: "you can expend one Psionic Energy Die, rolling it and dealing Force damage",
        },
      ],
      { contentKind: "subclass_feature", sourceName: "Psi Warrior", featureName: "Psionic Power" },
    )
    expect(detections).toHaveLength(1)
    const trigger = detections[0]?.instance.characteristics?.[0]
    expect(trigger?.type).toBe("on_hit_trigger")
    if (trigger?.type !== "on_hit_trigger") throw new Error("expected on_hit_trigger")
    expect(trigger.spendResourceKey).toBe("psionic_energy_dice")
    expect(trigger.effect?.catalogRefId).toBe("cat_char_damage_roll_modifiers")
    const nested = trigger.effect?.characteristics?.[0]
    expect(nested?.type).toBe("damage_roll_modifiers")
    if (nested?.type === "damage_roll_modifiers") {
      expect(nested.entries[0]?.customTarget).toBe("1d6 Force")
    }
  })

  it("omits the nested on_hit_trigger effect when no bonusDice is given", () => {
    const detections = aiMechanicsToDetections(
      [{ kind: "on_hit_trigger", triggerOn: "hit", sourcePhrase: "some untyped on-hit rider" }],
      { contentKind: "class_feature", featureName: "Untyped Rider" },
    )
    const trigger = detections[0]?.instance.characteristics?.[0]
    expect(trigger?.type).toBe("on_hit_trigger")
    if (trigger?.type === "on_hit_trigger") {
      expect(trigger.effect).toBeUndefined()
    }
  })

  it("wires a fixed-amount, on-activation, self-target temporary_hit_points mechanic", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "temporary_hit_points",
          amount: 5,
          sourcePhrase: "you gain 5 temporary hit points",
        },
      ],
      { contentKind: "class_feature", sourceName: "Test Class", featureName: "Bolstering Strike" },
    )
    expect(detections).toHaveLength(1)
    expect(detections[0]?.ruleId).toBe("ai.temporary_hit_points")
    expect(detections[0]?.instance.catalogRefId).toBe("cat_fx_grant_temp_hp")
    const effect = detections[0]?.instance.activation?.effects?.[0]
    expect(effect?.kind).toBe("grant_temp_hp")
    expect(effect?.healMode).toBe("fixed")
    expect(effect?.healFixed).toBe(5)
  })

  it("wires amountDice and amountScaling variants of temporary_hit_points", () => {
    const dice = aiMechanicsToDetections(
      [{ kind: "temporary_hit_points", amountDice: "2d6" }],
      { contentKind: "class_feature", featureName: "Dice THP" },
    )
    const diceEffect = dice[0]?.instance.activation?.effects?.[0]
    expect(diceEffect?.healMode).toBe("dice")
    expect(diceEffect?.healDiceCount).toBe(2)
    expect(diceEffect?.healDieType).toBe("d6")

    const byLevel = aiMechanicsToDetections(
      [{ kind: "temporary_hit_points", amountScaling: "character_level", amount: 1 }],
      { contentKind: "class_feature", featureName: "Level-Scaled THP" },
    )
    const levelEffect = byLevel[0]?.instance.activation?.effects?.[0]
    expect(levelEffect?.healMode).toBe("character_level")
    expect(levelEffect?.healLevelMultiplier).toBe(1)

    const byAbility = aiMechanicsToDetections(
      [{ kind: "temporary_hit_points", amountScaling: "ability_modifier", ability: "constitution" }],
      { contentKind: "class_feature", featureName: "CON-Scaled THP" },
    )
    const abilityEffect = byAbility[0]?.instance.activation?.effects?.[0]
    expect(abilityEffect?.healMode).toBe("ability_modifier")
    expect(abilityEffect?.healAbility).toBe("CON")

    const byProf = aiMechanicsToDetections(
      [{ kind: "temporary_hit_points", amountScaling: "proficiency" }],
      { contentKind: "feat", featureName: "Chef Treats" },
    )
    const profEffect = byProf[0]?.instance.activation?.effects?.[0]
    expect(profEffect?.healMode).toBe("proficiency")
    expect(profEffect?.healProficiencyMultiplier).toBe(1)
  })

  it("does not wire check_roll_modifier when conditionNote is set", () => {
    expect(
      aiMechanicsToDetections(
        [
          {
            kind: "check_roll_modifier",
            checkRollMode: "advantage",
            checkCategory: "skill",
            checkSkills: ["Performance"],
            conditionNote: "that involves you dancing",
            sourcePhrase: "advantage on Performance checks that involve you dancing",
          },
        ],
        { contentKind: "feat", featureName: "Actor" },
      ),
    ).toEqual([])
  })

  it("wires flat damageBonus on damage_roll_modifiers", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "damage_roll_modifiers",
          damageBonus: 2,
          damageTarget: "melee",
          sourcePhrase: "when you are wielding a melee weapon in one hand",
        },
      ],
      { contentKind: "feat", featureName: "Dueling" },
    )
    expect(detections).toHaveLength(1)
    const char = detections[0]?.instance.characteristics?.[0]
    expect(char?.type).toBe("damage_roll_modifiers")
    if (char?.type === "damage_roll_modifiers") {
      expect(char.entries?.[0]).toMatchObject({ bonus: 2, target: "melee" })
    }
  })

  it("does not wire temporary_hit_points triggers/targets the sheet can't apply yet", () => {
    // turn_start / on_hit triggers have no "grant temp HP" field on those characteristics.
    expect(
      aiMechanicsToDetections(
        [{ kind: "temporary_hit_points", amount: 5, thpTrigger: "turn_start" }],
        { contentKind: "class_feature", featureName: "Turn Start THP" },
      ),
    ).toEqual([])
    // Granting temp HP to another creature has no target on a single-character sheet.
    expect(
      aiMechanicsToDetections(
        [{ kind: "temporary_hit_points", amount: 5, thpTarget: "allies_in_range" }],
        { contentKind: "class_feature", featureName: "Ally THP" },
      ),
    ).toEqual([])
  })

  it("does not wire temporary_hit_points when the LLM mis-keys thpTrigger as generic `trigger` (Improved Warding Flare, Cleric domains audit)", () => {
    // Real-world case: the LLM emitted `trigger: "on_use"` / `target: "chosen_creature_in_range"`
    // instead of `thpTrigger` / `thpTarget`. Before the guard, thpTrigger/thpTarget silently
    // defaulted to "on_activation"/"self" and produced a bogus self-targeted "activate for temp
    // HP" effect on a feature that isn't independently activatable and doesn't target self at all.
    expect(
      aiMechanicsToDetections(
        [
          {
            kind: "temporary_hit_points",
            amountDice: "2d6",
            amountScaling: "ability_modifier",
            ability: "wisdom",
            trigger: "on_use",
            sourcePhrase: "give the target of the triggering attack temporary hit points",
          },
        ],
        { contentKind: "subclass_feature", featureName: "Improved Warding Flare" },
      ),
    ).toEqual([])
  })

  it("wires movement_grant (self-targeted) onto a movement_option fx effect", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "movement_grant",
          distanceMode: "fixed",
          distanceFeet: 60,
          trigger: "bonus_action",
          teleport: true,
          provokesOpportunityAttacks: false,
          sourcePhrase: "you can use a Bonus Action to teleport up to 60 feet",
        },
      ],
      { contentKind: "subclass_feature", featureName: "Shadow Step" },
    )
    expect(detections).toHaveLength(1)
    const instance = detections[0].instance as { activation?: { bonusAction?: boolean; effects?: unknown[] } }
    expect(instance.activation?.bonusAction).toBe(true)
    expect(instance.activation?.effects?.[0]).toMatchObject({
      kind: "movement_option",
      moveDistanceMode: "fixed",
      moveDistanceFixed: 60,
      movementTeleport: true,
      moveWithoutOpportunityAttacks: true,
    })
  })

  it("does not wire movement_grant when targeting other creatures (no characteristic mapping yet)", () => {
    expect(
      aiMechanicsToDetections(
        [
          {
            kind: "movement_grant",
            distanceMode: "fraction_of_speed",
            fraction: 0.5,
            targets: "chosen_creatures_in_range",
          },
        ],
        { contentKind: "class_feature", featureName: "Guiding Hand" },
      ),
    ).toEqual([])
  })

  it("wires weapon_reach_modifier onto a weapon_reach_modifier characteristic", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "weapon_reach_modifier",
          reachBonusFeet: 10,
          weaponPropertyFilter: [],
          requiresSheetToggle: "elemental_attunement_active",
          sourcePhrase: "your reach is 10 feet greater than normal",
        },
      ],
      { contentKind: "subclass_feature", featureName: "Elemental Attunement" },
    )
    expect(detections).toHaveLength(1)
    const characteristics = (detections[0].instance as { characteristics?: unknown[] }).characteristics
    expect(characteristics?.[0]).toMatchObject({
      type: "weapon_reach_modifier",
      reachBonusFeet: 10,
      appliesToUnarmedStrike: true,
      requiresSheetToggle: "elemental_attunement_active",
    })
  })

  it("wires alternateRefresh (spend another resource to restore a use) onto UsesConfig", () => {
    const byResource = aiMechanicsToDetections(
      [
        {
          kind: "uses",
          usesFixed: 1,
          usesRecharge: "long_rest",
          alternateRefresh: {
            spendResourceKey: "bardic_inspiration",
            spendAmount: 1,
            actionCost: "none",
          },
          sourcePhrase: "you can restore it by expending a Bardic Inspiration",
        },
      ],
      { contentKind: "class_feature", featureName: "Homebrew Rider" },
    )
    const uses = byResource[0]?.instance.characteristics?.[0]
    expect(uses?.type).toBe("uses")
    if (uses?.type === "uses") {
      expect(uses.uses?.restoreByResource).toEqual({
        resourceKey: "bardic_inspiration",
        resourceAmount: 1,
        restores: 1,
      })
    }

    const bySpellSlot = aiMechanicsToDetections(
      [
        {
          kind: "uses",
          usesAbility: "WIS",
          usesRecharge: "short_rest",
          alternateRefresh: { spendSpellSlotMinLevel: 1, actionCost: "none" },
        },
      ],
      { contentKind: "class_feature", featureName: "Homebrew Quarry" },
    )
    const usesBySlot = bySpellSlot[0]?.instance.characteristics?.[0]
    expect(usesBySlot?.type).toBe("uses")
    if (usesBySlot?.type === "uses") {
      expect(usesBySlot.uses?.restoreBySpellSlot).toEqual({ minSpellLevel: 1, restores: 1 })
    }
  })

  it("wires a resource-cost-only `uses` mechanic (no usesFixed/usesRecharge) as unlimited, gated by class resource spend", () => {
    // Hand of Healing (Monk, Warrior of Mercy): "expend 1 Focus Point" with no separate
    // per-rest cap of its own — should NOT default to fixed 1/long rest.
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "uses",
          classResourceKey: "focus_points",
          classResourceCost: 1,
          sourcePhrase: "you can expend 1 Focus Point to touch a creature and restore Hit Points",
        },
      ],
      { contentKind: "subclass_feature", featureName: "Hand of Healing" },
    )
    const uses = detections[0]?.instance.characteristics?.[0]
    expect(uses?.type).toBe("uses")
    if (uses?.type === "uses") {
      expect(uses.uses).toEqual({
        type: "class_resource",
        classResourceKey: "focus_points",
        classResourceAmount: 1,
      })
    }
  })

  it("still wires a fixed use cap when usesFixed is explicitly given alongside a class resource cost", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "uses",
          usesFixed: 1,
          usesRecharge: "long_rest",
          classResourceKey: "focus_points",
          classResourceCost: 4,
          sourcePhrase: "expend 4 Focus Points; once per Long Rest",
        },
      ],
      { contentKind: "subclass_feature", featureName: "Homebrew Capped Strike" },
    )
    const uses = detections[0]?.instance.characteristics?.[0]
    expect(uses?.type).toBe("uses")
    if (uses?.type === "uses") {
      expect(uses.uses?.type).toBe("fixed")
      expect(uses.uses?.fixedAmount).toBe(1)
    }
  })

  it("wires requiresSheetToggle on damage modifiers from AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "damage_roll_modifiers",
          bonusDice: "2d6",
          damageType: "Radiant",
          requiresSheetToggle: "magic_item:abc:unyielding",
          sourcePhrase: "while the item grants you benefits",
        },
      ],
      {
        contentKind: "class_feature",
        sourceName: "Item",
        featureName: "Unyielding Duty",
      },
    )
    expect(detections).toHaveLength(1)
    const mod = detections[0]?.instance.characteristics?.[0]
    expect(mod?.requiresSheetToggle).toBe("magic_item:abc:unyielding")
  })

  it("falls back to amountMultiplier for character_level temp HP scaling when amount is mis-keyed", () => {
    // "You gain Temp HP equal to three times your Druid level" — the cheatsheet's wording around
    // amountMultiplier ("2 when 'two times the number rolled'") is easy to misapply here instead
    // of amount, which is what character_level scaling actually reads.
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "temporary_hit_points",
          amountScaling: "character_level",
          amountMultiplier: 3,
          thpTrigger: "on_activation",
          thpTarget: "self",
          sourcePhrase: "You gain a number of Temporary Hit Points equal to three times your Druid level.",
        },
      ],
      { contentKind: "class_feature", sourceName: "Druid", featureName: "Circle Forms" },
    )
    expect(detections).toHaveLength(1)
    const effect = detections[0]?.instance.activation?.effects?.[0]
    expect(effect?.healLevelMultiplier).toBe(3)
  })

  it("threads unlocksAtClassLevel through spells_known AI mechanics", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "spells_known",
          spellNames: ["Conjure Animals"],
          alwaysPrepared: true,
          unlocksAtClassLevel: 5,
          sourcePhrase: "always have the listed spells prepared.",
        },
      ],
      { contentKind: "class_feature", sourceName: "Druid", featureName: "Circle of the Moon Spells" },
    )
    expect(detections).toHaveLength(1)
    const char = detections[0]?.instance.characteristics?.[0]
    expect(char?.type).toBe("spells_known")
    if (char?.type === "spells_known") {
      expect(char.spells[0]?.unlocksAtClassLevel).toBe(5)
    }
  })

  it("wires speedMode equal_to_walk instead of requiring a fixed speedFeet", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "speed",
          speedType: "swim",
          speedMode: "equal_to_walk",
          requiresSheetToggle: "wrath_of_the_sea_active",
          sourcePhrase: "you gain a Swim Speed equal to your Speed.",
        },
      ],
      { contentKind: "class_feature", sourceName: "Druid", featureName: "Aquatic Affinity" },
    )
    expect(detections).toHaveLength(1)
    const char = detections[0]?.instance.characteristics?.[0]
    expect(char?.type).toBe("speed")
    if (char?.type === "speed") {
      expect(char.mode).toBe("equal_to_walk")
      expect(char.speedType).toBe("swim")
    }
    expect(char?.requiresSheetToggle).toBe("wrath_of_the_sea_active")
  })

  it("wires requiresSheetToggle on ac AI mechanics (formula and flat)", () => {
    const formulaDetections = aiMechanicsToDetections(
      [
        {
          kind: "ac",
          acBase: 13,
          acAbilities: ["wisdom"],
          requiresSheetToggle: "while_wild_shape",
          sourcePhrase: "your AC equals 13 plus your Wisdom modifier",
        },
      ],
      { contentKind: "class_feature", sourceName: "Druid", featureName: "Circle Forms" },
    )
    expect(formulaDetections[0]?.instance.characteristics?.[0]?.requiresSheetToggle).toBe(
      "while_wild_shape",
    )

    const flatDetections = aiMechanicsToDetections(
      [
        {
          kind: "ac",
          acFlatBonus: 2,
          requiresSheetToggle: "while_wild_shape",
          sourcePhrase: "+2 AC while in this form",
        },
      ],
      { contentKind: "class_feature", featureName: "Some Form" },
    )
    expect(flatDetections[0]?.instance.characteristics?.[0]?.requiresSheetToggle).toBe(
      "while_wild_shape",
    )
  })

  it("wires turn_start_trigger restoreResourceKey 'hit_points' as a heal, not a resource restore (Elder Champion's Regeneration)", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "turn_start_trigger",
          restoreResourceKey: "hit_points",
          restoreResourceAmount: 10,
          requiresSheetToggle: "elder_champion_active",
          sourcePhrase: "At the start of each of your turns, you regain 10 Hit Points.",
        },
      ],
      { contentKind: "class_feature", sourceName: "Paladin", featureName: "Elder Champion" },
    )
    expect(detections).toHaveLength(1)
    const char = detections[0]?.instance.characteristics?.[0]
    expect(char?.type).toBe("turn_start_trigger")
    if (char?.type === "turn_start_trigger") {
      expect(char.healMode).toBe("fixed")
      expect(char.healFixed).toBe(10)
      expect(char.restoreResourceKey).toBeUndefined()
    }
  })

  it("wires turn_start_resource_restore restoreResourceKey 'hp' as a heal too", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "turn_start_resource_restore",
          restoreResourceKey: "hp",
          restoreResourceAmount: 5,
          sourcePhrase: "regain 5 Hit Points at the start of your turn",
        },
      ],
      { contentKind: "class_feature", sourceName: "Test", featureName: "Regen" },
    )
    expect(detections).toHaveLength(1)
    const char = detections[0]?.instance.characteristics?.[0]
    expect(char?.type).toBe("turn_start_trigger")
    if (char?.type === "turn_start_trigger") {
      expect(char.healMode).toBe("fixed")
      expect(char.healFixed).toBe(5)
    }
  })

  it("threads requiresSheetToggle through damage_resistance and condition_immunity AI mechanics", () => {
    const resistance = aiMechanicsToDetections(
      [
        {
          kind: "damage_resistance",
          damageTypes: ["Necrotic", "Psychic", "Radiant"],
          requiresSheetToggle: "in_aura_of_protection",
          sourcePhrase: "you and your allies have Resistance to Necrotic, Psychic, and Radiant damage",
        },
      ],
      { contentKind: "class_feature", sourceName: "Paladin", featureName: "Aura of Warding" },
    )
    expect(resistance[0]?.instance.characteristics?.[0]?.requiresSheetToggle).toBe(
      "in_aura_of_protection",
    )

    const immunity = aiMechanicsToDetections(
      [
        {
          kind: "condition_immunity",
          conditions: ["Charmed"],
          requiresSheetToggle: "in_aura_of_protection",
          sourcePhrase: "Immunity to the Charmed condition while in your Aura of Protection",
        },
      ],
      { contentKind: "class_feature", sourceName: "Paladin", featureName: "Aura of Devotion" },
    )
    expect(immunity[0]?.instance.characteristics?.[0]?.requiresSheetToggle).toBe(
      "in_aura_of_protection",
    )
  })

  it("gates check_roll_modifier behind a sheet toggle via limitations (Peerless Athlete)", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "check_roll_modifier",
          checkRollMode: "advantage",
          checkCategory: "skill",
          checkSkills: ["Athletics", "Acrobatics"],
          requiresSheetToggle: "peerless_athlete_active",
          sourcePhrase: "you have Advantage on Strength (Athletics) and Dexterity (Acrobatics) checks",
        },
      ],
      { contentKind: "class_feature", sourceName: "Paladin", featureName: "Peerless Athlete" },
    )
    expect(detections).toHaveLength(1)
    const effect = detections[0]?.instance.activation?.effects?.[0]
    expect(effect?.checkSkills).toEqual(["Athletics", "Acrobatics"])
    expect(effect?.limitations).toHaveLength(1)
    expect(effect?.limitations?.[0]).toMatchObject({
      kind: "sheet_toggle",
      rule: "requires_active",
      value: "peerless_athlete_active",
    })
  })

  it("wires initiative add_ability_modifier as additive, distinct from the replacing ability_modifier mode (Ranger's Dread Ambusher)", () => {
    const additive = aiMechanicsToDetections(
      [
        {
          kind: "initiative",
          initiativeMode: "add_ability_modifier",
          initiativeAbility: "wisdom",
          sourcePhrase: "you can add your Wisdom modifier to the roll",
        },
      ],
      { contentKind: "class_feature", sourceName: "Ranger", featureName: "Dread Ambusher" },
    )
    expect(additive).toHaveLength(1)
    const additiveChar = additive[0]?.instance.characteristics?.[0]
    expect(additiveChar?.type).toBe("initiative")
    if (additiveChar?.type === "initiative") {
      expect(additiveChar.mode).toBe("add_ability_modifier")
      expect(additiveChar.ability).toBe("WIS")
    }

    const replacing = aiMechanicsToDetections(
      [
        {
          kind: "initiative",
          initiativeMode: "ability_modifier",
          initiativeAbility: "intelligence",
          sourcePhrase: "initiative now uses your Intelligence modifier instead of Dexterity",
        },
      ],
      { contentKind: "class_feature", sourceName: "Test", featureName: "Tactical Mind" },
    )
    const replacingChar = replacing[0]?.instance.characteristics?.[0]
    if (replacingChar?.type === "initiative") {
      expect(replacingChar.mode).toBe("ability_modifier")
    }
  })
})

describe("import modifier review helpers", () => {
  const content = {
    classes: [
      {
        name: "Skirmisher",
        description: null,
        hit_die: 8,
        primary_ability: ["Dexterity"],
        features: [
          {
            level: 1,
            name: "Fleet Footwork",
            description: "Your walking speed increases by 10 feet.",
          },
        ],
      },
    ],
  }

  it("collects previews and removes a modifier before persist", () => {
    const enriched = enrichImportContentModifiers(content)
    const previews = collectImportModifierPreviews(enriched)
    expect(previews.length).toBeGreaterThan(0)

    const trimmed = removeImportModifierPreview(enriched, previews[0]!.id)
    expect(collectImportModifierPreviews(trimmed)).toHaveLength(previews.length - 1)

    const sanitized = sanitizeImportContentForPersist(trimmed)
    const feature = sanitized.classes?.[0]?.features?.[0] as Record<string, unknown>
    expect(feature.importModifierMeta).toBeUndefined()
    expect(feature.mechanics).toBeUndefined()
  })

  it("merges AI mechanics with detector output without duplicate skills", () => {
    const merged = enrichImportContentModifiers({
      feats: [
        {
          name: "Nimble",
          description: "You gain proficiency in Stealth.",
          prerequisite: null,
          mechanics: [{ kind: "skills", skills: ["Stealth"], sourcePhrase: "AI skill grant" }],
        },
      ],
    })
    const previews = collectImportModifierPreviews(merged)
    const skillPreviews = previews.filter((entry) => entry.summary.includes("skills"))
    expect(skillPreviews.length).toBeLessThanOrEqual(1)
  })
})

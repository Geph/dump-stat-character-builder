import { describe, expect, it } from "vitest"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import {
  detectFeatureModifiers,
  mergeDetectionsIntoFeature,
  mergeFeatureModifierDetections,
} from "@/lib/import/detect-feature-modifiers"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { migrateFeatureOptionPickers } from "@/lib/compendium/feature-option-choice-migration"
import { enrichWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

function modOf<T extends CharacteristicModifier["type"]>(
  char: CharacteristicModifier | undefined,
  type: T,
): Extract<CharacteristicModifier, { type: T }> | undefined {
  return char?.type === type ? (char as Extract<CharacteristicModifier, { type: T }>) : undefined
}

const baseCtx = {
  contentKind: "class_feature" as const,
  sourceName: "Test Class",
  featureName: "Test Feature",
}

describe("detectFeatureModifiers", () => {
  const positiveCases: Array<{
    label: string
    text: string
    ruleId: string
    assert?: (detections: ReturnType<typeof detectFeatureModifiers>) => void
  }> = [
    {
      label: "skill proficiency list",
      text: "You gain proficiency in Stealth and Perception.",
      ruleId: "proficiency.skills.list",
      assert: (detections) => {
        const char = detections[0]?.instance.characteristics?.[0]
        expect(char?.type).toBe("skills")
        if (char?.type === "skills") {
          expect(char.entries?.map((entry) => entry.skill).sort()).toEqual(["Perception", "Stealth"])
        }
      },
    },
    {
      label: "unarmored AC formula",
      text: "While you are not wearing armor, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.",
      ruleId: "ac.unarmored.ability",
      assert: (detections) => {
        const entry = detections.find((row) => row.ruleId.startsWith("ac.unarmored"))
        const char = entry?.instance.characteristics?.[0]
        expect(char?.type).toBe("ac")
        if (char?.type === "ac") {
          expect(char.mode).toBe("ability_modifiers")
          expect(char.base).toBe(10)
          expect(char.abilities).toEqual(["DEX", "WIS"])
        }
      },
    },
    {
      label: "extra damage rider",
      text: "When you hit with a melee weapon, you deal an extra 1d6 fire damage.",
      ruleId: "damage.rider.dice",
      assert: (detections) => {
        const char = detections[0]?.instance.characteristics?.[0]
        expect(char?.type).toBe("damage_roll_modifiers")
      },
    },
    {
      label: "damage resistance",
      text: "You have resistance to fire and cold damage.",
      ruleId: "resistance.damage",
      assert: (detections) => {
        const char = detections[0]?.instance.characteristics?.[0]
        if (char?.type === "damage_resistance") {
          expect(char.damageTypes?.slice().sort()).toEqual(["Cold", "Fire"])
        }
      },
    },
    {
      label: "martial weapons and medium armor together",
      text: "You gain proficiency with martial weapons and medium armor.",
      ruleId: "proficiency.armor.medium",
      assert: (detections) => {
        expect(detections.some((d) => d.ruleId === "proficiency.weapons.martial")).toBe(true)
        expect(detections.some((d) => d.ruleId === "proficiency.armor.medium")).toBe(true)
        const armor = detections.find((d) => d.ruleId === "proficiency.armor.medium")?.instance
          .characteristics?.[0]
        expect(armor?.type).toBe("armor_proficiencies")
        if (armor?.type === "armor_proficiencies") {
          expect(armor.values).toEqual(["Medium armor"])
        }
      },
    },
    {
      label: "immunity to multiple conditions",
      text: "While your Rampage Die is a d8 or higher, you have immunity to the Charmed and Frightened conditions.",
      ruleId: "immunity.condition",
      assert: (detections) => {
        const char = detections.find((d) => d.ruleId === "immunity.condition")?.instance
          .characteristics?.[0]
        expect(char?.type).toBe("condition_immunity")
        if (char?.type === "condition_immunity") {
          expect(char.conditions?.slice().sort()).toEqual(["Charmed", "Frightened"])
          expect(char.label).toMatch(/While your Rampage Die is a d8 or higher/i)
        }
      },
    },
    {
      label: "item charge pool",
      text: "This amulet has 3 charges and regains 1d3 expended charges daily at dawn.",
      ruleId: "uses.item_charges",
      assert: (detections) => {
        const char = detections[0]?.instance.characteristics?.[0]
        expect(char?.type).toBe("uses")
        if (char?.type === "uses") {
          expect(char.uses?.fixedAmount).toBe(3)
          expect(char.uses?.specialDescription).toMatch(/1d3.*dawn/i)
        }
      },
    },
    {
      label: "fixed uses per long rest",
      text: "You can use this feature 3 times, regaining all expended uses when you finish a long rest.",
      ruleId: "uses.fixed_rest",
      assert: (detections) => {
        const char = detections[0]?.instance.characteristics?.[0]
        expect(char?.type).toBe("uses")
        if (char?.type === "uses") {
          expect(char.uses?.type).toBe("fixed")
          expect(char.uses?.fixedAmount).toBe(3)
        }
      },
    },
    {
      label: "darkvision",
      text: "You have darkvision within 60 feet.",
      ruleId: "vision.darkvision",
    },
    {
      label: "extra attack",
      text: "Beginning at 5th level, you can attack twice whenever you take the Attack action.",
      ruleId: "attack.extra",
    },
    {
      label: "save advantage",
      text: "You have advantage on Constitution saving throws.",
      ruleId: "save.advantage",
    },
    {
      label: "initiative advantage",
      text: "You have Advantage on Initiative rolls.",
      ruleId: "check.advantage.initiative",
      assert: (detections) => {
        expect(detections[0]?.instance.catalogRefId).toBe("cat_fx_check_roll_modifier")
        const effect = detections[0]?.instance.activation?.effects?.[0]
        expect(effect?.checkRollMode).toBe("advantage")
        expect(effect?.checkCategory).toBe("initiative")
      },
    },
    {
      label: "fighting style feat grant",
      text:
        "You gain a Fighting Style feat of your choice. If you choose a feat, such as Great Weapon Fighting, that requires you to hold a Melee weapon in one or two hands, you can use that feat with Ranged weapons.",
      ruleId: "grant.fighting_style",
      assert: (detections) => {
        expect(detections[0]?.instance.catalogRefId).toBe("cat_char_grant_feat")
        const char = detections[0]?.instance.characteristics?.[0]
        expect(char?.type).toBe("grant_feat")
      },
    },
    {
      label: "ranged critical hit scaling",
      text:
        "Your attack rolls with Ranged weapons can score a Critical Hit on a roll of 19 or 20 on the d20. At level 9, your attack rolls with Ranged weapons score a Critical Hit on a roll of 18–20. At level 17, they score a Critical Hit on a roll of 17–20.",
      ruleId: "attack.critical.scaling",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "attack.critical.scaling")?.instance
            .characteristics?.[0],
          "attack_roll_modifiers",
        )
        const entry = char?.entries?.[0]
        expect(entry?.target).toBe("ranged")
        expect(entry?.criticalHitMinimum).toBe(19)
        expect(entry?.criticalHitMinimumByLevel?.map((row: { level: number }) => row.level)).toEqual([9, 17])
        expect(entry?.criticalHitMinimumByLevel?.map((row: { fixed?: number | null }) => row.fixed)).toEqual([18, 17])
      },
    },
    {
      label: "weapon damage ability mod and extra dice",
      text:
        "When you deal damage with a Ranged weapon that doesn't add your ability modifier to the roll, you add your ability modifier nonetheless. If you already add your modifier to the damage roll, the target takes an extra 1d8 damage of the weapon's type.",
      ruleId: "damage.weapon.ability_modifier",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "damage.weapon.ability_modifier")?.instance
            .characteristics?.[0],
          "damage_roll_modifiers",
        )
        const entry = char?.entries?.[0]
        expect(entry?.grantAbilityModifierWhenMissing).toBe(true)
        expect(entry?.bonusDiceWhenModifierIncluded).toBe("1d8")
        expect(entry?.bonusDiceUsesWeaponDamageType).toBe(true)
      },
    },
    {
      label: "speed equal to walk",
      text: "You gain a climbing speed and swimming speed equal to your walking speed.",
      ruleId: "speed.equal_to_walk",
      assert: (detections) => {
        const chars =
          detections.find((d) => d.ruleId === "speed.equal_to_walk")?.instance.characteristics?.filter(
            (c): c is Extract<CharacteristicModifier, { type: "speed" }> => c.type === "speed",
          ) ?? []
        expect(chars.map((c) => c.speedType).sort()).toEqual(["climb", "swim"])
        expect(chars.every((c) => c.mode === "equal_to_walk")).toBe(true)
      },
    },
    {
      label: "crit bonus damage by level",
      text:
        "Whenever you score a critical hit with a weapon attack you deal bonus damage equal to your Fighter level.",
      ruleId: "damage.crit.bonus",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "damage.crit.bonus")?.instance
            .characteristics?.[0],
          "bonus_damage_riders",
        )
        expect(char?.triggerOn).toBe("on_crit")
        expect(char?.automaticBonus?.mode).toBe("character_level")
      },
    },
    {
      label: "crit maximize at level",
      text:
        "At 15th level, when you score a critical hit with a weapon attack, you can maximize the damage instead of rolling.",
      ruleId: "damage.crit.maximize",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "damage.crit.maximize")?.instance
            .characteristics?.[0],
          "on_hit_trigger",
        )
        expect(char?.triggerOn).toBe("crit")
        expect(char?.maximizeWeaponDamage).toBe(true)
        expect(char?.maximizeWeaponDamageAtLevel).toBe(15)
      },
    },
    {
      label: "resource die save bonus",
      text:
        "Whenever you are forced to make an Intelligence, Wisdom, or Charisma saving throw you gain a bonus to the roll equal to your Exploit Die.",
      ruleId: "check.bonus.resource_die",
      assert: (detections) => {
        const effects =
          detections.find((d) => d.ruleId === "check.bonus.resource_die")?.instance.activation
            ?.effects ?? []
        expect(effects).toHaveLength(3)
        expect(effects.every((e) => e.checkRollMode === "bonus")).toBe(true)
        expect(effects[0]?.bonusConfig?.dieScaling).toBe("class_resource")
        expect(effects[0]?.bonusConfig?.classResourceKey).toBe("exploit_dice")
      },
    },
    {
      label: "ranged attack bonus with half cover ignore",
      text:
        "You gain a +2 bonus to attack rolls with ranged weapons, and your attacks with ranged weapons ignore half-cover.",
      ruleId: "attack.bonus.all",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "attack.bonus.all")?.instance
            .characteristics?.[0],
          "attack_roll_modifiers",
        )
        const entry = char?.entries?.[0]
        expect(entry?.target).toBe("ranged")
        expect(entry?.bonus).toBe(2)
        expect(entry?.ignoreHalfCover).toBe(true)
      },
    },
    {
      label: "free resource use on ability check",
      text:
        "When you make a Strength or Constitution ability check or saving throw, you can use feat of strength or heroic fortitude without expending an Exploit Die.",
      ruleId: "resource.free_use_on_roll",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "resource.free_use_on_roll")?.instance
            .characteristics?.[0],
          "resource_ability_menu",
        )
        expect(char?.waiveResourceCost).toBe(true)
        expect(char?.resourceKey).toBe("exploit_dice")
        expect(char?.appliesOnAbilities).toEqual(["Strength", "Constitution"])
        expect(char?.options?.map((o: { name: string }) => o.name)).toEqual(["Feat Of Strength", "Heroic Fortitude"])
      },
    },
    {
      label: "turn start heal below half hp",
      text:
        "If you begin your turn with less than half of your hit points remaining, but at least 1 hit point, you regain hit points equal to 5 + your Constitution modifier.",
      ruleId: "heal.turn_start_low_hp",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "heal.turn_start_low_hp")?.instance
            .characteristics?.[0],
          "turn_start_trigger",
        )
        expect(char?.hpBelowFraction).toBe(0.5)
        expect(char?.hpAtLeast).toBe(1)
        const healFx = char?.effect?.activation?.effects?.[0]
        expect(healFx?.kind).toBe("heal_self")
        expect(healFx?.healFixed).toBe(5)
        expect(healFx?.healAbility).toBe("CON")
      },
    },
    {
      label: "language choice",
      text: "You learn two languages of your choice.",
      ruleId: "language.choice",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "language.choice")?.instance
            .characteristics?.[0],
          "languages",
        )
        expect(
          (char as unknown as import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier & {
            choiceCount?: number
          })?.choiceCount,
        ).toBe(2)
      },
    },
    {
      label: "known language",
      text: "You know Sylvan.",
      ruleId: "language.known",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "language.known")?.instance
            .characteristics?.[0],
          "languages",
        )
        expect(
          (char as unknown as import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier & {
            values?: string[]
          })?.values,
        ).toEqual(["Sylvan"])
      },
    },
    {
      label: "known cantrip",
      text: "You know the Druidcraft cantrip.",
      ruleId: "spell.know_cantrip",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "spell.know_cantrip")?.instance
            .characteristics?.[0],
          "spells_known",
        )
        expect(char?.spells?.[0]?.spellId).toContain("Druidcraft")
      },
    },
    {
      label: "ritual-only named spells",
      text: "You can cast the Beast Sense and Speak with Animals spells but only as Rituals. Wisdom is your spellcasting ability for them.",
      ruleId: "spell.can_cast_named",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "spell.can_cast_named")?.instance
            .characteristics?.[0],
          "spells_known",
        )
        expect(char?.spells?.every((entry) => entry.castAsRitual)).toBe(true)
      },
    },
    {
      label: "named at-will spell grants",
      text: "You can cast the detect magic spell at will.",
      ruleId: "spell.cast_named_at_will",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "spell.cast_named_at_will")?.instance
            .characteristics?.[0],
          "spells_known",
        )
        expect(char?.spells?.[0]?.spellId).toContain("detect magic")
      },
    },
    {
      label: "named psionic casting grant without the word spell",
      text: "You can cast minor illusion with your psionic powers.",
      ruleId: "spell.gain_cast_named",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "spell.gain_cast_named")?.instance
            .characteristics?.[0],
          "spells_known",
        )
        expect(char?.spells?.[0]?.spellId).toContain("minor illusion")
      },
    },
    {
      label: "multiple named casting grants",
      text: "You gain the ability to cast plane shift and teleport.",
      ruleId: "spell.gain_cast_named",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "spell.gain_cast_named")?.instance
            .characteristics?.[0],
          "spells_known",
        )
        expect(char?.spells).toHaveLength(2)
      },
    },
    {
      label: "bounding leap up to full speed (Propelled Bound)",
      text: "When you move on your turn, you can expend movement up to your speed in a single bounding leap propelled by telekinetic power or psychokinetic force.",
      ruleId: "movement.leap.full_speed",
      assert: (detections) => {
        const effect = detections.find((d) => d.ruleId === "movement.leap.full_speed")?.instance
          .activation?.effects?.[0]
        expect(effect?.kind).toBe("movement_option")
        if (effect?.kind === "movement_option") {
          expect(effect.moveDistanceMode).toBe("speed")
          expect(effect.movementTypes).toContain("jump")
        }
      },
    },
    {
      label: "half damage on successful save (Potent Psionics)",
      text: "When a target succeeds on a saving throw against a damaging Psionic Power granted by a psionic discipline, it still takes half damage but suffers no other effects.",
      ruleId: "spell.damage.half_on_save",
      assert: (detections) => {
        const char = detections.find((d) => d.ruleId === "spell.damage.half_on_save")?.instance
          .characteristics?.[0]
        expect(char?.type).toBe("on_cast_spell_trigger")
        if (char?.type === "on_cast_spell_trigger") {
          expect(char.effect?.catalogRefId).toBe("cat_fx_damage_reduction")
        }
      },
    },
    {
      label: "Intelligence damage bonus for discipline powers (Empowered Psionics)",
      text: "When you deal damage with a psionic discipline power, you can add your Intelligence modifier to the damage dealt.",
      ruleId: "spell.damage.add_int_psionic_power",
      assert: (detections) => {
        const char = detections.find(
          (d) => d.ruleId === "spell.damage.add_int_psionic_power",
        )?.instance.characteristics?.[0]
        expect(char?.type).toBe("on_cast_spell_trigger")
        if (char?.type === "on_cast_spell_trigger") {
          expect(char.spellTags).toEqual(["discipline power", "damage"])
          expect(char.label).toMatch(/\+INT/)
        }
      },
    },
    {
      label: "custom mindsight vision with creature threshold",
      text: "You gain mindsight with a range of 60 feet, allowing you to see creatures with Intelligence 6 or higher within range as if by Blindsight. A creature you are unaware of can still be hidden from you.",
      ruleId: "vision.mindsight",
      assert: (detections) => {
        const char = detections.find((d) => d.ruleId === "vision.mindsight")?.instance
          .characteristics?.[0]
        expect(char?.type).toBe("vision")
        if (char?.type === "vision") {
          expect(char.visionType).toBe("custom")
          expect(char.customType).toMatch(/Intelligence 6\+/)
          expect(char.rangeFeet).toBe(60)
          expect(char.label).toMatch(/still be hidden/)
        }
      },
    },
    {
      label: "once-per-rest creation (Imaginary Army)",
      text: "Once you create an additional duplicate, you cannot do so again until you finish a short or long rest.",
      ruleId: "uses.once_until_rest",
    },
    {
      label: "once-per-rest with complete phrasing (Bile Blast)",
      text: "Once you use this ability, you cannot use it again until you complete a short or long rest.",
      ruleId: "uses.once_until_rest",
    },
    {
      label: "once-per-rest after longer cast clause (Mutant Regeneration)",
      text: "Once you cast it on yourself without expending a spell slot, you cannot do so again until you complete a long rest.",
      ruleId: "uses.once_until_rest",
    },
    {
      label: "once regain after rest (Projected Self)",
      text: "You can create an illusory duplicate in this way once, regaining its use after a long rest.",
      ruleId: "uses.once_regain_after_rest",
    },
    {
      label: "Intelligence-modifier uses count (Imaginary Ally)",
      text: "You can create a number equal to your Intelligence modifier, regaining all uses after a long rest.",
      ruleId: "uses.ability_modifier",
      assert: (detections) => {
        const char = detections.find((d) => d.ruleId === "uses.ability_modifier")?.instance
          .characteristics?.[0]
        expect(char?.type).toBe("uses")
        if (char?.type === "uses") {
          expect(char.uses?.type).toBe("ability_modifier")
          expect(char.uses?.abilityModifier).toBe("INT")
        }
      },
    },
    {
      label: "gain ability to cast at will (Flexible Existence)",
      text: "You gain the ability to cast alter self at will. The spell no longer requires concentration.",
      ruleId: "spell.cast_named_at_will",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "spell.cast_named_at_will")?.instance
            .characteristics?.[0],
          "spells_known",
        )
        expect(char?.spells?.[0]?.spellId).toContain("alter self")
        expect(detections.some((d) => d.ruleId === "spell.gain_cast_named")).toBe(false)
      },
    },
    {
      label: "you add the spell to Alternate Effects (Rampant Illusions)",
      text: "You add the spell weird to your alternate effects list, costing 9 psi points.",
      ruleId: "spell.added_to_effects_list",
      assert: (detections) => {
        const char = modOf(
          detections.find((d) => d.ruleId === "spell.added_to_effects_list")?.instance
            .characteristics?.[0],
          "spells_known",
        )
        expect(char?.spells?.[0]?.spellId).toContain("weird")
      },
    },
    {
      label: "reach increases by feet (Uncanny Flexibility)",
      text: "your reach increases by 5 feet when making melee attacks, interacting with objects, or navigating environments",
      ruleId: "weapon.reach.bonus",
      assert: (detections) => {
        const char = detections.find((d) => d.ruleId === "weapon.reach.bonus")?.instance
          .characteristics?.[0]
        expect(char?.type).toBe("weapon_reach_modifier")
        if (char?.type === "weapon_reach_modifier") {
          expect(char.reachBonusFeet).toBe(5)
          expect(char.appliesToUnarmedStrike).toBe(true)
        }
      },
    },
  ]

  it.each(positiveCases)("detects $label ($ruleId)", ({ text, ruleId, assert }) => {
    const detections = detectFeatureModifiers(text, baseCtx)
    expect(detections.some((entry) => entry.ruleId === ruleId)).toBe(true)
    expect(detections[0]?.instance.catalogRefId).toMatch(/^cat_(char|fx)_/)
    assert?.(detections)
  })

  const negativeCases = [
    "As a bonus action, you can dash.",
    "Your spellcasting ability is Intelligence.",
    "You can cast one of the level 1+ spells that you have prepared from your Circle Spells feature without expending a spell slot, and you must finish a Long Rest before you do so again.",
  ]

  it.each(negativeCases)("does not invent modifiers from: %s", (text) => {
    expect(detectFeatureModifiers(text, baseCtx)).toEqual([])
  })

  it("preserves an alternate-skill ability's target condition", () => {
    const detections = detectFeatureModifiers(
      "You can use Intelligence instead of Wisdom when making an Insight check against a creature with an Intelligence score of 6 or higher.",
      baseCtx,
    )
    const char = detections.find(
      (entry) => entry.ruleId === "skill.check.alternate_ability",
    )?.instance.characteristics?.[0]
    expect(char?.type).toBe("skill_check_alternate_ability")
    if (char?.type === "skill_check_alternate_ability") {
      expect(char.conditionLabel).toBe(
        "against a creature with an Intelligence score of 6 or higher",
      )
    }

    const perception = detectFeatureModifiers(
      "You can use Intelligence instead of Wisdom when making Perception checks to detect creatures.",
      baseCtx,
    ).find((entry) => entry.ruleId === "skill.check.alternate_ability")?.instance
      .characteristics?.[0]
    expect(perception?.type).toBe("skill_check_alternate_ability")
    if (perception?.type === "skill_check_alternate_ability") {
      expect(perception.conditionLabel).toBe("to detect creatures")
    }
  })

  it("gates Primordial Aspect's speed bonus behind the Lightning aspect toggle", () => {
    const detections = detectFeatureModifiers(
      "<ul><li><strong>Cold.</strong> Icy shell.</li><li><strong>Fire.</strong> Fiery aura.</li><li><strong>Lightning.</strong> Your walking speed increases by 5 feet.</li></ul>",
      { ...baseCtx, featureName: "Primordial Aspect" },
    )
    const char = detections.find((entry) => entry.ruleId === "speed.walk")?.instance
      .characteristics?.[0]
    expect(char?.type).toBe("speed")
    if (char?.type === "speed") {
      expect(char.requiresSheetToggle).toBe("primordial_aspect_lightning")
    }
  })

  it("dedupes identical detections across clauses", () => {
    const text =
      "You gain proficiency in Athletics. You also gain proficiency in Athletics when using shields."
    const detections = detectFeatureModifiers(text, baseCtx)
    const skillDetections = detections.filter((entry) => entry.ruleId === "proficiency.skills.list")
    expect(skillDetections).toHaveLength(1)
  })

  it("dedupes across path 1 (AI) and path 2 (phrase detector) despite differing casing", () => {
    // No wildcard preset involved here — this isolates the fingerprint case-sensitivity fix to
    // the AI-vs-detector merge path itself, not just the wildcard-preset path. The phrase rule
    // hardcodes "Medium armor" while the AI path title-cases to "Medium Armor".
    const ctx = { ...baseCtx, featureName: "Homebrew Armor Training" }
    const aiDetections = aiMechanicsToDetections(
      [{ kind: "armor_proficiencies", armor: ["Medium Armor"], confidence: "high" }],
      ctx,
    )
    const detectorDetections = detectFeatureModifiers(
      "You gain proficiency with medium armor.",
      ctx,
    )
    expect(detectorDetections.some((d) => d.ruleId === "proficiency.armor.medium")).toBe(true)

    const merged = mergeFeatureModifierDetections(
      { name: ctx.featureName, description: "", linkedModifiers: [] } as unknown as Feature,
      aiDetections,
      detectorDetections,
    )
    const armorInstances = (merged.linkedModifiers ?? []).filter(
      (instance) => instance.characteristics?.[0]?.type === "armor_proficiencies",
    )
    expect(armorInstances).toHaveLength(1)
  })

  it("mergeDetectionsIntoFeature preserves existing linked modifiers", () => {
    const feature = {
      name: "Existing",
      description: "You gain proficiency in Stealth.",
      linkedModifiers: [
        {
          id: "existing_mod",
          catalogRefId: "cat_char_skills",
          characteristics: [
            {
              id: "existing_char",
              type: "skills" as const,
              entries: [{ skill: "Athletics", expertise: false }],
            },
          ],
        },
      ],
      modifierRefs: ["cat_char_skills"],
    }
    const detections = detectFeatureModifiers(feature.description, baseCtx)
    const merged = mergeDetectionsIntoFeature(feature as unknown as Feature, detections)
    expect(merged.linkedModifiers).toHaveLength(2)
    expect(merged.modifierRefs).toContain("cat_char_skills")
  })
})

describe("enrichImportContentModifiers", () => {
  it("walks class features and persists linked modifiers on feats", () => {
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
      feats: [
        {
          name: "Hardy",
          description: "You have resistance to poison damage.",
          prerequisite: null,
        },
      ],
    }

    const enriched = enrichImportContentModifiers(content)
    const classFeature = enriched.classes?.[0]?.features?.[0] as {
      linkedModifiers?: unknown[]
      modifierRefs?: string[]
    }
    expect(classFeature.linkedModifiers?.length).toBeGreaterThan(0)
    expect(classFeature.modifierRefs?.length).toBeGreaterThan(0)

    const feat = enriched.feats?.[0] as {
      linkedModifiers?: unknown[]
      modifierRefs?: string[]
    }
    expect(feat.linkedModifiers?.length).toBeGreaterThan(0)
    expect(feat.modifierRefs).toContain("cat_char_damage_resistance")
  })

  it("marks psionic powers with parsed augments as wired in review", () => {
    const enriched = enrichImportContentModifiers({
      abilities: [
        {
          name: "Enhancing Surge",
          ability_role: "psionic_power",
          source_name: "Psion",
          description: `<p>The target gains 1d6 temporary hit points.</p>
<p>You can spend psi points up to your per-use limit to add multiple modifiers to Enhancing Surge.</p>
<ul>
<li><strong>Fortifying (1+ psi points):</strong> Extra THP.</li>
<li><strong>Swift (2 psi points):</strong> Extra action.</li>
</ul>`,
        },
      ],
    } as ImportContent)

    const review = collectImportModifierReview(enriched)
    const row = review.find((entry) => entry.featureName === "Enhancing Surge")
    expect(row?.status).toBe("wired")
    expect(row?.modifiers.some((mod) => /psi augment/i.test(mod.summary))).toBe(true)
    expect(
      (enriched.abilities?.[0] as { psionic_augments?: { augments?: unknown[] } }).psionic_augments
        ?.augments?.length,
    ).toBe(2)
  })

  it("wires Common Modifiers on imported abilities from description phrasing", () => {
    const enriched = enrichImportContentModifiers({
      abilities: [
        {
          name: "Mind Leech",
          description:
            "As an action, assault a creature's mind. You must expend 2 psi points to use this power.",
          source_type: "class",
          source_name: "Psion",
          level_requirement: 1,
        },
      ],
    } as ImportContent)

    const ability = enriched.abilities?.[0] as {
      linkedModifiers?: Array<{
        characteristics?: Array<{ type?: string; uses?: { classResourceKey?: string } }>
      }>
    }
    expect(ability.linkedModifiers?.length).toBeGreaterThan(0)
    const usesChar = ability.linkedModifiers
      ?.flatMap((row) => row.characteristics ?? [])
      .find((char) => char.type === "uses" && char.uses?.classResourceKey === "psi_points")
    expect(usesChar).toBeTruthy()
  })
})

describe("detectFeatureModifiers by feature name", () => {
  const classCtx = {
    contentKind: "class_feature" as const,
    sourceName: "Gunslinger",
  }

  it("wires Ability Score Improvement to Gain a Feat (General) without description", () => {
    const detections = detectFeatureModifiers("", {
      ...classCtx,
      featureName: "Ability Score Improvement",
      level: 4,
    })
    expect(detections.some((entry) => entry.ruleId === "grant.asi_by_name")).toBe(true)
    expect(detections[0]?.instance.catalogRefId).toBe("cat_char_grant_feat")
  })

  it("wires classic-phrased ASI as asi_pool, not grant_feat", () => {
    const classic =
      "When you reach 4th level, you can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1."
    const detections = detectFeatureModifiers(classic, {
      ...classCtx,
      featureName: "Ability Score Improvement",
      level: 4,
    })
    expect(detections.some((entry) => entry.ruleId === "grant.asi_by_name")).toBe(false)
    const asi = detections.find((entry) => entry.ruleId === "grant.asi_classic")
    expect(asi?.instance.catalogRefId).toBe("cat_char_ability_scores")
    expect(asi?.instance.characteristics?.[0]?.type).toBe("ability_scores")
    expect(
      (asi?.instance.characteristics?.[0] as { mode?: string }).mode,
    ).toBe("asi_pool")
  })

  it("wires PHB 2024 ASI feat body (or increase, without 'you can') as asi_pool", () => {
    const phb =
      "Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. This feat can’t increase an ability score above 20."
    const detections = detectFeatureModifiers(phb, {
      contentKind: "feat",
      sourceName: "Ability Score Improvement",
      featureName: "Ability Score Improvement",
    })
    expect(detections.some((entry) => entry.ruleId === "grant.asi_by_name")).toBe(false)
    expect(detections.some((entry) => entry.ruleId === "grant.asi_classic")).toBe(true)
  })

  it("keeps 2024 ASI phrasing on grant_feat", () => {
    const modern =
      "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
    const detections = detectFeatureModifiers(modern, {
      ...classCtx,
      featureName: "Ability Score Improvement",
      level: 4,
    })
    expect(
      detections.some(
        (entry) =>
          entry.ruleId === "grant.asi_by_name" || entry.ruleId === "grant.asi_2024",
      ),
    ).toBe(true)
    expect(detections.some((entry) => entry.ruleId === "grant.asi_classic")).toBe(false)
  })

  it("wires Evasion by name and from SRD description text", () => {
    const byName = detectFeatureModifiers("", { ...classCtx, featureName: "Evasion", level: 7 })
    expect(byName.some((entry) => entry.ruleId === "defensive.evasion_by_name")).toBe(true)

    const rogueText =
      "When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail."
    const byText = detectFeatureModifiers(rogueText, { ...classCtx, featureName: "Custom Dodge" })
    expect(byText.some((entry) => entry.ruleId === "defensive.evasion")).toBe(true)
    expect(byText[0]?.instance.catalogRefId).toBe("cat_fx_damage_reduction")
    const effect = byText[0]?.instance.activation?.effects?.[0]
    expect(effect?.defensiveSaveScope).toBe(true)
    expect(effect?.defensiveSaveSuccess).toBe("none")
  })

  it("wires Weapon Mastery by name", () => {
    const detections = detectFeatureModifiers("", {
      ...classCtx,
      featureName: "Weapon Mastery",
      level: 1,
    })
    expect(detections.some((entry) => entry.ruleId === "weapon.mastery_by_name")).toBe(true)
    const feature = migrateFeatureOptionPickers({
      name: "Weapon Mastery",
      level: 1,
      description: "",
      linkedModifiers: [detections[0]!.instance],
    } as Feature)
    expect(feature.isChoice).toBe(true)
    const enriched = enrichWeaponMasteryFeature(feature, "Fighter")
    expect(enriched.choices?.choiceCountByLevel?.length).toBeGreaterThan(0)
  })

  it("wires Tantrum by name as a Rampage Die reminder", () => {
    const detections = detectFeatureModifiers(
      "When you roll initiative, you can immediately increase your Rampage Die by one step.",
      { ...classCtx, featureName: "Tantrum", sourceName: "Psion" },
    )
    expect(detections.some((entry) => entry.ruleId === "psion.tantrum_by_name")).toBe(true)
    const uses = detections.find((entry) => entry.ruleId === "psion.tantrum_by_name")?.instance
      .characteristics?.[0]
    expect(uses?.type).toBe("uses")
    if (uses?.type === "uses") {
      expect(uses.uses?.type).toBe("special")
      expect(uses.uses?.specialDescription).toMatch(/Rampage Die/i)
    }
  })

  it("wires attunement slot increases from description", () => {
    const detections = detectFeatureModifiers(
      "You can attune to up to four magic items at once.",
      { ...classCtx, featureName: "Wondrous Item Proficiency", level: 7 },
    )
    const attune = detections.find((entry) => entry.ruleId === "attunement.slots.total")
    expect(attune?.instance.characteristics?.[0]).toMatchObject({
      type: "attunement_slots",
      totalSlots: 4,
    })
  })

  it("wires tool expertise from doubled proficiency phrasing", () => {
    const detections = detectFeatureModifiers(
      "Your proficiency bonus is doubled for any ability check you make that uses any of the tool proficiencies you gained from this class.",
      { ...classCtx, featureName: "Tool Expertise", level: 10 },
    )
    const tools = detections.find((entry) => entry.ruleId === "proficiency.tools.expertise")
    expect(tools?.instance.characteristics?.[0]).toMatchObject({
      type: "tool_proficiencies",
      grantExpertise: true,
    })
  })
})

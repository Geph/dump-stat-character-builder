import type { AbilityScoreKey, CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { extractUsesConfig } from "@/lib/compendium/characteristic-modifiers"
import { characteristicCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"
import { FEAT_MODIFIER_CATALOG } from "@/lib/compendium/enrich-srd-feats"
import { GRANT_FEAT_CATALOG_ID, grantFeatCharacteristic } from "@/lib/compendium/grant-feat-catalog"
import { GRANT_CREATURE_CATALOG_ID } from "@/lib/compendium/grant-creature-catalog"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"
import { applyExpertisePresetOverride } from "@/lib/import/apply-expertise-preset-override"
import { applyBlindsensePresetOverride } from "@/lib/import/apply-blindsense-preset-override"
import { shouldSkipWildcardPreset } from "@/lib/import/resolve-wildcard-preset-conflict"
import { isModifierRedundantAgainst } from "@/lib/import/detect-feature-modifiers"
import { enrichFeatureWithMechanicalDetection } from "@/lib/compendium/enrich-feature-mechanical-detection"
import {
  buildEvasionModifier,
  buildWeaponMasteryModifier,
} from "@/lib/compendium/shared-feature-modifier-builders"
import { enrichWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import {
  blockedWhenConditionLimitation,
  notWearingArmorLimitation,
  requiresActiveToggleLimitation,
  requiresAtMostHpLimitation,
  type ModifierLimitation,
} from "@/lib/compendium/modifier-limitations"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import {
  legacyFeatureOptionPickerCharacteristic,
  migrateFeatureOptionPickers,
} from "@/lib/compendium/feature-option-choice-migration"
import type { Feature, FeatureActivation, FeatureChoice, UsesConfig } from "@/lib/types"
import type { ToolChoicePool } from "@/lib/compendium/srd-tools"
import { toolNamesForPools } from "@/lib/compendium/tool-options"
import {
  INDOMITABLE_FEATURE_USES,
  INNATE_SORCERY_FEATURE_USES,
} from "@/lib/compendium/class-resource-features"

const GAIN_INSPIRATION_CATALOG_ID = "cat_other_gain_inspiration"
const CHECK_ROLL_MODIFIER_CATALOG_ID = "cat_fx_check_roll_modifier"
const ATTUNEMENT_SLOTS_CATALOG_ID = "cat_char_attunement_slots"
const CONDITION_IMMUNITY_CATALOG_ID = "cat_char_condition_immunity"
const AURA_CATALOG_ID = "cat_char_aura"
const FEATURE_OPTION_PICKER_CATALOG_ID = "cat_char_feature_option_picker"
const BONUS_DAMAGE_RIDERS_CATALOG_ID = "cat_char_bonus_damage_riders"
const GRANT_TEMP_HP_CATALOG_ID = "cat_fx_grant_temp_hp"
const MODIFY_CREATURE_CATALOG_ID = "cat_fx_modify_creature"
const DAMAGE_REDUCTION_CATALOG_ID = "cat_fx_damage_reduction"
const CLASS_RESOURCE_CATALOG_ID = "cat_fx_class_resource"
const FORCE_SAVE_CATALOG_ID = "cat_fx_force_save_control"
const SAVING_THROW_TRIGGER_CATALOG_ID = "cat_char_saving_throw_trigger"
const ON_HIT_TRIGGER_CATALOG_ID = "cat_char_on_hit_trigger"
const FAILED_ROLL_TRIGGER_CATALOG_ID = "cat_char_failed_roll_trigger"
const ON_CAST_SPELL_TRIGGER_CATALOG_ID = "cat_char_on_cast_spell_trigger"
const SPELL_HEALING_MODIFIER_CATALOG_ID = "cat_char_spell_healing_modifier"
const RESOURCE_ABILITY_MENU_CATALOG_ID = "cat_char_resource_ability_menu"
const EXTRA_TURN_CATALOG_ID = "cat_char_extra_turn"
const SELF_BUFF_CASTER_CATALOG_ID = "cat_fx_self_buff_caster"
const D20_TEST_REACTION_CATALOG_ID = "cat_char_d20_test_reaction"
const DAMAGE_HALVING_REACTION_CATALOG_ID = "cat_char_damage_halving_reaction"
const HEALING_DICE_POOL_CATALOG_ID = "cat_char_healing_dice_pool"
const ON_CREATURE_DEATH_TRIGGER_CATALOG_ID = "cat_char_on_creature_death_trigger"
const TELEPATHY_CATALOG_ID = "cat_char_telepathy"
const IMPOSE_DISADVANTAGE_CATALOG_ID = "cat_fx_impose_disadvantage"
const REACTION_ATTACK_CATALOG_ID = "cat_fx_reaction_attack"
const EXTRA_ATTACK_CATALOG_ID = "cat_fx_extra_attack"
const SKILL_CHECK_ALTERNATE_ABILITY_CATALOG_ID = "cat_char_skill_check_alternate_ability"

type ClassFeatureModifierPreset =
  | LinkedModifierInstance[]
  | {
      linkedModifiers?: LinkedModifierInstance[]
      activation?: Partial<FeatureActivation>
    }

function modId(key: string): string {
  return `mod_${key}`
}

function charInstance(
  instanceId: string,
  catalogRefId: string,
  characteristics: CharacteristicModifier[],
): LinkedModifierInstance {
  return { instanceId, catalogRefId, characteristics }
}

function fxInstance(
  instanceId: string,
  catalogRefId: string,
  activation: FeatureActivation,
): LinkedModifierInstance {
  return { instanceId, catalogRefId, activation }
}

function unarmoredDefense(
  instanceKey: string,
  abilities: ("DEX" | "CON" | "WIS" | "CHA")[],
  label?: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.ac, [
    {
      id: modId(instanceKey),
      type: "ac",
      mode: "ability_modifiers",
      base: 10,
      abilities,
      label,
    },
  ])
}

/** 2024 Draconic Resilience: base AC 10 + DEX + CHA while unarmored (not 2014's 13 + DEX). */
function draconicAc(instanceKey: string): LinkedModifierInstance {
  return unarmoredDefense(instanceKey, ["DEX", "CHA"], "Draconic AC (10 + DEX + CHA while unarmored)")
}

function speedAdd(
  feet: number,
  label?: string,
  limitations?: ModifierLimitation[],
): LinkedModifierInstance {
  return charInstance(`modinst_speed_walk_${feet}`, "cat_char_speed", [
    {
      id: modId(`speed_walk_${feet}`),
      type: "speed",
      speedType: "walk",
      mode: "add",
      value: feet,
      label,
      limitations,
    },
  ])
}

function speedAddByLevel(
  rows: import("@/lib/compendium/bonus-by-level").BonusByLevelEntry[],
  label?: string,
  limitations?: ModifierLimitation[],
): LinkedModifierInstance {
  return charInstance(`modinst_speed_walk_by_level`, "cat_char_speed", [
    {
      id: modId("speed_walk_by_level"),
      type: "speed",
      speedType: "walk",
      mode: "add",
      value: 0,
      valueByLevel: rows,
      label,
      limitations,
    },
  ])
}

function speedTypeAdd(
  speedType: "climb" | "swim" | "fly",
  feet: number,
  label?: string,
  limitations?: ModifierLimitation[],
): LinkedModifierInstance {
  return charInstance(`modinst_speed_${speedType}_${feet}`, "cat_char_speed", [
    {
      id: modId(`speed_${speedType}_${feet}`),
      type: "speed",
      speedType,
      mode: "add",
      value: feet,
      label,
      limitations,
    },
  ])
}

function skillChoice(count: number, label?: string, grantExpertise = false): LinkedModifierInstance {
  return charInstance(`modinst_skills_${count}${grantExpertise ? "_exp" : ""}`, FEAT_MODIFIER_CATALOG.skills, [
    {
      id: modId(`skills_${count}${grantExpertise ? "_exp" : ""}`),
      type: "skills",
      entries: [],
      allowAnySkill: true,
      choiceCount: count,
      grantExpertise,
      label,
    },
  ])
}

/** Skill proficiency picked from the granting class's level-1 skill list (e.g. Primal Knowledge). */
function classSkillListChoice(count: number, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_skills_classlist_${count}`, FEAT_MODIFIER_CATALOG.skills, [
    {
      id: modId(`skills_classlist_${count}`),
      type: "skills",
      entries: [],
      fromClassSkillList: true,
      choiceCount: count,
      label,
    },
  ])
}

/** Lets the listed skills' ability checks be made with a different ability (optionally conditional). */
function alternateAbilitySkillCheck(
  key: string,
  ability:
    | "strength"
    | "dexterity"
    | "constitution"
    | "intelligence"
    | "wisdom"
    | "charisma",
  skills: string[],
  conditionLabel?: string,
  label?: string,
  limitations?: ModifierLimitation[],
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, SKILL_CHECK_ALTERNATE_ABILITY_CATALOG_ID, [
    {
      id: modId(key),
      type: "skill_check_alternate_ability",
      ability,
      skills,
      conditionLabel,
      label,
      limitations,
    },
  ])
}

function savingThrows(values: string[], label?: string): LinkedModifierInstance {
  return charInstance(`modinst_saves_${values.join("_")}`, "cat_char_saving_throws", [
    {
      id: modId(`saves_${values.join("_")}`),
      type: "saving_throws",
      values,
      label,
    },
  ])
}

function languages(values: string[], choiceCount?: number, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_lang_${values.join("_")}`, "cat_char_languages", [
    {
      id: modId(`lang_${values.join("_")}`),
      type: "languages",
      values,
      choiceCount: choiceCount ?? null,
      label,
    },
  ])
}

function hitPointsPerLevel(value: number, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_hp_${value}`, "cat_char_hit_points", [
    {
      id: modId(`hp_${value}`),
      type: "hit_points",
      mode: "per_level",
      value,
      label,
    },
  ])
}

function abilityBonuses(bonuses: Record<string, number>, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_asi_${label ?? "fixed"}`, FEAT_MODIFIER_CATALOG.abilityScores, [
    {
      id: modId(`asi_${label ?? "fixed"}`),
      type: "ability_scores",
      mode: "fixed",
      bonuses,
      label,
    },
  ])
}

function blindsenseVision(label?: string): LinkedModifierInstance {
  return charInstance("modinst_blindsense", FEAT_MODIFIER_CATALOG.vision, [
    {
      id: modId("blindsense"),
      type: "vision",
      visionType: "blindsight",
      rangeFeet: 10,
      rangeFeetByLevel: [],
      label: label ?? "Blindsense (hearing)",
    },
  ])
}

function vision(rangeFeet: number, visionType: "blindsight" | "darkvision" = "darkvision", label?: string) {
  return charInstance(`modinst_${visionType}_${rangeFeet}`, FEAT_MODIFIER_CATALOG.vision, [
    {
      id: modId(`${visionType}_${rangeFeet}`),
      type: "vision",
      visionType,
      rangeFeet,
      label,
    },
  ])
}

function damageResistance(types: string[] = [], label?: string, limitations?: ModifierLimitation[]): LinkedModifierInstance {
  const key = label ?? (types.join("_") || "pick")
  return charInstance(`modinst_res_${key}`, FEAT_MODIFIER_CATALOG.damageResistance, [
    {
      id: modId(`res_${key}`),
      type: "damage_resistance",
      damageTypes: types,
      label,
      limitations,
    },
  ])
}

function damageImmunity(types: string[], label?: string, limitations?: ModifierLimitation[]): LinkedModifierInstance {
  const key = label ?? (types.join("_") || "pick")
  return charInstance(`modinst_imm_${key}`, FEAT_MODIFIER_CATALOG.damageResistance, [
    {
      id: modId(`imm_${key}`),
      type: "damage_immunity",
      damageTypes: types,
      label,
      limitations,
    },
  ])
}

/** Resistance to damage dealt by spells (any type) — Abjurer Spell Resistance. */
function spellDamageResistance(label = "Resistance to damage from spells"): LinkedModifierInstance {
  return charInstance("modinst_res_spell_damage", FEAT_MODIFIER_CATALOG.damageResistance, [
    {
      id: modId("res_spell_damage"),
      type: "damage_resistance",
      damageTypes: [],
      fromSpells: true,
      label,
    },
  ])
}

function conditionImmunity(
  conditions: string[],
  label?: string,
  limitations?: ModifierLimitation[],
): LinkedModifierInstance {
  return charInstance(`modinst_cond_imm_${conditions.join("_")}`, CONDITION_IMMUNITY_CATALOG_ID, [
    {
      id: modId(`cond_imm_${conditions.join("_")}`),
      type: "condition_immunity",
      conditions,
      label,
      limitations,
    },
  ])
}

function criticalHitRange(minimum: number, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_crit_${minimum}`, FEAT_MODIFIER_CATALOG.attackRollModifiers, [
    {
      id: modId(`crit_${minimum}`),
      type: "attack_roll_modifiers",
      entries: [{ bonus: 0, target: "all" }],
      criticalHitMinimum: minimum,
      label,
    },
  ])
}

function criticalHitRangeByLevel(
  baseMinimum: number,
  byLevel: { level: number; minimum: number }[],
  label?: string,
): LinkedModifierInstance {
  return charInstance(`modinst_crit_${baseMinimum}_by_level`, FEAT_MODIFIER_CATALOG.attackRollModifiers, [
    {
      id: modId(`crit_${baseMinimum}_by_level`),
      type: "attack_roll_modifiers",
      entries: [
        {
          bonus: 0,
          target: "all",
          criticalHitMinimum: baseMinimum,
          criticalHitMinimumByLevel: byLevel.map(({ level, minimum }) => ({
            level,
            mode: "fixed" as const,
            fixed: minimum,
          })),
        },
      ],
      label,
    },
  ])
}

function unarmedDie(die: "1d4" | "1d6" | "1d8" = "1d6", label?: string): LinkedModifierInstance {
  return charInstance(`modinst_unarmed_${die}`, "cat_char_unarmed_strike_damage", [
    {
      id: modId(`unarmed_${die}`),
      type: "unarmed_strike_damage",
      die,
      label,
    },
  ])
}

function monkMartialArtsDieScaling(): BonusByLevelEntry[] {
  return [
    { level: 1, mode: "dice", dieCount: 1, dieType: "d6" },
    { level: 5, mode: "dice", dieCount: 1, dieType: "d8" },
    { level: 11, mode: "dice", dieCount: 1, dieType: "d10" },
    { level: 17, mode: "dice", dieCount: 1, dieType: "d12" },
  ]
}

function unarmedDieByLevel(rows: BonusByLevelEntry[], label?: string): LinkedModifierInstance {
  const key = (label ?? "scale").replace(/[^a-z0-9]+/gi, "_").toLowerCase()
  return charInstance(`modinst_unarmed_by_level_${key}`, "cat_char_unarmed_strike_damage", [
    {
      id: modId(`unarmed_by_level_${key}`),
      type: "unarmed_strike_damage",
      die: "1d6",
      dieByLevel: rows,
      label,
    },
  ])
}

function attunementSlots(total: number, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_attune_${total}`, ATTUNEMENT_SLOTS_CATALOG_ID, [
    {
      id: modId(`attune_${total}`),
      type: "attunement_slots",
      totalSlots: total,
      label,
    },
  ])
}

function gainInspiration(): LinkedModifierInstance {
  return { instanceId: "modinst_gain_inspiration", catalogRefId: GAIN_INSPIRATION_CATALOG_ID, characteristics: [] }
}

function grantFeat(categories: FeatPickCategory[], label?: string): LinkedModifierInstance {
  const characteristic = grantFeatCharacteristic(categories)
  if (label) characteristic.label = label
  return charInstance(`modinst_grant_${categories.join("_")}`, GRANT_FEAT_CATALOG_ID, [characteristic])
}

function usesPool(uses: UsesConfig, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_uses_${label ?? "pool"}`, FEAT_MODIFIER_CATALOG.uses, [
    {
      id: modId(`uses_${label ?? "pool"}`),
      type: "uses",
      uses,
      label,
    },
  ])
}

function checkAdvantage(
  instanceKey: string,
  options: {
    category:
      | "save"
      | "death_save"
      | "attack"
      | "initiative"
      | "ability"
      | "skill"
      | "spell_attack"
      | "spell_save_dc"
      | "other"
    ability?: string | null
    skills?: string[]
    conditions?: string[]
    disabledWhenConditions?: string[]
    limitations?: ModifierLimitation[]
  },
): LinkedModifierInstance {
  const limitations = options.limitations ?? []
  for (const condition of options.disabledWhenConditions ?? []) {
    limitations.push(blockedWhenConditionLimitation(condition))
  }
  return fxInstance(`modinst_${instanceKey}`, CHECK_ROLL_MODIFIER_CATALOG_ID, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkRollMode: "advantage",
        checkCategory: options.category,
        checkAbility: options.ability ?? null,
        checkSkills: options.skills,
        checkConditionTypes: options.conditions ?? [],
        limitations: limitations.length ? limitations : undefined,
      },
    ],
  })
}

/** Incoming attack advantage/disadvantage against this character (Escape the Horde, Reckless Attack drawback). */
function incomingAttackMode(
  instanceKey: string,
  mode: "advantage" | "disadvantage",
  options?: {
    conditions?: string[]
    limitations?: ModifierLimitation[]
  },
): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, CHECK_ROLL_MODIFIER_CATALOG_ID, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkCategory: "other",
        incomingAttackMode: mode,
        checkConditionTypes: options?.conditions ?? [],
        limitations: options?.limitations?.length ? options.limitations : undefined,
      },
    ],
  })
}

function checkBonus(
  instanceKey: string,
  options: {
    category: "save" | "attack" | "initiative" | "ability" | "skill" | "spell_attack" | "spell_save_dc" | "other"
    bonusConfig: import("@/lib/compendium/roll-bonus-config").RollBonusConfig
    ability?: string | null
    skills?: string[]
    limitations?: ModifierLimitation[]
    label?: string
  },
): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, CHECK_ROLL_MODIFIER_CATALOG_ID, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkRollMode: "bonus",
        checkCategory: options.category,
        checkAbility: options.ability ?? null,
        checkSkills: options.skills,
        bonusConfig: options.bonusConfig,
        limitations: options.limitations?.length ? options.limitations : undefined,
        label: options.label,
      },
    ],
  })
}

function checkRollFloor(
  instanceKey: string,
  options: {
    category: "save" | "attack" | "initiative" | "ability" | "skill" | "spell_attack" | "spell_save_dc" | "other"
    below: number
    setTo: number
    ability?: string | null
    skills?: string[]
  },
): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, CHECK_ROLL_MODIFIER_CATALOG_ID, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkCategory: options.category,
        checkAbility: options.ability ?? null,
        checkSkills: options.skills,
        checkRollFloorEnabled: true,
        checkRollFloorBelow: options.below,
        checkRollFloorSetTo: options.setTo,
      },
    ],
  })
}

/** Death Saving Throw rolls at or above `threshold` count as a natural 20 (e.g. Champion's Survivor). */
function deathSaveCritThreshold(instanceKey: string, threshold: number): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, CHECK_ROLL_MODIFIER_CATALOG_ID, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkCategory: "death_save",
        deathSaveCritThreshold: threshold,
      },
    ],
  })
}

/** Regain HP at the start of the turn (e.g. Champion's Heroic Rally: 5 + CON mod while Bloodied). */
function turnStartHeal(
  instanceKey: string,
  options: {
    healAbility?: AbilityScoreKey | null
    healFlatBonus?: number
    hpBelowFraction?: number
    hpAtLeast?: number
    label?: string
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, characteristicCatalogRefId("turn_start_trigger"), [
    {
      id: modId(instanceKey),
      type: "turn_start_trigger",
      healMode: "ability_modifier",
      healAbility: options.healAbility ?? null,
      healFlatBonus: options.healFlatBonus ?? 0,
      hpBelowFraction: options.hpBelowFraction ?? null,
      hpAtLeast: options.hpAtLeast ?? null,
      label: options.label,
    },
  ])
}

function checkAbilityFloor(
  instanceKey: string,
  category: "save" | "ability",
  ability: string,
): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, CHECK_ROLL_MODIFIER_CATALOG_ID, {
    effects: [
      {
        id: modId(instanceKey),
        kind: "check_roll_modifier",
        checkCategory: category,
        checkAbility: ability,
        bonusConfig: {
          mode: "fixed",
          fixed: 0,
          resultFloor: { mode: "ability", ability: ability as "STR" },
        },
      },
    ],
  })
}

function movementCunningAction(): LinkedModifierInstance {
  return fxInstance("modinst_cunning_action", FEAT_MODIFIER_CATALOG.movementOption, {
    bonusAction: true,
    effects: [
      {
        id: modId("cunning_action"),
        kind: "movement_option",
        movementDash: true,
        movementDisengage: true,
        movementHide: true,
      },
    ],
  })
}

function bonusDamageByLevel(instanceKey: string, rows: BonusByLevelEntry[]): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, "cat_fx_bonus_damage_by_level", {
    effects: [{ id: modId(instanceKey), kind: "bonus_damage_by_level", bonusByLevel: rows }],
  })
}

function extraDamageOnHit(instanceKey: string, dice: string): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, "cat_fx_extra_damage_on_hit", {
    effects: [{ id: modId(instanceKey), kind: "extra_damage_on_hit", bonusDice: dice }],
  })
}

/** Parse "1d8" → a dice-mode BonusByLevelEntry at the given level. */
function diceTier(level: number, dice: string): BonusByLevelEntry {
  const match = dice.match(/^(\d+)d(\d+)$/i)
  return {
    level,
    mode: "dice",
    dieCount: match ? parseInt(match[1], 10) : 1,
    dieType: (match ? `d${match[2]}` : "d8") as BonusByLevelEntry["dieType"],
  }
}

/**
 * Extra on-hit damage that grows with class level (e.g. Cleric Divine Strike or
 * Druid Primal Strike: 1d8 that increases to 2d8 at a higher level). The lowest
 * tier is mirrored into `bonusDice` so consumers that don't level-resolve still
 * show the base value.
 */
function extraDamageOnHitByLevel(
  instanceKey: string,
  tiers: { level: number; dice: string }[],
): LinkedModifierInstance {
  const rows = tiers
    .map((tier) => diceTier(tier.level, tier.dice))
    .sort((a, b) => a.level - b.level)
  const base = rows[0]
  const baseDice = base?.dieCount && base?.dieType ? `${base.dieCount}${base.dieType}` : null
  return fxInstance(`modinst_${instanceKey}`, "cat_fx_extra_damage_on_hit", {
    effects: [
      {
        id: modId(instanceKey),
        kind: "extra_damage_on_hit",
        bonusDice: baseDice,
        bonusByLevel: rows,
      },
    ],
  })
}

function healSelfBonusAction(
  instanceKey: string,
  options?: { healAbility?: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA"; label?: string },
): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.healSelf, {
    bonusAction: true,
    effects: [
      {
        id: modId(instanceKey),
        kind: "heal_self",
        healMode: "dice",
        healDiceCount: 1,
        healDieType: "d6",
        healAbility: options?.healAbility ?? null,
        label: options?.label ?? "Martial Arts die",
      },
    ],
  })
}

function sneakAttackScaling(): BonusByLevelEntry[] {
  return [1, 3, 5, 7, 9, 11, 13, 15, 17, 19].map((level, index) => ({
    level,
    mode: "dice" as const,
    dieCount: index + 1,
    dieType: "d6" as const,
  }))
}

function evasion(): LinkedModifierInstance {
  return buildEvasionModifier()
}

function elusive(): LinkedModifierInstance {
  return fxInstance("modinst_elusive", MODIFY_CREATURE_CATALOG_ID, {
    effects: [
      {
        id: modId("elusive"),
        kind: "modify_creature",
        rollTarget: "enemy",
        creatureModifyMode: "roll",
        attackRollsCantHaveAdvantage: true,
      },
    ],
  })
}

function grantTempHpOnKill(label: string): LinkedModifierInstance {
  return fxInstance("modinst_temp_hp_kill", GRANT_TEMP_HP_CATALOG_ID, {
    effects: [
      {
        id: modId("temp_hp_kill"),
        kind: "grant_temp_hp",
        tempHpTrigger: "on_kill",
        healMode: "ability_modifier",
        healAbility: "CHA",
        label,
      },
    ],
  })
}

function grantTempHpPool(label: string): LinkedModifierInstance {
  return fxInstance("modinst_temp_hp_pool", GRANT_TEMP_HP_CATALOG_ID, {
    action: true,
    effects: [
      {
        id: modId("temp_hp_pool"),
        kind: "grant_temp_hp",
        tempHpTrigger: "on_action",
        healMode: "character_level",
        healLevelMultiplier: 1,
        label,
      },
    ],
  })
}

function auraPreset(
  instanceKey: string,
  config: {
    radiusFeet: number
    saveAbility?: "CHA" | "WIS" | "INT" | "STR" | "DEX" | "CON"
    halfCover?: boolean
    radiusAtLevel?: { level: number; radiusFeet: number }
    label?: string
    saveBonusMin?: number
  },
): LinkedModifierInstance {
  const saveBonusConfig = config.saveAbility
    ? {
        mode: "ability_modifier" as const,
        ability: config.saveAbility,
        resultFloor:
          config.saveBonusMin != null
            ? { mode: "fixed" as const, fixed: config.saveBonusMin }
            : config.saveAbility === "CHA"
              ? { mode: "fixed" as const, fixed: 1 }
              : null,
      }
    : null
  return charInstance(`modinst_${instanceKey}`, AURA_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "aura",
      radiusFeet: config.radiusFeet,
      affectsSelf: true,
      affectsAllies: true,
      halfCover: config.halfCover ?? false,
      saveBonusConfig,
      radiusByLevel: config.radiusAtLevel
        ? [{ level: config.radiusAtLevel.level, mode: "fixed", fixed: config.radiusAtLevel.radiusFeet }]
        : [],
      label: config.label,
      limitations: [blockedWhenConditionLimitation("Incapacitated")],
    },
  ])
}

function featureOptionPicker(category: string, swappableOnRest = false): LinkedModifierInstance {
  const key = category.replace(/[^a-z0-9]+/gi, "_").toLowerCase()
  return charInstance(`modinst_feature_opt_${key}`, FEATURE_OPTION_PICKER_CATALOG_ID, [
    legacyFeatureOptionPickerCharacteristic({
      id: modId(`feature_opt_${key}`),
      category,
      choiceCount: 1,
      swappableOnRest,
      label: category,
    }),
  ])
}

/** Damage resistance granted by Circle of the Land's Nature's Ward, keyed by land type. */
const CIRCLE_OF_THE_LAND_RESISTANCES: Record<string, string> = {
  Arid: "Fire",
  Polar: "Cold",
  Temperate: "Lightning",
  Tropical: "Poison",
}

/**
 * Build the rest-swappable land-type choice for Circle of the Land's "Circle of the Land Spells".
 * Each option keeps that land's spell table (parsed at runtime for always-prepared spells) and
 * carries the matching Nature's Ward damage resistance, so a single sheet control drives both.
 */
function buildCircleOfTheLandChoice(feature: Feature): Feature {
  const description = feature.description ?? ""
  const sectionRe = /\*\*(\w+)\s+Land\*\*([\s\S]*?)(?=\*\*\w+\s+Land\*\*|$)/gi
  const options: NonNullable<FeatureChoice["options"]> = []
  let match: RegExpExecArray | null
  while ((match = sectionRe.exec(description))) {
    const land = match[1]
    const body = match[2].trim()
    if (!/<table/i.test(body)) continue
    const resistance = CIRCLE_OF_THE_LAND_RESISTANCES[land]
    options.push({
      name: land,
      description: `**${land} Land**\n${body}`,
      linkedModifiers: resistance
        ? [damageResistance([resistance], `Nature's Ward resistance (${land} land)`)]
        : undefined,
    })
  }
  if (options.length < 2) return feature
  return {
    ...feature,
    isChoice: true,
    choices: {
      category: "Land type",
      count: 1,
      swappableOnRest: true,
      swapRestType: "long",
      options,
    },
  }
}

/** Fill option-level modifiers for known SRD choice features that only had empty pickers. */
function enrichCanonicalFeatureChoices(feature: Feature): Feature {
  const name = feature.name?.trim()
  if (!name) return feature

  if (name === "Circle of the Land Spells") {
    return buildCircleOfTheLandChoice(feature)
  }

  const hasMechanicalOptions =
    feature.choices?.options?.some(
      (option) => (option.linkedModifiers?.length ?? 0) > 0 || (option.modifierRefs?.length ?? 0) > 0,
    ) ?? false
  if (hasMechanicalOptions) return feature

  if (name === "Divine Order") {
    return {
      ...feature,
      isChoice: true,
      choices: {
        category: "Divine Order",
        count: 1,
        options: [
          {
            name: "Protector",
            description:
              "You gain proficiency with Heavy armor and Martial weapons.",
            linkedModifiers: [
              charInstance("modinst_divine_order_protector_armor", "cat_char_armor_proficiencies", [
                {
                  id: modId("divine_order_protector_armor"),
                  type: "armor_proficiencies",
                  values: ["Heavy armor"],
                  label: "Heavy armor proficiency",
                },
              ]),
              charInstance("modinst_divine_order_protector_weapons", "cat_char_weapon_proficiencies", [
                {
                  id: modId("divine_order_protector_weapons"),
                  type: "weapon_proficiencies",
                  mode: "martial_weapons",
                  values: [],
                  label: "Martial weapon proficiency",
                },
              ]),
            ],
          },
          {
            name: "Thaumaturge",
            description:
              "You learn one extra Cleric cantrip. In addition, your mystical connection to the divine gives you a bonus to your Intelligence (Arcana or Religion) checks. The bonus equals your Wisdom modifier (minimum of +1).",
            linkedModifiers: [
              spellsKnownChar("divine_order_thaum_cantrip", {
                choiceGrants: [{ level: 0, count: 1 }],
                spellListClassOptions: ["Cleric"],
                label: "Extra Cleric cantrip",
              }),
              charInstance("modinst_divine_order_thaum_skill", FEAT_MODIFIER_CATALOG.skills, [
                {
                  id: modId("divine_order_thaum_skill"),
                  type: "skills",
                  entries: [
                    { skill: "Arcana", expertise: false },
                    { skill: "Religion", expertise: false },
                  ],
                  choiceCount: 1,
                  grantsProficiency: false,
                  label: "Choose Arcana or Religion for Thaumaturge bonus",
                },
              ]),
              checkBonus("divine_order_thaum_bonus", {
                category: "skill",
                skills: ["Arcana", "Religion"],
                bonusConfig: { mode: "ability_modifier", ability: "WIS" },
                label: "Thaumaturge: +WIS (min +1) on Arcana or Religion (your choice above)",
              }),
            ],
          },
        ],
      },
    }
  }

  if (name === "Primal Order") {
    return {
      ...feature,
      isChoice: true,
      choices: {
        category: "Primal Order",
        count: 1,
        options: [
          {
            name: "Magician",
            description: "You learn one extra Druid cantrip.",
            linkedModifiers: [
              spellsKnownChar("primal_order_magician_cantrip", {
                choiceGrants: [{ level: 0, count: 1 }],
                spellListClassOptions: ["Druid"],
                label: "Extra Druid cantrip",
              }),
            ],
          },
          {
            name: "Warden",
            description:
              "You gain proficiency with Martial weapons and training with Medium armor.",
            linkedModifiers: [
              charInstance("modinst_primal_order_warden_weapons", "cat_char_weapon_proficiencies", [
                {
                  id: modId("primal_order_warden_weapons"),
                  type: "weapon_proficiencies",
                  mode: "martial_weapons",
                  values: [],
                  label: "Martial weapon proficiency",
                },
              ]),
              charInstance("modinst_primal_order_warden_armor", "cat_char_armor_proficiencies", [
                {
                  id: modId("primal_order_warden_armor"),
                  type: "armor_proficiencies",
                  values: ["Medium armor"],
                  label: "Medium armor proficiency",
                },
              ]),
            ],
          },
        ],
      },
    }
  }

  if (name === "Rage of the Wilds") {
    const ALL_BUT_BEAR = [
      "Acid",
      "Bludgeoning",
      "Cold",
      "Fire",
      "Lightning",
      "Piercing",
      "Poison",
      "Slashing",
      "Thunder",
    ]
    return {
      ...feature,
      isChoice: true,
      choices: {
        category: "Rage of the Wilds",
        count: 1,
        options: [
          {
            name: "Bear",
            description:
              "While your Rage is active, you have Resistance to every damage type except Force, Necrotic, Psychic, and Radiant.",
            linkedModifiers: [
              charInstance("modinst_wilds_bear_res", FEAT_MODIFIER_CATALOG.damageResistance, [
                {
                  id: modId("wilds_bear_res"),
                  type: "damage_resistance",
                  damageTypes: ALL_BUT_BEAR,
                  requiresSheetToggle: "while_raging",
                  label: "Bear: resistance to all damage except Force, Necrotic, Psychic, and Radiant (while raging)",
                },
              ]),
            ],
          },
          {
            name: "Eagle",
            description:
              "When you activate your Rage, you can take the Disengage and Dash actions as part of that Bonus Action. While your Rage is active, you can take a Bonus Action to take both of those actions.",
            linkedModifiers: [
              fxInstance("modinst_wilds_eagle_dash", FEAT_MODIFIER_CATALOG.movementOption, {
                bonusAction: true,
                requirements: [{ kind: "while_raging" }],
                effects: [
                  {
                    id: modId("wilds_eagle_dash"),
                    kind: "movement_option",
                    label: "Take the Disengage and Dash actions",
                  },
                ],
              }),
            ],
          },
          {
            name: "Wolf",
            description:
              "While your Rage is active, your allies have Advantage on attack rolls against any enemy of yours within 5 feet of you.",
          },
        ],
      },
    }
  }

  if (name === "Blessed Strikes") {
    return {
      ...feature,
      isChoice: true,
      choices: {
        category: "Blessed Strikes",
        count: 1,
        options: [
          {
            name: "Divine Strike",
            description:
              "Once on each of your turns when you hit a creature with an attack roll using a weapon, you can cause the target to take an extra 1d8 Necrotic or Radiant damage (your choice). The extra damage increases to 2d8 when you reach Cleric level 14 (Improved Blessed Strikes).",
            linkedModifiers: [
              onHitTriggerPreset("blessed_divine_strike", {
                effectCatalogRefId: "cat_fx_extra_damage_on_hit",
              }),
              extraDamageOnHitByLevel("blessed_divine_strike_damage", [
                { level: 7, dice: "1d8" },
                { level: 14, dice: "2d8" },
              ]),
            ],
          },
          {
            name: "Potent Spellcasting",
            description:
              "Add your Wisdom modifier to the damage you deal with Cleric cantrips.",
            linkedModifiers: [
              onCastSpellChar("blessed_potent_spellcasting", {
                spellTags: ["cantrip", "damage"],
                effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
                label: "Add WIS to Cleric cantrip damage",
              }),
            ],
          },
        ],
      },
    }
  }

  if (name === "Elemental Fury") {
    return {
      ...feature,
      isChoice: true,
      choices: {
        category: "Elemental Fury",
        count: 1,
        options: [
          {
            name: "Potent Spellcasting",
            description:
              "Add your Wisdom modifier to the damage you deal with Druid cantrips.",
            linkedModifiers: [
              onCastSpellChar("elemental_fury_potent", {
                spellTags: ["cantrip", "damage"],
                effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
                label: "Add WIS to Druid cantrip damage",
              }),
            ],
          },
          {
            name: "Primal Strike",
            description:
              "Once on each of your turns when you hit a creature with an attack roll using a weapon or a Beast form's attack in Wild Shape, you can cause the target to take an extra 1d8 Cold, Fire, Lightning, or Thunder damage (choose when you hit). The extra damage increases to 2d8 when you reach Druid level 15 (Improved Elemental Fury).",
            linkedModifiers: [
              onHitTriggerPreset("elemental_fury_primal_strike", {
                effectCatalogRefId: "cat_fx_extra_damage_on_hit",
              }),
              extraDamageOnHitByLevel("elemental_fury_primal_strike_damage", [
                { level: 7, dice: "1d8" },
                { level: 15, dice: "2d8" },
              ]),
            ],
          },
        ],
      },
    }
  }

  if (name === "Hunter's Prey") {
    return {
      ...feature,
      isChoice: true,
      choices: {
        category: "Hunter's Prey",
        count: 1,
        swappableOnRest: true,
        options: [
          {
            name: "Colossus Slayer",
            description:
              "Once per turn when you hit a creature with a weapon, the creature takes an extra 1d8 damage if it's below its hit point maximum.",
            linkedModifiers: [
              onHitTriggerPreset("colossus_slayer", {
                effectCatalogRefId: "cat_fx_extra_damage_on_hit",
              }),
              extraDamageOnHit("colossus_slayer_damage", "1d8"),
            ],
          },
          {
            name: "Horde Breaker",
            description:
              "Once per turn when you make a weapon attack, you can make another attack with the same weapon against a different creature within 5 feet of the first target.",
            linkedModifiers: [
              fxInstance("modinst_horde_breaker", EXTRA_ATTACK_CATALOG_ID, {
                effects: [
                  {
                    id: modId("horde_breaker"),
                    kind: "extra_attack",
                    extraAttackCount: 1,
                    label: "Horde Breaker: extra attack vs. nearby creature",
                  },
                ],
              }),
            ],
          },
        ],
      },
    }
  }

  if (name === "Defensive Tactics") {
    return {
      ...feature,
      isChoice: true,
      choices: {
        category: "Defensive Tactics",
        count: 1,
        swappableOnRest: true,
        options: [
          {
            name: "Escape the Horde",
            description:
              "Opportunity attacks have Disadvantage against you.",
            linkedModifiers: [
              incomingAttackMode("escape_the_horde", "disadvantage", {
                conditions: ["Opportunity attacks against you"],
              }),
            ],
          },
          {
            name: "Multiattack Defense",
            description:
              "When a creature hits you with an attack roll, that creature has Disadvantage on all other attack rolls against you this turn.",
            linkedModifiers: [
              // 2024 SRD: disadvantage on the attacker's *other* attacks this turn, not the
              // 2014 rules' flat +4 AC — corrected during the Ranger subclass audit.
              incomingAttackMode("multiattack_defense", "disadvantage", {
                conditions: ["Other attacks this turn from a creature that already hit you"],
              }),
            ],
          },
          {
            name: "Steel Will",
            description: "You have Advantage on saving throws against being Frightened.",
            linkedModifiers: [
              checkAdvantage("steel_will", {
                category: "save",
                ability: "Wisdom",
                conditions: ["Frightened"],
              }),
            ],
          },
        ],
      },
    }
  }

  if (name === "Elemental Affinity") {
    const damageTypes = ["Acid", "Cold", "Fire", "Lightning", "Poison"] as const
    return {
      ...feature,
      isChoice: true,
      choices: {
        category: "Elemental Affinity",
        count: 1,
        options: damageTypes.map((damageType) => {
          const key = damageType.toLowerCase()
          return {
            name: damageType,
            description: `You have Resistance to ${damageType} damage, and when you cast a spell that deals ${damageType} damage, you can add your Charisma modifier to one damage roll of that spell.`,
            linkedModifiers: [
              damageResistance([damageType], `${damageType} Resistance`),
              onCastSpellChar(`elemental_affinity_${key}`, {
                spellTags: ["damage"],
                effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
                label: `+CHA to one ${damageType} damage roll of a spell`,
              }),
            ],
          }
        }),
      },
    }
  }

  if (name === "The Third Eye") {
    return {
      ...feature,
      isChoice: true,
      choices: {
        category: "Third Eye Benefit",
        count: 1,
        swappableOnRest: true,
        swapRestType: "short",
        options: [
          {
            name: "Darkvision",
            description: "You gain Darkvision with a range of 120 feet.",
            linkedModifiers: [vision(120, "darkvision", "Darkvision 120 ft. (Third Eye)")],
          },
          {
            name: "Greater Comprehension",
            description: "You can read any language.",
            linkedModifiers: [languages(["Read any language"], undefined, "Greater Comprehension")],
          },
          {
            name: "See Invisibility",
            description: "You can cast See Invisibility without expending a spell slot.",
            linkedModifiers: [
              castSpellFx(
                "third_eye_see_invisibility",
                {
                  castSpellName: "See Invisibility",
                  castSpellLevel: 2,
                  castSpellListClasses: ["Wizard"],
                  castSpellWithoutSlot: true,
                  castSpellCastingTime: "action",
                  label: "See Invisibility without a spell slot",
                },
                { action: true },
              ),
            ],
          },
        ],
      },
    }
  }

  return feature
}

function alwaysPreparedSpells(label: string): LinkedModifierInstance {
  return charInstance(`modinst_always_prep_${label.replace(/\s+/g, "_")}`, FEAT_MODIFIER_CATALOG.spellsKnown, [
    {
      id: modId(`always_prep_${label}`),
      type: "spells_known",
      spells: [],
      alwaysPrepared: true,
      label,
    },
  ])
}

function resourceResetOnInitiative(
  resourceKey: string,
  cap?: number,
  label?: string,
): LinkedModifierInstance {
  return fxInstance(`modinst_init_refresh_${resourceKey}`, CLASS_RESOURCE_CATALOG_ID, {
    onInitiative: true,
    effects: [
      {
        id: modId(`init_refresh_${resourceKey}`),
        kind: "class_resource",
        classResourceKey: resourceKey,
        classResourceChange: "reset",
        resourceRefreshOnInitiative: true,
        resourceRefreshCap: cap ?? null,
        label,
      },
    ],
  })
}

function resourceResetOnRest(
  resourceKey: string,
  rest: "short_rest" | "long_rest" | "short_or_long_rest",
  label?: string,
): LinkedModifierInstance {
  return fxInstance(`modinst_rest_refresh_${resourceKey}`, CLASS_RESOURCE_CATALOG_ID, {
    effects: [
      {
        id: modId(`rest_refresh_${resourceKey}`),
        kind: "class_resource",
        classResourceKey: resourceKey,
        classResourceChange: "reset",
        resourceRefreshOnRest: rest,
        label,
      },
    ],
  })
}

function resourceResetHalfLevel(
  resourceKey: string,
  rest: "short_rest" | "long_rest" | "short_or_long_rest",
  label?: string,
): LinkedModifierInstance {
  return fxInstance(`modinst_half_refresh_${resourceKey}`, CLASS_RESOURCE_CATALOG_ID, {
    effects: [
      {
        id: modId(`half_refresh_${resourceKey}`),
        kind: "class_resource",
        classResourceKey: resourceKey,
        classResourceChange: "reset",
        resourceRefreshOnRest: rest,
        resourceRefreshFormula: "half_level",
        label,
      },
    ],
  })
}

function savingThrowTriggerPreset(
  instanceKey: string,
  config: {
    triggerOn: "make" | "fail" | "ally_fails"
    targetScope: import("@/lib/compendium/characteristic-modifiers").SavingThrowTargetScope
    saveAbility?: string | null
    effectCatalogRefId: string
    useReaction?: boolean
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, SAVING_THROW_TRIGGER_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "saving_throw_trigger",
      triggerOn: config.triggerOn,
      targetScope: config.targetScope,
      saveAbility: config.saveAbility ?? null,
      useReaction: config.useReaction ?? false,
      effect: { catalogRefId: config.effectCatalogRefId },
    },
  ])
}

function onHitTriggerPreset(
  instanceKey: string,
  config: {
    appliesTo?: string
    effectCatalogRefId: string
    spendResourceKey?: string
    spendResourceAmount?: number
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, ON_HIT_TRIGGER_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "on_hit_trigger",
      oncePerTurn: true,
      appliesTo: config.appliesTo ?? null,
      spendResourceKey: config.spendResourceKey ?? null,
      spendResourceAmount: config.spendResourceAmount ?? null,
      effect: { catalogRefId: config.effectCatalogRefId },
    },
  ])
}

function failedRollTriggerPreset(
  instanceKey: string,
  config: {
    rollKind: "ability" | "skill" | "attack" | "save"
    triggerOn?: "fail" | "success"
    targetScope?: import("@/lib/compendium/characteristic-modifiers").SavingThrowTargetScope
    effectCatalogRefId: string
    spendResourceKey?: string
    useReaction?: boolean
    rangeFeet?: number
    refundResourceOnStillFailed?: boolean
    label?: string
    /** Nested check_roll_modifier (etc.) when the bonus is not a resource die. */
    effectActivation?: import("@/lib/types").FeatureActivation | null
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, FAILED_ROLL_TRIGGER_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "failed_roll_trigger",
      triggerOn: config.triggerOn ?? "fail",
      rollKind: config.rollKind,
      targetScope: config.targetScope ?? "self",
      rangeFeet: config.rangeFeet ?? null,
      useReaction: config.useReaction ?? false,
      spendResourceKey: config.spendResourceKey ?? null,
      spendResourceAmount: config.spendResourceKey ? 1 : null,
      refundResourceOnStillFailed: config.refundResourceOnStillFailed ?? false,
      effect: {
        catalogRefId: config.effectCatalogRefId,
        ...(config.effectActivation ? { activation: config.effectActivation } : {}),
      },
      label: config.label,
    },
  ])
}

function d20TestReactionPreset(
  instanceKey: string,
  config: {
    modifierMode: "add" | "subtract"
    targetScope: import("@/lib/compendium/characteristic-modifiers").SavingThrowTargetScope
    effectCatalogRefId: string
    useReaction?: boolean
    rangeFeet?: number
    spendResourceKey?: string
    dieSource?: "resource_die" | "fixed" | "ability_modifier"
    fixedDie?: string
    dieAbility?: import("@/lib/compendium/characteristic-modifiers").AbilityScoreKey
    rollKinds?: import("@/lib/compendium/characteristic-modifiers").RollTriggerKind[]
    label?: string
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, D20_TEST_REACTION_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "d20_test_reaction",
      modifierMode: config.modifierMode,
      rollKinds: config.rollKinds ?? [],
      targetScope: config.targetScope,
      rangeFeet: config.rangeFeet ?? null,
      useReaction: config.useReaction ?? false,
      spendResourceKey: config.spendResourceKey ?? null,
      spendResourceAmount: config.spendResourceKey ? 1 : null,
      dieSource: config.dieSource ?? "resource_die",
      fixedDie: config.fixedDie ?? null,
      dieAbility: config.dieAbility ?? null,
      effect: { catalogRefId: config.effectCatalogRefId },
      label: config.label,
    },
  ])
}

function damageHalvingReactionPreset(
  instanceKey: string,
  config?: { cancelCritRiders?: boolean; requiresPriorDisadvantage?: boolean },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, DAMAGE_HALVING_REACTION_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "damage_halving_reaction",
      useReaction: true,
      cancelCritRiders: config?.cancelCritRiders ?? false,
      requiresPriorDisadvantage: config?.requiresPriorDisadvantage ?? false,
    },
  ])
}

function healingDicePoolPreset(
  instanceKey: string,
  config: {
    dieType: "d4" | "d6" | "d8" | "d10" | "d12" | "d20"
    poolSize?: number
    poolSizeByLevel?: import("@/lib/compendium/bonus-by-level").BonusByLevelEntry[]
    maxAbility?: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA"
    label?: string
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, HEALING_DICE_POOL_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "healing_dice_pool",
      dieType: config.dieType,
      poolSize: config.poolSize ?? null,
      poolSizeByLevel: config.poolSizeByLevel ?? [],
      maxDicePerUse: config.maxAbility
        ? { type: "ability_modifier", ability: config.maxAbility.toLowerCase() as import("@/lib/compendium/characteristic-modifiers").AbilityScoreKey }
        : null,
      activation: "bonus_action",
      recharges: [{ rest: "long_rest" }],
      label: config.label,
    },
  ])
}

function onCreatureDeathTriggerPreset(
  instanceKey: string,
  config: {
    creatureFilter: "enemy" | "ally" | "any"
    rangeFeet: number
    effectCatalogRefId: string
    useReaction?: boolean
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, ON_CREATURE_DEATH_TRIGGER_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "on_creature_death_trigger",
      creatureFilter: config.creatureFilter,
      rangeFeet: config.rangeFeet,
      useReaction: config.useReaction ?? false,
      effect: { catalogRefId: config.effectCatalogRefId },
    },
  ])
}

function telepathyPreset(instanceKey: string, rangeFeet: number, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, TELEPATHY_CATALOG_ID, [
    { id: modId(instanceKey), type: "telepathy", rangeFeet, canInitiate: true, label },
  ])
}

function usesPoolWithRestore(
  uses: UsesConfig,
  label: string,
  restoreByResource?: UsesConfig["restoreByResource"],
  restoreBySpellSlot?: UsesConfig["restoreBySpellSlot"],
): LinkedModifierInstance {
  return usesPool(
    {
      ...uses,
      ...(restoreByResource ? { restoreByResource } : {}),
      ...(restoreBySpellSlot ? { restoreBySpellSlot } : {}),
    },
    label,
  )
}

function allySaveReplacePreset(
  instanceKey: string,
  config: {
    replaceWith: number
    spendResourceKey: string
    useReaction?: boolean
    bonusEqualToLevel?: boolean
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, SAVING_THROW_TRIGGER_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "saving_throw_trigger",
      triggerOn: "ally_fails",
      targetScope: "allied_creature",
      useReaction: config.useReaction ?? true,
      replaceFailedRollWith: config.replaceWith,
      spendResourceKey: config.spendResourceKey,
      spendResourceAmount: 1,
      effect: config.bonusEqualToLevel
        ? { catalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID }
        : null,
    },
  ])
}

function spellHealingModifier(
  instanceKey: string,
  config: Partial<import("@/lib/compendium/characteristic-modifiers").SpellHealingModifierCharacteristic>,
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, SPELL_HEALING_MODIFIER_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "spell_healing_modifier",
      bonusFlat: 2,
      bonusPerSpellLevel: 1,
      ...config,
    },
  ])
}

function castSpellFx(
  instanceKey: string,
  effect: Partial<import("@/lib/types").FeatureEffect>,
  activation: Partial<FeatureActivation> = { action: true },
): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, "cat_fx_cast_spell", {
    ...activation,
    effects: [
      {
        id: modId(instanceKey),
        kind: "cast_spell",
        castSpellCastingTime: "action",
        castSpellLevel: 1,
        castSpellListClasses: [],
        ...effect,
      },
    ],
  })
}

function spellsKnownChar(
  instanceKey: string,
  config: Partial<import("@/lib/compendium/characteristic-modifiers").SpellsKnownCharacteristic>,
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.spellsKnown, [
    {
      id: modId(instanceKey),
      type: "spells_known",
      spells: [],
      choiceGrants: [],
      spellListClassOptions: [],
      ...config,
    },
  ])
}

function onCastSpellChar(
  instanceKey: string,
  config: Partial<import("@/lib/compendium/characteristic-modifiers").OnCastSpellTriggerCharacteristic>,
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, ON_CAST_SPELL_TRIGGER_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "on_cast_spell_trigger",
      spellTags: [],
      effect: null,
      ...config,
    },
  ])
}

function schoolSavantPreset(school: string): LinkedModifierInstance {
  const key = school.toLowerCase().replace(/\s+/g, "_")
  return spellsKnownChar(`${key}_savant`, {
    choiceGrants: [
      { level: 1, count: 2 },
      { level: 2, count: 2 },
    ],
    spellListClassOptions: ["Wizard"],
    label: `${school} spells (≤2nd) in spellbook; +1 ${school} spell per new slot level`,
  })
}

function toolsPreset(instanceKey: string, tools: string[], label?: string): LinkedModifierInstance {
  return charInstance(`modinst_tools_${instanceKey}`, "cat_char_tool_proficiencies", [
    {
      id: modId(`tools_${instanceKey}`),
      type: "tool_proficiencies",
      values: tools,
      label,
    },
  ])
}

/** Expands a prepared caster's spell pool to include other classes' spell lists. */
function spellListAccessPreset(
  instanceKey: string,
  classNames: string[],
  label?: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, "cat_char_spell_list_access", [
    {
      id: modId(instanceKey),
      type: "spell_list_access",
      classNames,
      label,
    },
  ])
}

/** Player picks `count` tools/instruments from a specific pool at build time. */
function toolChoice(
  instanceKey: string,
  count: number,
  options: string[],
  label?: string,
): LinkedModifierInstance {
  return charInstance(`modinst_toolchoice_${instanceKey}`, "cat_char_tool_proficiencies", [
    {
      id: modId(`toolchoice_${instanceKey}`),
      type: "tool_proficiencies",
      values: [],
      choiceCount: count,
      choiceOptions: options,
      label,
    },
  ])
}

function toolChoicePool(
  instanceKey: string,
  count: number,
  pool: ToolChoicePool,
  label?: string,
): LinkedModifierInstance {
  return charInstance(`modinst_toolchoice_${instanceKey}`, "cat_char_tool_proficiencies", [
    {
      id: modId(`toolchoice_${instanceKey}`),
      type: "tool_proficiencies",
      values: [],
      choiceCount: count,
      toolChoicePool: pool,
      label,
    },
  ])
}

/**
 * Monk core tool proficiency: "Choose one type of Artisan's Tools or Musical Instrument".
 * Surfaced as a build-time tool-proficiency choice (one pick from the combined pool).
 */
export function monkToolProficiencyChoice(): LinkedModifierInstance {
  return toolChoice(
    "monk_tools",
    1,
    toolNamesForPools(["artisans", "musical"]),
    "Artisan's Tools or Musical Instrument (choose 1)",
  )
}

function battleReadyPreset(): LinkedModifierInstance[] {
  return [
    charInstance("modinst_battle_ready_weapons", "cat_char_weapon_proficiencies", [
      {
        id: modId("battle_ready_weapons"),
        type: "weapon_proficiencies",
        mode: "martial_weapons",
        values: [],
        label: "Martial weapons; INT for magic weapon attack/damage; weapon as spellcasting focus",
      },
    ]),
  ]
}

function companionPreset(name: string): LinkedModifierInstance {
  return featureOptionPicker(`${name} (companion stat block)`, false)
}

/**
 * Grants Creatures & Companions entries by name (resolved against the
 * creatures table onto the sheet Companions tab).
 */
function grantCreaturePreset(
  instanceKey: string,
  creatureNames: string[],
  options?: { choiceOptions?: string[]; count?: number; label?: string },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, GRANT_CREATURE_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "grant_creature",
      creatureNames,
      ...(options?.choiceOptions?.length ? { choiceOptions: options.choiceOptions } : {}),
      ...(options?.count != null ? { count: options.count } : {}),
      ...(options?.label ? { label: options.label } : {}),
    },
  ])
}

function damageResReaction(instanceKey: string, label: string): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, DAMAGE_REDUCTION_CATALOG_ID, {
    reaction: true,
    effects: [
      {
        id: modId(instanceKey),
        kind: "damage_reduction",
        mitigation: "resistance",
        label,
      },
    ],
  })
}

function weaponMasterySwap(instanceKey: string, properties: string[], label?: string): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.attackRollModifiers, [
    {
      id: modId(instanceKey),
      type: "attack_roll_modifiers",
      entries: [{ bonus: 0, target: "all" }],
      weaponMasteryOverrides: properties,
      label,
    },
  ])
}

function movementHalfSpeedOnExistingFeature(
  instanceKey: string,
  existingFeatureName: string,
): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.movementOption, {
    usesExistingClassFeature: true,
    existingClassFeatureName: existingFeatureName,
    effects: [
      {
        id: modId(instanceKey),
        kind: "movement_option",
        moveDistanceMode: "multiplier",
        moveDistanceMultiplier: 0.5,
        moveWithoutOpportunityAttacks: true,
      },
    ],
  })
}

function intimidatingPresence(): LinkedModifierInstance[] {
  return [
    usesPoolWithRestore(
      { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
      "Intimidating Presence",
      { resourceKey: "rage", restores: 1 },
    ),
    fxInstance("modinst_intimidating_presence", FORCE_SAVE_CATALOG_ID, {
      bonusAction: true,
      effects: [
        {
          id: modId("intimidating_presence"),
          kind: "force_save_control",
          attackProfile: "force_save",
          saveAbility: "Wisdom",
          effectConditionTypes: ["Frightened"],
        },
      ],
    }),
  ]
}

function naturesVeil(): LinkedModifierInstance[] {
  return [
    usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Nature's Veil"),
    fxInstance("modinst_natures_veil", MODIFY_CREATURE_CATALOG_ID, {
      bonusAction: true,
      effects: [
        {
          id: modId("natures_veil"),
          kind: "modify_creature",
          rollTarget: "ally",
          creatureModifyMode: "restrict",
          effectConditionTypes: ["Invisible"],
        },
      ],
    }),
  ]
}

function fastHandsPicker(): LinkedModifierInstance {
  return charInstance("modinst_fast_hands", FEATURE_OPTION_PICKER_CATALOG_ID, [
    legacyFeatureOptionPickerCharacteristic({
      id: modId("fast_hands"),
      category: "Fast Hands",
      choiceCount: 1,
      options: [
        { name: "Sleight of Hand", description: "" },
        { name: "Use Object", description: "" },
        { name: "Thieves' Tools", description: "" },
      ],
    }),
  ])
}

function fontOfMagicMenu(): LinkedModifierInstance {
  return charInstance("modinst_font_of_magic", RESOURCE_ABILITY_MENU_CATALOG_ID, [
    {
      id: modId("font_of_magic"),
      type: "resource_ability_menu",
      resourceKey: "sorcery_points",
      options: [
        {
          name: "Convert Spell Slot to Sorcery Points",
          resourceCost: 0,
          effect: null,
        },
        {
          name: "Create Spell Slot",
          resourceCost: 2,
          effect: null,
        },
      ],
    },
  ])
}

function magicalTinkeringPreset(): LinkedModifierInstance[] {
  return [
    charInstance("modinst_magical_tinkering", FEAT_MODIFIER_CATALOG.equipmentAndMagicItems, [
      {
        id: modId("magical_tinkering"),
        type: "equipment_and_magic_items",
        mode: "create_mundane",
        itemOptions: [
          "Ball Bearings",
          "Flask",
          "Pouch",
          "Basket",
          "Grappling Hook",
          "Rope",
          "Bedroll",
          "Hunting Trap",
          "Sack",
          "Bell",
          "Jug",
          "Shovel",
          "Blanket",
          "Lamp",
          "Spikes, Iron",
          "Block and Tackle",
          "Manacles",
          "String",
          "Bottle, Glass",
          "Net",
          "Tinderbox",
          "Bucket",
          "Oil",
          "Torch",
          "Caltrops",
          "Paper",
          "Vial",
          "Candle",
          "Parchment",
          "Crowbar",
          "Pole",
        ],
        usesPerLongRest: "ability_modifier",
        usesAbility: "intelligence",
        label: "Tinker's Magic",
      },
    ]),
  ]
}

function replicateMagicItemPreset(): LinkedModifierInstance[] {
  return [
    charInstance("modinst_replicate_magic_item", FEAT_MODIFIER_CATALOG.equipmentAndMagicItems, [
      {
        id: modId("replicate_magic_item"),
        type: "equipment_and_magic_items",
        mode: "replicate_magic_item",
        planTables: [
          {
            minArtificerLevel: 2,
            label: "Magic Item Plans (Artificer Level 2+)",
            items: [
              "Alchemy Jug",
              "Bag of Holding",
              "Cap of Water Breathing",
              "Common magic item (not Potion/Scroll/cursed)",
              "Goggles of Night",
              "Manifold Tool",
              "Repeating Shot",
              "Returning Weapon",
              "Rope of Climbing",
              "Sending Stones",
              "Shield, +1",
              "Wand of Magic Detection",
              "Wand of Secrets",
              "Wand of the War Mage, +1",
              "Weapon, +1",
              "Wraps of Unarmed Power, +1",
            ],
          },
          {
            minArtificerLevel: 6,
            label: "Magic Item Plans (Artificer Level 6+)",
            items: [
              "Armor, +1",
              "Boots of Elvenkind",
              "Boots of the Winding Path",
              "Cloak of Elvenkind",
              "Cloak of the Manta Ray",
              "Dazzling Weapon",
              "Eyes of Charming",
              "Eyes of Minute Seeing",
              "Gloves of Thievery",
              "Helm of Awareness",
              "Lantern of Revealing",
              "Mind Sharpener",
              "Necklace of Adaptation",
              "Pipes of Haunting",
              "Repulsion Shield",
              "Ring of Swimming",
              "Ring of Water Walking",
              "Sentinel Shield",
              "Spell-Refueling Ring",
              "Wand of Magic Missiles",
              "Wand of Web",
              "Weapon of Warning",
            ],
          },
          {
            minArtificerLevel: 10,
            label: "Magic Item Plans (Artificer Level 10+)",
            items: [
              "Armor of Resistance",
              "Dagger of Venom",
              "Elven Chain",
              "Ring of Feather Falling",
              "Ring of Jumping",
              "Ring of Mind Shielding",
              "Shield, +2",
              "Uncommon Wondrous Item (not cursed)",
              "Wand of the War Mage, +2",
              "Weapon, +2",
              "Wraps of Unarmed Power, +2",
            ],
          },
          {
            minArtificerLevel: 14,
            label: "Magic Item Plans (Artificer Level 14+)",
            items: [
              "Armor, +2",
              "Arrow-Catching Shield",
              "Flame Tongue",
              "Rare Wondrous Item (not cursed)",
              "Ring of Free Action",
              "Ring of Protection",
              "Ring of the Ram",
            ],
          },
        ],
        itemOptions: [
          "Alchemy Jug",
          "Bag of Holding",
          "Cap of Water Breathing",
          "Sending Stones",
          "Wand of the War Mage, +1",
          "Weapon, +1",
          "Shield, +1",
          "Armor, +1",
          "Boots of Elvenkind",
          "Cloak of Elvenkind",
          "Wand of Magic Missiles",
          "Armor of Resistance",
          "Elven Chain",
          "Weapon, +2",
          "Flame Tongue",
          "Ring of Protection",
        ],
        choiceCount: 4,
        label: "Replicate Magic Item",
      },
    ]),
  ]
}

function mysticArcanumPreset(): LinkedModifierInstance[] {
  return innateArcanumPresetForClass("Warlock", [
    { spellLevel: 6, classLevel: 11 },
    { spellLevel: 7, classLevel: 11 },
    { spellLevel: 8, classLevel: 11 },
    { spellLevel: 9, classLevel: 11 },
  ])
}

/** Staggered arcanum tiers (Alternate Sorcerer) or bundled (Warlock). */
export function innateArcanumPresetForClass(
  className: string,
  tiers: { spellLevel: number; classLevel: number }[],
): LinkedModifierInstance[] {
  return [
    usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Innate Arcanum"),
    charInstance("modinst_innate_arcanum", FEAT_MODIFIER_CATALOG.spellsKnown, [
      {
        id: modId("innate_arcanum"),
        type: "spells_known",
        spells: [],
        choiceGrants: tiers.map((tier) => ({
          level: tier.spellLevel,
          count: 1,
          unlocksAtClassLevel: tier.classLevel,
        })),
        spellListClassOptions: [className],
        label: "Innate Arcanum",
      },
    ]),
  ]
}

export function innateSorceryPreset(): LinkedModifierInstance[] {
  return [
    usesPool(INNATE_SORCERY_FEATURE_USES, "Innate Sorcery"),
    fxInstance("modinst_innate_sorcery", SELF_BUFF_CASTER_CATALOG_ID, {
      bonusAction: true,
      effects: [{ id: modId("innate_sorcery"), kind: "self_buff_caster", casterBuffLabel: "Innate Sorcery" }],
    }),
    checkAdvantage("innate_sorcery_spell_attack", {
      category: "spell_attack",
      limitations: [requiresActiveToggleLimitation("while_innate_sorcery_active")],
    }),
    checkBonus("innate_sorcery_spell_save_dc", {
      category: "spell_save_dc",
      bonusConfig: { mode: "fixed", fixed: 1 },
      limitations: [requiresActiveToggleLimitation("while_innate_sorcery_active")],
    }),
  ]
}

function monkFocusMenu(): LinkedModifierInstance {
  return charInstance("modinst_monk_focus_menu", RESOURCE_ABILITY_MENU_CATALOG_ID, [
    {
      id: modId("monk_focus_menu"),
      type: "resource_ability_menu",
      resourceKey: "focus_points",
      options: [
        { name: "Flurry of Blows", resourceCost: 1, effect: { catalogRefId: "cat_fx_bonus_action_attack" } },
        { name: "Patient Defense", resourceCost: 1, effect: { catalogRefId: "cat_fx_boost_ac" } },
        { name: "Step of the Wind", resourceCost: 1, effect: { catalogRefId: FEAT_MODIFIER_CATALOG.movementOption } },
      ],
    },
  ])
}

function bonusRidersPreset(
  instanceKey: string,
  riders: {
    name: string
    costDice?: string
    description?: string
    unlocksAtLevel?: number
    costResourceKey?: string
    costResourceAmount?: number
  }[],
  maxRidersPerUse = 1,
  appliesTo?: string,
  options?: {
    maxRidersPerUseByLevel?: { level: number; count: number }[]
    automaticBonusByLevel?: import("@/lib/compendium/bonus-by-level").BonusByLevelEntry[]
  },
): LinkedModifierInstance {
  return charInstance(`modinst_riders_${instanceKey}`, BONUS_DAMAGE_RIDERS_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "bonus_damage_riders",
      riders: riders.map((rider) => ({
        name: rider.name,
        costDice: rider.costDice ?? null,
        description: rider.description ?? null,
        unlocksAtLevel: rider.unlocksAtLevel ?? null,
        costResourceKey: rider.costResourceKey ?? null,
        costResourceAmount: rider.costResourceAmount ?? null,
      })),
      maxRidersPerUse,
      maxRidersPerUseByLevel: options?.maxRidersPerUseByLevel ?? [],
      automaticBonusByLevel: options?.automaticBonusByLevel ?? [],
      appliesTo: appliesTo ?? null,
    },
  ])
}

function normalizePreset(preset: ClassFeatureModifierPreset): {
  linkedModifiers: LinkedModifierInstance[]
  activation?: Partial<FeatureActivation>
} {
  if (Array.isArray(preset)) return { linkedModifiers: preset }
  return {
    linkedModifiers: preset.linkedModifiers ?? [],
    activation: preset.activation,
  }
}

const CUNNING_STRIKE_RIDERS = [
  {
    name: "Poison",
    costResourceKey: "sneak_attack",
    costResourceAmount: 1,
    description: "Target makes CON save or is Poisoned",
    unlocksAtLevel: 5,
  },
  {
    name: "Trip",
    costResourceKey: "sneak_attack",
    costResourceAmount: 1,
    description: "Target makes DEX save or is Prone",
    unlocksAtLevel: 5,
  },
  {
    name: "Withdraw",
    costResourceKey: "sneak_attack",
    costResourceAmount: 1,
    description: "Move half speed without opportunity attacks",
    unlocksAtLevel: 5,
  },
]

const BRUTAL_STRIKE_RIDERS = [
  {
    name: "Forceful Blow",
    description: "Push target 15 ft.; move half speed toward target without provoking Opportunity Attacks",
    unlocksAtLevel: 9,
  },
  {
    name: "Hamstring Blow",
    description: "Target Speed −15 ft. until start of your next turn",
    unlocksAtLevel: 9,
  },
  {
    name: "Staggering Blow",
    description: "Target has Disadvantage on next save; no Opportunity Attacks until your next turn",
    unlocksAtLevel: 13,
  },
  {
    name: "Sundering Blow",
    description: "Next attack against target by another creature gains +5",
    unlocksAtLevel: 13,
  },
]

const ALL_SAVES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]

/** `${Class}::${Feature}` or `*::${Feature}` for shared presets. */
const SRD_CLASS_FEATURE_MODIFIER_PRESETS: Record<string, ClassFeatureModifierPreset> = {
  "Barbarian::Unarmored Defense": [unarmoredDefense("barb_uac", ["DEX", "CON"], "Unarmored Defense")],
  "Monk::Unarmored Defense": [unarmoredDefense("monk_uac", ["DEX", "WIS"], "Unarmored Defense")],
  "*::Danger Sense": [
    checkAdvantage("danger_sense", {
      category: "save",
      ability: "Dexterity",
      limitations: [blockedWhenConditionLimitation("Incapacitated")],
    }),
  ],
  "*::Reckless Attack": [
    checkAdvantage("reckless_attack", {
      category: "attack",
      ability: "Strength",
      limitations: [requiresActiveToggleLimitation("reckless_attack")],
    }),
    incomingAttackMode("reckless_attack_drawback", "advantage", {
      conditions: ["Melee attacks against you"],
      limitations: [requiresActiveToggleLimitation("reckless_attack")],
    }),
  ],
  "*::Primal Knowledge": [
    classSkillListChoice(1, "Primal Knowledge skill"),
    alternateAbilitySkillCheck(
      "primal_knowledge_str_checks",
      "strength",
      ["Acrobatics", "Intimidation", "Perception", "Stealth", "Survival"],
      "While your Rage is active",
      "Primal Knowledge (Strength for skill checks while raging)",
      [requiresActiveToggleLimitation("while_raging")],
    ),
  ],
  "*::Fast Movement": [
    speedAdd(10, "+10 ft. walk", [notWearingArmorLimitation("Heavy armor")]),
  ],
  "*::Unarmored Movement": [
    speedAddByLevel(
      [
        { level: 5, mode: "fixed", fixed: 10 },
        { level: 10, mode: "fixed", fixed: 15 },
        { level: 15, mode: "fixed", fixed: 20 },
        { level: 18, mode: "fixed", fixed: 25 },
        { level: 20, mode: "fixed", fixed: 30 },
      ],
      "+10–30 ft. walk (scales by level)",
      [notWearingArmorLimitation("Heavy armor")],
    ),
  ],
  "*::Feral Instinct": [checkAdvantage("feral_instinct", { category: "initiative" })],
  "*::Mindless Rage": [
    conditionImmunity(
      ["Charmed", "Frightened"],
      "While Rage is active",
      [requiresActiveToggleLimitation("while_raging")],
    ),
  ],
  "*::Indomitable Might": [
    checkAbilityFloor("indomitable_might_ability", "ability", "Strength"),
    checkAbilityFloor("indomitable_might_save", "save", "Strength"),
  ],
  "Barbarian::Primal Champion": [
    abilityBonuses({ strength: 4, constitution: 4 }, "Primal Champion (+4 STR/CON)"),
  ],
  "Monk::Body and Mind": [
    abilityBonuses({ dexterity: 4, wisdom: 4 }, "Body and Mind (+4 DEX/WIS)"),
  ],
  "*::Expertise": [skillChoice(2, "Expertise", true)],
  "*::Blindsense": [blindsenseVision()],
  "*::Bonus Proficiencies": [skillChoice(3, "Bonus skill proficiencies")],
  "Bard::Bardic Inspiration": [
    toolChoicePool("bard_instruments", 3, "musical", "Musical Instruments (choose 3)"),
  ],
  "*::Jack of All Trades": [
    checkBonus("jack_of_all_trades", {
      category: "ability",
      bonusConfig: {
        mode: "proficiency",
        multiplier: 0.5,
        bonusAppliesWhen: "non_proficient_skill_only",
      },
    }),
  ],
  "*::Druidic": [languages(["Druidic"], undefined, "Druidic")],
  "*::Thieves' Cant": [
    languages(["Thieves' Cant"], 1, "Thieves' Cant + 1 language"),
  ],
  "*::Scholar": [skillChoice(1, "Scholar skill proficiency")],
  "*::Slippery Mind": [savingThrows(["Wisdom", "Charisma"], "WIS & CHA saves")],
  "*::Disciplined Survivor": [savingThrows(ALL_SAVES, "All saving throws")],
  "*::Martial Arts": {
    linkedModifiers: [
      unarmedDieByLevel(monkMartialArtsDieScaling(), "Martial Arts die"),
      fxInstance("modinst_martial_arts_bonus_unarmed", "cat_fx_bonus_action_attack", {
        bonusAction: true,
        effects: [{ id: modId("martial_arts_bonus_unarmed"), kind: "bonus_action_attack" }],
      }),
    ],
  },
  "*::Sneak Attack": [bonusDamageByLevel("sneak_attack", sneakAttackScaling())],
  "*::Cunning Action": [movementCunningAction()],
  "*::Second-Story Work": [
    speedTypeAdd("climb", 0, "Climb Speed equal to Speed"),
  ],
  "*::Steady Aim": [
    fxInstance("modinst_steady_aim", CHECK_ROLL_MODIFIER_CATALOG_ID, {
      bonusAction: true,
      effects: [
        {
          id: modId("steady_aim"),
          kind: "check_roll_modifier",
          checkRollMode: "advantage",
          checkCategory: "attack",
        },
      ],
    }),
  ],
  "*::Reliable Talent": [
    checkRollFloor("reliable_talent", {
      category: "skill",
      below: 9,
      setTo: 10,
    }),
  ],
  "*::Stroke of Luck": [
    checkRollFloor("stroke_of_luck", { category: "other", below: 19, setTo: 20 }),
    usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Stroke of Luck"),
  ],
  "*::Improved Critical": [
    criticalHitRangeByLevel(19, [{ level: 15, minimum: 18 }], "Critical hit on 19–20 (18–20 at level 15+)"),
  ],
  "*::Superior Critical": [],
  "*::Remarkable Athlete": [
    checkAdvantage("remarkable_athlete_init", { category: "initiative" }),
    checkAdvantage("remarkable_athlete_athletics", {
      category: "skill",
      skills: ["Athletics"],
    }),
  ],
  "*::Heroic Warrior": [gainInspiration()],
  "*::Additional Fighting Style": [grantFeat(["Fighting Style"], "Fighting Style feat")],
  "*::Survivor": [
    checkAdvantage("survivor_defy_death", {
      category: "death_save",
      limitations: [requiresAtMostHpLimitation(0)],
    }),
    deathSaveCritThreshold("survivor_defy_death_crit", 18),
    turnStartHeal("survivor_heroic_rally", {
      healAbility: "constitution",
      healFlatBonus: 5,
      hpBelowFraction: 0.5,
      hpAtLeast: 1,
      label: "Heroic Rally (5 + CON mod while Bloodied)",
    }),
  ],
  "Sorcerer::Draconic Sorcery::Draconic Resilience": [
    // 2024: +3 at feature grant, then +1 per further Sorcerer level ≡ +1 × Sorcerer level total.
    hitPointsPerLevel(1, "+1 HP per Sorcerer level (Draconic Resilience)"),
    draconicAc("draconic_resilience_ac"),
  ],
  "*::Elemental Affinity": [featureOptionPicker("Elemental Affinity damage type")],
  "*::Fiendish Resilience": [damageResistance([], "Chosen damage type (after rest)")],
  "*::Nature's Ward": [
    conditionImmunity(["Poisoned"], "Nature's Ward"),
    damageResistance([], "Resistance from current land"),
  ],
  "*::Aura of Devotion": [
    conditionImmunity(["Charmed"], "Allies in Aura of Protection"),
  ],
  "*::Aura of Courage": [
    conditionImmunity(["Frightened"], "Allies in Aura of Protection"),
  ],
  "*::Roving": [
    speedAdd(10, "+10 ft. walk", [notWearingArmorLimitation("Heavy armor")]),
    speedTypeAdd("climb", 0, "Climb Speed equal to Speed"),
    speedTypeAdd("swim", 0, "Swim Speed equal to Speed"),
  ],
  "*::Feral Senses": [vision(30, "blindsight", "Blindsight 30 ft.")],
  "*::Precise Hunter": [
    checkAdvantage("precise_hunter", {
      category: "attack",
      ability: null,
      limitations: [requiresActiveToggleLimitation("quarry_marked")],
    }),
  ],
  "*::Use Magic Device": [attunementSlots(4, "Attune to 4 magic items")],
  "*::Dark One's Own Luck": [
    usesPool(
      { type: "proficiency", recharges: [{ rest: "long_rest" }] },
      "Dark One's Own Luck",
    ),
    fxInstance("modinst_dark_ones_luck", CHECK_ROLL_MODIFIER_CATALOG_ID, {
      effects: [
        {
          id: modId("dark_ones_luck"),
          kind: "check_roll_modifier",
          checkCategory: "other",
        },
      ],
    }),
  ],
  "*::Frenzy": [extraDamageOnHit("frenzy", "2d6")],
  "*::Radiant Strikes": [extraDamageOnHit("radiant_strikes", "2d8")],
  "*::Wholeness of Body": [
    healSelfBonusAction("wholeness_of_body", { healAbility: "WIS", label: "Martial Arts die + WIS" }),
  ],
  "*::Dragon Wings": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Dragon Wings",
        { resourceKey: "sorcery_points", resourceAmount: 3, restores: 1 },
      ),
      speedTypeAdd("fly", 60, "Fly Speed 60 ft. while Dragon Wings are active", [
        requiresActiveToggleLimitation("dragon_wings_active"),
      ]),
    ],
  },
  "*::Evasion": [evasion()],
  "*::Elusive": [elusive()],
  "*::Dark One's Blessing": [grantTempHpOnKill("Dark One's Blessing")],
  "*::Tireless": [grantTempHpPool("Tireless temp HP")],
  "*::Aura of Protection": [
    auraPreset("aura_protection", {
      radiusFeet: 10,
      saveAbility: "CHA",
      label: "Aura of Protection",
      radiusAtLevel: { level: 18, radiusFeet: 30 },
    }),
  ],
  "Paladin::Aura Expansion": [
    auraPreset("aura_expansion", {
      radiusFeet: 30,
      label: "Aura of Protection 30 ft.",
    }),
  ],
  "*::Holy Nimbus": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Holy Nimbus",
        undefined,
        { minSpellLevel: 5, restores: 1 },
      ),
      auraPreset("holy_nimbus", {
        radiusFeet: 30,
        halfCover: true,
        label: "Holy Ward (adv. vs Fiend/Undead saves), radiant damage on enemy turn, sunlight",
      }),
    ],
  },
  "*::Paladin's Smite": [alwaysPreparedSpells("Divine Smite")],
  "*::Favored Enemy": [alwaysPreparedSpells("Hunter's Mark")],
  "*::Faithful Steed": [
    spellsKnownChar("faithful_steed", {
      alwaysPrepared: true,
      freeCastPerLongRest: [{ spellName: "Find Steed", count: 1 }],
      label: "Find Steed always prepared; cast once without a slot per Long Rest",
    }),
    grantCreaturePreset("faithful_steed_mount", ["Otherworldly Steed"], {
      label: "Otherworldly Steed (Find Steed)",
    }),
  ],
  "*::Life Domain Spells": [alwaysPreparedSpells("Life Domain spells")],
  "*::Oath of Devotion Spells": [alwaysPreparedSpells("Oath of Devotion spells")],
  "*::Fiend Spells": [alwaysPreparedSpells("Fiend Patron spells")],
  "*::Draconic Spells": [alwaysPreparedSpells("Draconic Sorcery spells")],
  "*::Circle of the Land Spells": [alwaysPreparedSpells("Circle of the Land spells")],
  "*::Circle of the Titan Spells": [alwaysPreparedSpells("Circle of the Titan spells")],
  "*::Demonic Spells": [alwaysPreparedSpells("Demonic Sorcery spells")],
  "Fighter::Hell Knight::Infernal Wound": {
    activation: { action: true },
    linkedModifiers: [
      usesPool(
        {
          type: "ability_modifier",
          abilityModifier: "CON",
          recharges: [{ rest: "short_rest" }],
        },
        "Infernal Wound uses",
      ),
    ],
  },
  "Fighter::Hell Knight::Hellfire Surge": {
    activation: { bonusAction: true },
  },
  "Fighter::Hell Knight::Devil's Misfortune": {
    activation: { reaction: true },
  },
  "Sorcerer::Demonic Sorcery::Abyssal Rupture": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool(INNATE_SORCERY_FEATURE_USES, "Extends Innate Sorcery"),
    ],
  },
  "Sorcerer::Demonic Sorcery::Abyssal Explosion": {
    activation: { action: true },
  },
  "Druid::Circle of the Titan::Titan Form": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool(
        { type: "class_resource", classResourceKey: "wild_shape", classResourceAmount: 1 },
        "Titan Form (Wild Shape)",
      ),
    ],
  },
  "*::Persistent Rage": [resourceResetOnInitiative("rage", undefined, "Regain all Rage uses on Initiative")],
  "*::Font of Inspiration": [
    resourceResetOnRest("bardic_inspiration", "short_or_long_rest", "Regain all BI on Short/Long Rest"),
  ],
  "*::Superior Inspiration": [
    resourceResetOnInitiative("bardic_inspiration", 2, "Regain BI until you have 2 on Initiative"),
  ],
  "*::Hunter's Prey": [featureOptionPicker("Hunter's Prey", true)],
  "*::Defensive Tactics": [featureOptionPicker("Defensive Tactics", true)],
  "*::Blessed Strikes": [featureOptionPicker("Blessed Strikes", false)],
  "*::Elemental Fury": [featureOptionPicker("Elemental Fury", false)],
  "*::Divine Order": [featureOptionPicker("Divine Order", false)],
  "*::Primal Order": [featureOptionPicker("Primal Order", false)],
  "*::Eldritch Invocations": [grantFeat(["Eldritch Invocation"], "Eldritch Invocation")],
  "*::Metamagic": [grantFeat(["Metamagic"], "Metamagic option")],
  "*::Mystic Techniques": [grantFeat(["Mystic Technique"], "Mystic Technique")],
  "*::Font of Magic": {
    linkedModifiers: [fontOfMagicMenu()],
  },
  "*::Mystic Arcanum": {
    linkedModifiers: mysticArcanumPreset(),
  },
  "*::Sorcery Incarnate": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool(
        {
          type: "class_resource",
          classResourceKey: "sorcery_points",
          classResourceAmount: 2,
        },
        "Activate Innate Sorcery (2 Sorcery Points)",
      ),
      fxInstance("modinst_sorcery_incarnate", SELF_BUFF_CASTER_CATALOG_ID, {
        bonusAction: true,
        effects: [
          {
            id: modId("sorcery_incarnate"),
            kind: "self_buff_caster",
            casterBuffLabel:
              "Innate Sorcery (via Sorcery Incarnate; up to 2 Metamagic options per spell while active)",
          },
        ],
      }),
    ],
  },
  "*::Arcane Apotheosis": {
    linkedModifiers: [
      fxInstance("modinst_arcane_apotheosis", SELF_BUFF_CASTER_CATALOG_ID, {
        effects: [{ id: modId("arcane_apotheosis"), kind: "self_buff_caster", casterBuffLabel: "Arcane Apotheosis" }],
      }),
    ],
  },
  "*::Devious Strikes": [
    bonusRidersPreset(
      "devious_strikes",
      [
        {
          name: "Daze",
          costResourceKey: "sneak_attack",
          costResourceAmount: 1,
          description: "Target makes CON save or has Disadvantage on next attack",
          unlocksAtLevel: 11,
        },
        {
          name: "Knock Out",
          costResourceKey: "sneak_attack",
          costResourceAmount: 2,
          description: "Target makes CON save or falls Unconscious",
          unlocksAtLevel: 11,
        },
      ],
      2,
      "Sneak Attack",
    ),
  ],
  "*::Cunning Strike": [
    bonusRidersPreset("cunning_strike", CUNNING_STRIKE_RIDERS, 1, "Sneak Attack", {
      maxRidersPerUseByLevel: [
        { level: 5, count: 1 },
        { level: 11, count: 2 },
      ],
    }),
  ],
  "*::Improved Cunning Strike": [],
  "*::Brutal Strike": [
    bonusRidersPreset("brutal_strike", BRUTAL_STRIKE_RIDERS, 1, "Reckless Attack", {
      maxRidersPerUseByLevel: [
        { level: 9, count: 1 },
        { level: 17, count: 2 },
      ],
      automaticBonusByLevel: [
        { level: 9, mode: "dice", dieCount: 1, dieType: "d10" },
        { level: 17, mode: "dice", dieCount: 2, dieType: "d10" },
      ],
    }),
  ],
  "*::Improved Brutal Strike": [],
  "*::Relentless Rage": {
    activation: {
      onDropToZeroHp: true,
      requirements: [{ kind: "while_raging" }],
    },
    linkedModifiers: [
      savingThrowTriggerPreset("relentless_rage", {
        triggerOn: "fail",
        targetScope: "self",
        saveAbility: "Constitution",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
      }),
    ],
  },
  "*::Instinctive Pounce": {
    linkedModifiers: [movementHalfSpeedOnExistingFeature("instinctive_pounce", "Rage")],
  },
  "*::Intimidating Presence": {
    activation: { bonusAction: true },
    linkedModifiers: intimidatingPresence(),
  },
  "*::Nature's Veil": {
    linkedModifiers: naturesVeil(),
  },
  "*::Tactical Shift": {
    linkedModifiers: [movementHalfSpeedOnExistingFeature("tactical_shift", "Second Wind")],
  },
  "*::Sorcerous Restoration": {
    linkedModifiers: [resourceResetHalfLevel("sorcery_points", "short_rest", "Regain half level SP")],
  },
  "*::Magical Cunning": {
    linkedModifiers: [resourceResetHalfLevel("pact_slots", "short_rest", "Regain half level pact slots")],
  },
  "*::Divine Intervention": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "100 + Cleric level percent chance. On success, cast any Cleric spell of 5th level or lower without a slot. Once per Long Rest on success.",
        },
        "Divine Intervention",
      ),
    ],
  },
  "*::Greater Divine Intervention": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "When using Divine Intervention, once per 7 days cast any Cleric spell of 6th level or lower without a slot.",
        },
        "Greater Divine Intervention",
      ),
    ],
  },
  "*::Fast Hands": {
    linkedModifiers: [fastHandsPicker()],
  },
  "*::Supreme Sneak": {
    linkedModifiers: [
      bonusRidersPreset(
        "supreme_sneak",
        [
          {
            name: "Stealth Attack",
            costDice: "1d6",
            description: "Hide Invisibility not ended if you end turn behind Three-Quarters or Total Cover",
          },
        ],
        1,
        "Cunning Strike",
      ),
    ],
  },
  "*::Countercharm": {
    linkedModifiers: [
      savingThrowTriggerPreset("countercharm", {
        triggerOn: "ally_fails",
        targetScope: "allies_in_area",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
        useReaction: true,
      }),
    ],
  },
  "*::Peerless Skill": {
    linkedModifiers: [
      failedRollTriggerPreset("peerless_skill", {
        rollKind: "ability",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
        spendResourceKey: "bardic_inspiration",
        refundResourceOnStillFailed: true,
      }),
    ],
  },
  "*::Tactical Mind": {
    linkedModifiers: [
      failedRollTriggerPreset("tactical_mind", {
        rollKind: "ability",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
        spendResourceKey: "second_wind",
      }),
    ],
  },
  "*::Disciple of Life": {
    linkedModifiers: [spellHealingModifier("disciple_of_life", { bonusFlat: 2, bonusPerSpellLevel: 1 })],
  },
  "*::Blessed Healer": {
    linkedModifiers: [spellHealingModifier("blessed_healer", { selfHealFlat: 2, selfHealPerSpellLevel: 1 })],
  },
  "*::Supreme Healing": {
    linkedModifiers: [spellHealingModifier("supreme_healing", { maximizeHealingDice: true })],
  },
  "*::Magical Secrets": {
    linkedModifiers: [
      // 2024 SRD: from this level on, the Bard's prepared spells can be chosen
      // from the Bard, Cleric, Druid, and Wizard spell lists (not a fixed grant).
      spellListAccessPreset(
        "magical_secrets",
        ["Bard", "Cleric", "Druid", "Wizard"],
        "Prepare spells from the Bard, Cleric, Druid, and Wizard lists",
      ),
    ],
  },
  "*::Magical Discoveries": {
    linkedModifiers: [
      charInstance("modinst_magical_discoveries", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("magical_discoveries"),
          type: "spells_known",
          spells: [],
          choiceGrants: [{ level: 1, count: 2, crossClassAnyList: true }],
          playerPicksSpellList: true,
          spellListClassOptions: ["Cleric", "Druid", "Wizard"],
        },
      ]),
    ],
  },
  "*::Stunning Strike": {
    linkedModifiers: [
      onHitTriggerPreset("stunning_strike", {
        appliesTo: "Monk weapon or Unarmed Strike",
        spendResourceKey: "focus_points",
        spendResourceAmount: 1,
        effectCatalogRefId: FORCE_SAVE_CATALOG_ID,
      }),
    ],
  },
  "*::Open Hand Technique": {
    linkedModifiers: [
      bonusRidersPreset(
        "open_hand",
        [
          { name: "Prone", costDice: "0", description: "Target must succeed on DEX save or fall Prone" },
          { name: "Push", costDice: "0", description: "Push target up to 15 ft." },
          { name: "No Reactions", costDice: "0", description: "Target can't take Reactions until your next turn" },
        ],
        1,
        "Flurry of Blows",
      ),
    ],
  },
  "*::Thief's Reflexes": {
    linkedModifiers: [
      charInstance("modinst_thiefs_reflexes", EXTRA_TURN_CATALOG_ID, [
        { id: modId("thiefs_reflexes"), type: "extra_turn", firstRoundOnly: true, turnCount: 1 },
      ]),
    ],
  },
  "*::Monk's Focus": {
    linkedModifiers: [monkFocusMenu()],
  },
  "*::Flurry of Blows": {
    linkedModifiers: [
      charInstance("modinst_flurry", RESOURCE_ABILITY_MENU_CATALOG_ID, [
        {
          id: modId("flurry"),
          type: "resource_ability_menu",
          resourceKey: "focus_points",
          options: [{ name: "Flurry of Blows", resourceCost: 1, effect: { catalogRefId: "cat_fx_bonus_action_attack" } }],
        },
      ]),
    ],
  },
  "*::Foe Slayer": {
    linkedModifiers: [
      charInstance("modinst_foe_slayer", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("foe_slayer"),
          type: "spells_known",
          spells: [],
          markDamageDie: "d10",
        },
      ]),
    ],
  },
  "*::Relentless Hunter": {
    linkedModifiers: [
      charInstance("modinst_relentless_hunter", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("relentless_hunter"),
          type: "spells_known",
          spells: [],
          concentrationImmuneForSpell: "Hunter's Mark",
        },
      ]),
    ],
  },
  "*::Smite of Protection": {
    linkedModifiers: [
      charInstance("modinst_smite_protection", ON_CAST_SPELL_TRIGGER_CATALOG_ID, [
        {
          id: modId("smite_protection"),
          type: "on_cast_spell_trigger",
          spellTags: ["smite"],
          effect: { catalogRefId: AURA_CATALOG_ID },
        },
      ]),
    ],
  },
  "*::Empowered Evocation": {
    linkedModifiers: [
      onCastSpellChar("empowered_evocation", {
        spellSchool: "Evocation",
        effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
        label: "+INT to one damage roll of an Evocation Wizard spell",
      }),
    ],
  },
  "*::Eldritch Master": {
    linkedModifiers: [
      fxInstance("modinst_eldritch_master", CLASS_RESOURCE_CATALOG_ID, {
        effects: [
          {
            id: modId("eldritch_master"),
            kind: "class_resource",
            classResourceKey: "pact_slots",
            classResourceChange: "reset",
            regainAllOnLinkedFeatureUse: true,
            linkedFeatureName: "Magical Cunning",
          },
        ],
      }),
    ],
  },

  // —— Wizard school & spellbook ——
  "*::Arcane Recovery": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Once per Short Rest: recover spell slots totaling half Wizard level (rounded up), none above 5th level.",
        },
        "Arcane Recovery",
      ),
    ],
  },
  "*::Ritual Adept": {
    linkedModifiers: [
      spellsKnownChar("ritual_adept", {
        alwaysPrepared: false,
        spellListClassOptions: ["Wizard"],
        label: "Cast ritual-tagged spellbook spells as Ritual without preparing them",
      }),
    ],
  },
  "*::Memorize Spell": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription: "On each Short Rest: replace one prepared level 1+ Wizard spell with another from your spellbook.",
        },
        "Memorize Spell",
      ),
    ],
  },
  // 2024: free Evocation spells in the spellbook (same as other school savants — not 2014 half cost).
  "*::Evocation Savant": { linkedModifiers: [schoolSavantPreset("Evocation")] },
  "*::Potent Cantrip": {
    linkedModifiers: [
      onCastSpellChar("potent_cantrip", {
        spellTags: ["cantrip", "damage"],
        effect: { catalogRefId: DAMAGE_REDUCTION_CATALOG_ID },
        label: "Cantrip damage: targets that succeed on save still take half",
      }),
    ],
  },
  "*::Sculpt Spells": {
    linkedModifiers: [
      onCastSpellChar("sculpt_spells", {
        spellSchool: "Evocation",
        effect: { catalogRefId: AURA_CATALOG_ID },
        label: "Evocation AoE: allies in area auto-succeed on saves",
      }),
    ],
  },
  "*::Overchannel": {
    linkedModifiers: [
      onCastSpellChar("overchannel", {
        spellSchool: "Evocation",
        effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
        label: "Maximize damage on level 1–5 evocation spells (risk self-damage on repeat)",
      }),
    ],
  },
  "*::Abjuration Savant": { linkedModifiers: [schoolSavantPreset("Abjuration")] },
  "*::Divination Savant": { linkedModifiers: [schoolSavantPreset("Divination")] },
  "*::Illusion Savant": { linkedModifiers: [schoolSavantPreset("Illusion")] },
  "*::Arcane Ward": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Once per Long Rest: ward HP = 2×Wizard level + INT; absorbs damage; regains 2×slot level on Abjuration cast (or BA expend slot)",
          recharges: [{ rest: "long_rest" }],
        },
        "Arcane Ward",
      ),
      onCastSpellChar("arcane_ward_recharge", {
        spellSchool: "Abjuration",
        effect: { catalogRefId: GRANT_TEMP_HP_CATALOG_ID },
        label: "Abjuration spell with slot: ward regains 2×slot level HP",
      }),
    ],
  },
  "*::Projected Ward": {
    linkedModifiers: [
      damageResReaction(
        "projected_ward",
        "Reaction: ally within 30 ft. — your Arcane Ward absorbs their damage",
      ),
    ],
  },
  "*::Spell Breaker": {
    linkedModifiers: [
      alwaysPreparedSpells("Counterspell and Dispel Magic"),
      usesPool(
        {
          type: "special",
          specialDescription:
            "Dispel Magic as Bonus Action; add PB to Dispel check; slot not expended if Counterspell/Dispel fails to stop a spell",
        },
        "Spell Breaker",
      ),
    ],
  },
  "*::Spell Resistance": {
    linkedModifiers: [
      checkAdvantage("spell_resistance_saves", { category: "save", conditions: ["spell"] }),
      spellDamageResistance(),
    ],
  },
  "*::Portent": {
    linkedModifiers: [
      usesPool(
        {
          type: "fixed",
          fixedAmount: 2,
          recharges: [{ rest: "long_rest" }],
          specialDescription:
            "Foretelling d20s after Long Rest: replace any visible D20 Test before roll (once per turn)",
        },
        "Portent",
      ),
    ],
  },
  "*::Greater Portent": {
    linkedModifiers: [
      usesPool(
        {
          type: "fixed",
          fixedAmount: 3,
          recharges: [{ rest: "long_rest" }],
          specialDescription: "Portent: roll three foretelling d20s after each Long Rest",
        },
        "Greater Portent",
      ),
    ],
  },
  "*::Expert Divination": {
    linkedModifiers: [
      onCastSpellChar("expert_divination", {
        spellSchool: "Divination",
        effect: { catalogRefId: CLASS_RESOURCE_CATALOG_ID },
        label: "Cast Divination spell level 2+: regain one lower spell slot (max 5th)",
      }),
    ],
  },
  "*::The Third Eye": {
    activation: { bonusAction: true },
    linkedModifiers: [
      featureOptionPicker(
        "Third Eye (Darkvision / Greater Comprehension / See Invisibility)",
        true,
      ),
      usesPool(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] },
        "The Third Eye",
      ),
    ],
  },
  "*::Improved Illusions": {
    linkedModifiers: [
      onCastSpellChar("improved_illusions", {
        spellSchool: "Illusion",
        label: "Illusion spells: no verbal components; +60 ft. range on spells with 10+ ft. range",
      }),
      spellsKnownChar("improved_illusions_cantrip", {
        spells: [],
        spellListClassOptions: ["Wizard"],
        label: "Minor Illusion (extra cantrip if known); BA cast; sound and image together",
      }),
    ],
  },
  "*::Phantasmal Creatures": {
    linkedModifiers: [
      alwaysPreparedSpells("Summon Beast and Summon Fey"),
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Phantasmal Creatures",
        undefined,
        { minSpellLevel: 1, restores: 1 },
      ),
    ],
  },
  "*::Illusory Self": {
    linkedModifiers: [
      fxInstance("modinst_illusory_self", IMPOSE_DISADVANTAGE_CATALOG_ID, {
        reaction: true,
        effects: [{ id: modId("illusory_self"), kind: "impose_disadvantage", label: "Reaction: attack auto-misses" }],
      }),
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] },
        "Illusory Self",
        undefined,
        { minSpellLevel: 2, restores: 1 },
      ),
    ],
  },
  "*::Illusory Reality": {
    activation: { bonusAction: true },
    linkedModifiers: [
      onCastSpellChar("illusory_reality", {
        spellSchool: "Illusion",
        label: "Bonus Action while Illusion spell ongoing: make one inanimate illusion object real for 1 minute",
      }),
    ],
  },
  "*::Bladesong": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool(
        {
          type: "ability_modifier",
          abilityModifier: "INT",
          recharges: [{ rest: "long_rest" }],
          specialDescription: "Regain one expended use when you use Arcane Recovery",
        },
        "Bladesong",
      ),
      fxInstance("modinst_bladesong", SELF_BUFF_CASTER_CATALOG_ID, {
        bonusAction: true,
        effects: [
          {
            id: modId("bladesong"),
            kind: "self_buff_caster",
            casterBuffLabel: "Bladesong: +INT AC (min +1), +10 Speed, Advantage on Acrobatics",
          },
        ],
      }),
      checkBonus("bladesong_concentration", {
        category: "save",
        ability: "CON",
        bonusConfig: { mode: "ability_modifier", ability: "INT" },
      }),
    ],
  },
  "*::Training In War and Song": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Melee martial weapons (no Two-Handed/Heavy); melee weapon as Wizard spell focus",
        },
        "Training In War and Song",
      ),
      skillChoice(1, "Acrobatics, Athletics, Performance, or Persuasion"),
    ],
  },
  "*::Song of Defense": {
    linkedModifiers: [
      fxInstance("modinst_song_of_defense", DAMAGE_REDUCTION_CATALOG_ID, {
        reaction: true,
        effects: [
          {
            id: modId("song_of_defense"),
            kind: "damage_reduction",
            label: "While Bladesong: Reaction expend spell slot; reduce damage by 5×slot level",
          },
        ],
      }),
    ],
  },
  "*::Song of Victory": {
    activation: { bonusAction: true },
    linkedModifiers: [
      fxInstance("modinst_song_of_victory", "cat_fx_bonus_action_attack", {
        bonusAction: true,
        effects: [
          {
            id: modId("song_of_victory"),
            kind: "bonus_action_attack",
            label: "After casting an action spell, make one weapon attack",
          },
        ],
      }),
    ],
  },
  "*::Spell Mastery": {
    linkedModifiers: [
      spellsKnownChar("spell_mastery", {
        choiceGrants: [
          { level: 1, count: 1 },
          { level: 2, count: 1 },
        ],
        spellListClassOptions: ["Wizard"],
        castAtWillLevels: [1, 2],
        label: "Two chosen spells (1st & 2nd) always prepared and castable at will",
      }),
    ],
  },
  "*::Signature Spells": {
    linkedModifiers: [
      spellsKnownChar("signature_spells", {
        choiceGrants: [{ level: 3, count: 2 }],
        spellListClassOptions: ["Wizard"],
        alwaysPrepared: true,
        label: "Two signature 3rd-level spells always prepared; cast each once without slot per Short Rest",
      }),
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }] }, "Signature Spells"),
    ],
  },

  // —— Druid wild shape cluster ——
  "*::Wild Companion": {
    activation: { action: true },
    linkedModifiers: [
      castSpellFx(
        "wild_companion",
        {
          castSpellLevel: 2,
          castSpellListClasses: ["Druid"],
          castSpellName: "Find Familiar (nature spirit)",
          label: "Summon nature spirit companion",
        },
        { action: true },
      ),
      usesPool({ type: "class_resource", classResourceKey: "wild_shape", classResourceAmount: 1 }, "Wild Companion"),
    ],
  },
  "*::Wild Resurgence": {
    linkedModifiers: [
      fxInstance("modinst_wild_resurgence", CLASS_RESOURCE_CATALOG_ID, {
        oncePerTurn: true,
        effects: [
          {
            id: modId("wild_resurgence"),
            kind: "class_resource",
            classResourceKey: "wild_shape",
            classResourceChange: "increase",
            classResourceAmount: 1,
            label: "Once/turn when Wild Shape empty: regain 1 use by expending a spell slot",
          },
        ],
      }),
    ],
  },
  "*::Beast Spells": {
    linkedModifiers: [
      fxInstance("modinst_beast_spells", SELF_BUFF_CASTER_CATALOG_ID, {
        effects: [
          {
            id: modId("beast_spells"),
            kind: "self_buff_caster",
            casterBuffLabel: "Cast spells while in Wild Shape (Beast form)",
          },
        ],
      }),
    ],
  },
  "*::Archdruid": {
    linkedModifiers: [
      resourceResetOnInitiative("wild_shape", undefined, "Evergreen Wild Shape — regain uses on Initiative"),
      usesPool({ type: "unlimited" }, "Unlimited Wild Shape at level 20"),
    ],
  },
  "*::Natural Recovery": {
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Natural Recovery"),
      castSpellFx(
        "natural_recovery",
        {
          castSpellLevel: 1,
          castSpellListClasses: ["Druid"],
          castSpellWithoutSlot: true,
          label: "Cast one prepared Circle spell (level 1+) without a slot",
        },
        { action: true },
      ),
    ],
  },
  "*::Nature's Sanctuary": {
    activation: { action: true },
    linkedModifiers: [
      fxInstance("modinst_natures_sanctuary", FORCE_SAVE_CATALOG_ID, {
        action: true,
        effects: [
          {
            id: modId("natures_sanctuary"),
            kind: "force_save_control",
            attackProfile: "force_save",
            saveAbility: "DEX",
            effectConditionTypes: ["Restrained"],
            label: "15-ft cube spectral vines (DEX save or Restrained)",
          },
        ],
      }),
      usesPool({ type: "class_resource", classResourceKey: "wild_shape", classResourceAmount: 1 }, "Nature's Sanctuary"),
    ],
  },
  // Improvement follows the Elemental Fury option chosen at level 7 (Primal Strike
  // scales to 2d8 via its bonusByLevel wiring). No separate pick is offered here.
  "*::Improved Elemental Fury": [],

  // —— Monk focus upgrades ——
  "*::Uncanny Metabolism": {
    linkedModifiers: [
      resourceResetOnInitiative("focus_points", undefined, "Regain all Focus Points on Initiative"),
      healSelfBonusAction("uncanny_metabolism_heal"),
    ],
  },
  "*::Empowered Strikes": {
    linkedModifiers: [
      charInstance("modinst_empowered_strikes", FEAT_MODIFIER_CATALOG.damageRollModifiers, [
        {
          id: modId("empowered_strikes"),
          type: "damage_roll_modifiers",
          entries: [{ bonus: 0, target: "unarmed" }],
          label: "Unarmed strikes deal Force or normal damage (your choice)",
        },
      ]),
    ],
  },
  "*::Acrobatic Movement": {
    linkedModifiers: [
      speedTypeAdd("climb", 0, "Climb speed equal to Speed (unarmored, no shield)"),
      speedTypeAdd("swim", 0, "Swim speed equal to Speed (unarmored, no shield)"),
    ],
  },
  "*::Heightened Focus": {
    linkedModifiers: [
      bonusRidersPreset(
        "heightened_flurry",
        [
          { name: "Second Flurry Attack", costDice: "0", description: "Flurry of Blows grants one additional attack" },
          { name: "Patient Defense Disengage", costDice: "0", description: "Patient Defense also grants Disengage" },
          { name: "Step of the Wind Dash", costDice: "0", description: "Step of the Wind also grants Dash" },
        ],
        1,
        "Monk's Focus",
      ),
    ],
  },
  "*::Self-Restoration": {
    linkedModifiers: [
      fxInstance("modinst_self_restoration", FEAT_MODIFIER_CATALOG.healSelf, {
        effects: [
          {
            id: modId("self_restoration"),
            kind: "heal_self",
            removeConditions: ["Charmed", "Frightened", "Poisoned", "Paralyzed", "Stunned"],
            label: "End of turn: remove one listed condition from yourself",
          },
        ],
      }),
    ],
  },
  "*::Deflect Energy": {
    linkedModifiers: [
      fxInstance("modinst_deflect_energy", DAMAGE_REDUCTION_CATALOG_ID, {
        reaction: true,
        effects: [
          {
            id: modId("deflect_energy"),
            kind: "damage_reduction",
            mitigation: "reduction",
            label: "Deflect Attacks works against any damage type",
          },
        ],
      }),
    ],
  },
  "*::Perfect Focus": {
    linkedModifiers: [
      resourceResetOnInitiative("focus_points", 4, "Regain Focus until you have 4 (if not using Uncanny Metabolism)"),
    ],
  },
  "*::Superior Defense": {
    linkedModifiers: [
      fxInstance("modinst_superior_defense", "cat_fx_boost_ac", {
        effects: [
          {
            id: modId("superior_defense"),
            kind: "boost_ac",
            label: "Start of turn: spend 3 Focus for +4 AC for 1 minute or until Incapacitated",
          },
        ],
      }),
      usesPool({ type: "class_resource", classResourceKey: "focus_points", classResourceAmount: 3 }, "Superior Defense"),
    ],
  },
  "*::Fleet Step": {
    linkedModifiers: [
      fxInstance("modinst_fleet_step", FEAT_MODIFIER_CATALOG.movementOption, {
        bonusAction: true,
        effects: [
          {
            id: modId("fleet_step"),
            kind: "movement_option",
            movementDash: true,
            movementDisengage: true,
            moveDistanceMode: "speed",
            label: "After any Bonus Action except Step of the Wind, also Step of the Wind",
          },
        ],
      }),
    ],
  },
  "*::Quivering Palm": {
    linkedModifiers: [
      // 2024 SRD: gated only by the 4-Focus-Point cost + "one creature at a time" (no
      // separate per-rest use cap — that was a 2014-rules holdover, removed here).
      onHitTriggerPreset("quivering_palm", {
        appliesTo: "Unarmed Strike",
        spendResourceKey: "focus_points",
        spendResourceAmount: 4,
        effectCatalogRefId: FORCE_SAVE_CATALOG_ID,
      }),
    ],
  },

  // —— Weapon Mastery (SRD martial classes) ——
  "*::Weapon Mastery": {
    linkedModifiers: [buildWeaponMasteryModifier()],
  },

  // —— Fighter ——
  "*::Tactical Master": {
    linkedModifiers: [
      weaponMasterySwap("tactical_master", ["Push", "Sap", "Slow"], "Swap weapon mastery property on attack"),
    ],
  },
  "*::Studied Attacks": {
    linkedModifiers: [
      charInstance("modinst_studied_attacks", FEAT_MODIFIER_CATALOG.attackRollModifiers, [
        {
          id: modId("studied_attacks"),
          type: "attack_roll_modifiers",
          entries: [{ bonus: 0, target: "all" }],
          advantageVsTargetAfterMiss: true,
          label: "After missing, gain Advantage on next attack vs that target",
        },
      ]),
    ],
  },

  // —— Cleric ——
  "*::Sear Undead": {
    linkedModifiers: [
      onCastSpellChar("sear_undead", {
        spellTags: ["turn undead", "channel divinity"],
        effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
        label: "Turn Undead: add WIS d8s to damage vs Undead",
      }),
    ],
  },
  // Improvement follows the Blessed Strikes option chosen at level 7 (Divine Strike
  // scales to 2d8 via its bonusByLevel wiring). No separate pick is offered here.
  "*::Improved Blessed Strikes": [],

  // —— Paladin ——
  "*::Abjure Foes": {
    activation: { action: true },
    linkedModifiers: [
      fxInstance("modinst_abjure_foes", FORCE_SAVE_CATALOG_ID, {
        action: true,
        effects: [
          {
            id: modId("abjure_foes"),
            kind: "force_save_control",
            attackProfile: "force_save",
            saveAbility: "WIS",
            effectConditionTypes: ["Frightened", "Incapacitated"],
            label: "Channel Divinity: WIS save or Frightened/Incapacitated",
          },
        ],
      }),
      usesPool({ type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 }, "Abjure Foes"),
    ],
  },
  "*::Restoring Touch": {
    linkedModifiers: [
      fxInstance("modinst_restoring_touch", "cat_fx_heal_from_pool", {
        effects: [
          {
            id: modId("restoring_touch"),
            kind: "heal_from_pool",
            classResourceKey: "lay_on_hands",
            classResourceChange: "reduce",
            removeConditions: ["Blinded", "Deafened", "Paralyzed", "Poisoned"],
            label: "Lay on Hands also removes Blinded, Deafened, Paralyzed, or Poisoned",
          },
        ],
      }),
    ],
  },

  // —— Ranger ——
  "*::Deft Explorer": {
    linkedModifiers: [
      skillChoice(2, "Deft Explorer Expertise", true),
      languages([], 1, "Deft Explorer language"),
    ],
  },
  "*::Superior Hunter's Prey": {
    linkedModifiers: [
      onHitTriggerPreset("superior_hunters_prey", {
        appliesTo: "Creature marked by Hunter's Mark",
        effectCatalogRefId: "cat_fx_extra_damage_on_hit",
      }),
    ],
  },
  "*::Superior Hunter's Defense": {
    activation: { reaction: true },
    linkedModifiers: [damageResReaction("superior_hunters_defense", "Reaction: Resistance to triggering damage type")],
  },

  // —— Sorcerer ——
  "Sorcerer::Draconic Sorcery::Dragon Companion": {
    linkedModifiers: [
      spellsKnownChar("dragon_companion", {
        choiceGrants: [{ level: 5, count: 1 }],
        spellListClassOptions: ["Sorcerer"],
        freeCastPerLongRest: [{ spellName: "Summon Dragon", count: 1 }],
        label: "Summon Dragon without material; once without slot per Long Rest",
      }),
      castSpellFx(
        "dragon_companion_cast",
        {
          castSpellLevel: 5,
          castSpellListClasses: ["Sorcerer"],
          castSpellName: "Summon Dragon",
          castSpellWithoutSlot: true,
          label: "Summon Dragon",
        },
        { action: true },
      ),
      grantCreaturePreset("dragon_companion_spirit", ["Draconic Spirit"], {
        label: "Draconic Spirit (Summon Dragon)",
      }),
    ],
  },

  // —— Artificer ——
  "*::Magical Tinkering": {
    linkedModifiers: magicalTinkeringPreset(),
  },
  "*::Tinker's Magic": {
    linkedModifiers: [
      ...magicalTinkeringPreset(),
      spellsKnownChar("tinkers_magic_mending", {
        spells: [],
        alwaysPrepared: true,
        label: "You know the Mending cantrip",
      }),
    ],
  },
  "*::Replicate Magic Item": {
    linkedModifiers: replicateMagicItemPreset(),
  },
  "*::Magic Item Tinker": {
    linkedModifiers: [
      featureOptionPicker("Magic Item Tinker (Charge / Drain / Transmute)", true),
      usesPool(
        {
          type: "special",
          specialDescription:
            "Charge: Bonus Action + spell slot restores charges. Drain (1/LR): destroy item → 1st/2nd slot. Transmute (1/LR): transform into another known plan.",
        },
        "Magic Item Tinker",
      ),
    ],
  },
  "*::Flash of Genius": {
    activation: { reaction: true },
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "INT", recharges: [{ rest: "long_rest" }] },
        "Flash of Genius",
      ),
      d20TestReactionPreset("flash_of_genius", {
        modifierMode: "add",
        targetScope: "target_creature",
        rangeFeet: 30,
        useReaction: true,
        dieSource: "ability_modifier",
        dieAbility: "intelligence",
        rollKinds: ["ability", "save"],
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
        label: "Reaction: +INT (min +1) when you or an ally within 30 ft. fails a check or save",
      }),
    ],
  },
  "*::Spell-Storing Item": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Long Rest: store a level 1–3 Artificer action spell (no consumed M) in a weapon or focus; uses = 2×INT (min 2); cast as Magic action using your spellcasting modifier",
        },
        "Spell-Storing Item",
      ),
    ],
  },
  "*::Advanced Artifice": {
    linkedModifiers: [
      attunementSlots(5, "Attune to 5 magic items"),
      usesPool(
        {
          type: "special",
          specialDescription: "Short Rest: regain one expended Flash of Genius use (Refreshed Genius)",
        },
        "Refreshed Genius",
      ),
    ],
  },
  "*::Soul of Artifice": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Cheat Death: at 0 HP, disintegrate Uncommon/Rare Replicate items to set HP to 20× items destroyed",
        },
        "Cheat Death",
      ),
      usesPool(
        {
          type: "special",
          specialDescription:
            "Magical Guidance: Short Rest regains all Flash of Genius uses if attuned to at least one magic item",
        },
        "Magical Guidance",
      ),
    ],
  },

  // —— Warlock ——
  "*::Contact Patron": {
    linkedModifiers: [
      spellsKnownChar("contact_patron", {
        choiceGrants: [{ level: 5, count: 1 }],
        spellListClassOptions: ["Warlock"],
        alwaysPrepared: true,
        freeCastPerLongRest: [{ spellName: "Contact Patron", count: 1 }],
        label: "Contact Patron always prepared; cast once without slot per Long Rest",
      }),
    ],
  },
  "*::Hurl Through Hell": {
    linkedModifiers: [
      onHitTriggerPreset("hurl_through_hell", {
        appliesTo: "Attack roll",
        effectCatalogRefId: FORCE_SAVE_CATALOG_ID,
      }),
      extraDamageOnHit("hurl_through_hell_damage", "10d10"),
    ],
  },

  // —— Bard ——
  "*::Words of Creation": {
    linkedModifiers: [
      spellsKnownChar("words_of_creation", {
        choiceGrants: [{ level: 9, count: 2 }],
        spellListClassOptions: ["Bard"],
        alwaysPrepared: true,
        label: "Always have Power Word Heal and Power Word Kill prepared",
      }),
    ],
  },

  // —— Cleric domains (2024) ——
  "*::Grave Domain Spells": [alwaysPreparedSpells("Grave Domain spells")],
  "*::Knowledge Domain Spells": [alwaysPreparedSpells("Knowledge Domain spells")],
  "*::Light Domain Spells": [alwaysPreparedSpells("Light Domain spells")],
  "*::Trickery Domain Spells": [alwaysPreparedSpells("Trickery Domain spells")],
  "*::War Domain Spells": [alwaysPreparedSpells("War Domain spells")],
  "*::Mind Domain Spells": [alwaysPreparedSpells("Mind Domain spells")],
  "*::Return to Life": {
    linkedModifiers: [
      spellHealingModifier("return_to_life", { maximizeOnlyAtZeroHp: true, maximizeHealingDice: true }),
    ],
  },
  // Bundled feature name some sources use for Pull of Death + Return to Life together.
  "*::Circle of Mortality": {
    linkedModifiers: [
      onHitTriggerPreset("pull_of_death", { effectCatalogRefId: "cat_fx_extra_damage_on_hit" }),
      extraDamageOnHitByLevel("pull_of_death_necrotic", [
        { level: 3, dice: "1d4" },
        { level: 11, dice: "1d6" },
      ]),
      spellHealingModifier("circle_of_mortality_return_to_life", {
        maximizeOnlyAtZeroHp: true,
        maximizeHealingDice: true,
      }),
    ],
  },
  "*::Warding Flare": {
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "WIS", recharges: [{ rest: "long_rest" }] },
        "Warding Flare",
      ),
      fxInstance("modinst_warding_flare", IMPOSE_DISADVANTAGE_CATALOG_ID, {
        reaction: true,
        effects: [{ id: modId("warding_flare"), kind: "impose_disadvantage" }],
      }),
    ],
  },
  "*::Improved Warding Flare": {
    linkedModifiers: [
      usesPool(
        {
          type: "ability_modifier",
          abilityModifier: "WIS",
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
        "Improved Warding Flare",
      ),
      fxInstance("modinst_improved_warding_flare", IMPOSE_DISADVANTAGE_CATALOG_ID, {
        reaction: true,
        effects: [
          {
            id: modId("improved_warding_flare"),
            kind: "impose_disadvantage",
            label: "Impose disadvantage; grant temp HP to self or ally within 30 ft.",
          },
        ],
      }),
    ],
  },
  "*::War Priest": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool(
        {
          type: "ability_modifier",
          abilityModifier: "WIS",
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
        "War Priest",
      ),
      fxInstance("modinst_war_priest", "cat_fx_bonus_action_attack", {
        bonusAction: true,
        effects: [{ id: modId("war_priest"), kind: "bonus_action_attack" }],
      }),
    ],
  },
  "*::Preserve Life": {
    activation: { action: true },
    linkedModifiers: [
      usesPool(
        { type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 },
        "Preserve Life",
      ),
      fxInstance("modinst_preserve_life", "cat_fx_heal_from_pool", {
        action: true,
        effects: [
          {
            id: modId("preserve_life"),
            kind: "heal_from_pool",
            label:
              "Distribute HP equal to 5 × Cleric level among Bloodied creatures within 30 ft (max half HP each)",
          },
        ],
      }),
    ],
  },
  "*::Radiance of the Dawn": {
    activation: { action: true },
    linkedModifiers: [
      usesPool(
        { type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 },
        "Radiance of the Dawn",
      ),
      charInstance("modinst_radiance_of_the_dawn", characteristicCatalogRefId("special_attack"), [
        {
          id: modId("radiance_of_the_dawn"),
          type: "special_attack",
          attackName: "Radiance of the Dawn",
          attackProfile: "emanation",
          targetMode: "area",
          areaShape: "sphere",
          areaLengthFeet: 30,
          properties: [],
          damageTypes: ["Radiant"],
          damageDiceCount: 2,
          damageDieType: "d10",
          saveAbility: "Constitution",
          saveHalfDamage: true,
          label: "30-ft emanation: CON save, 2d10 + Cleric level Radiant (half on success)",
        },
      ]),
    ],
  },
  "*::War God's Blessing": {
    activation: { action: true },
    linkedModifiers: [
      usesPool(
        { type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 },
        "War God's Blessing",
      ),
      fxInstance("modinst_war_gods_blessing", SELF_BUFF_CASTER_CATALOG_ID, {
        action: true,
        effects: [
          {
            id: modId("war_gods_blessing"),
            kind: "self_buff_caster",
            casterBuffLabel:
              "Cast Shield of Faith or Spiritual Weapon without a spell slot (no concentration for Spiritual Weapon)",
          },
        ],
      }),
    ],
  },
  "*::Invoke Duplicity": {
    activation: { action: true },
    linkedModifiers: [
      usesPool(
        { type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 },
        "Invoke Duplicity",
      ),
      fxInstance("modinst_invoke_duplicity", SELF_BUFF_CASTER_CATALOG_ID, {
        action: true,
        effects: [
          {
            id: modId("invoke_duplicity"),
            kind: "self_buff_caster",
            casterBuffLabel:
              "Create an illusory duplicate; cast from its space, distract, and move it (see feature text)",
          },
        ],
      }),
    ],
  },
  "*::Trickster's Transposition": {
    activation: { bonusAction: true },
    linkedModifiers: [
      fxInstance("modinst_tricksters_transposition", FEAT_MODIFIER_CATALOG.movementOption, {
        bonusAction: true,
        effects: [
          {
            id: modId("tricksters_transposition"),
            kind: "movement_option",
            label: "Bonus Action: teleport-swap places with your Invoke Duplicity illusion",
          },
        ],
      }),
    ],
  },
  "*::Improved Duplicity": {
    linkedModifiers: [
      charInstance("modinst_improved_duplicity", characteristicCatalogRefId("power_rider"), [
        {
          id: modId("improved_duplicity"),
          type: "power_rider",
          parentPowerNames: ["Invoke Duplicity"],
          alertSummary: "Improved Duplicity upgrades your Invoke Duplicity illusion (see feature text).",
          label: "Improved Duplicity",
        },
      ]),
    ],
  },
  "*::Guided Strike": {
    activation: { reaction: true },
    linkedModifiers: [
      failedRollTriggerPreset("guided_strike", {
        rollKind: "attack",
        triggerOn: "fail",
        targetScope: "allied_creature",
        rangeFeet: 30,
        useReaction: true,
        spendResourceKey: "channel_divinity",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
        label: "When you or an ally within 30 ft. misses an attack: Channel Divinity for +10 to the roll",
        effectActivation: {
          effects: [
            {
              id: modId("guided_strike_bonus"),
              kind: "check_roll_modifier",
              checkRollMode: "bonus",
              checkCategory: "attack",
              bonusConfig: { mode: "fixed", fixed: 10 },
              label: "+10 to the missed attack roll",
            },
          ],
        },
      }),
    ],
  },
  "*::Pull of the Grave": {
    linkedModifiers: [
      onHitTriggerPreset("pull_of_grave", {
        effectCatalogRefId: "cat_fx_extra_damage_on_hit",
      }),
      extraDamageOnHit("pull_of_grave_rider", "1d4"),
    ],
  },
  "*::Gestalt Anchor": [
    auraPreset("gestalt_anchor", {
      radiusFeet: 10,
      saveAbility: "INT",
      label: "Allies within 10 ft. add INT/WIS/CHA mod to INT/WIS/CHA saves",
    }),
  ],
  "*::Sentinel at Death's Door": [damageHalvingReactionPreset("sentinel_death_door", { cancelCritRiders: true })],
  "*::Path to the Grave": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool({ type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 }, "Path to the Grave"),
      fxInstance("modinst_path_to_grave", MODIFY_CREATURE_CATALOG_ID, {
        bonusAction: true,
        effects: [
          {
            id: modId("path_to_grave"),
            kind: "modify_creature",
            rollTarget: "enemy",
            creatureModifyMode: "roll",
            label:
              "Curse until start of your next turn: target has Disadvantage on attack rolls and saves. End early on a hit to add extra Necrotic or Radiant damage equal to your Cleric level.",
          },
        ],
      }),
    ],
  },
  "*::Psychic Feedback": {
    linkedModifiers: [
      failedRollTriggerPreset("psychic_feedback", {
        rollKind: "save",
        triggerOn: "success",
        targetScope: "self",
        useReaction: true,
        effectCatalogRefId: MODIFY_CREATURE_CATALOG_ID,
      }),
    ],
  },
  "*::Bend Reality": {
    linkedModifiers: [
      allySaveReplacePreset("bend_reality", {
        replaceWith: 20,
        spendResourceKey: "channel_divinity",
      }),
    ],
  },
  "*::Keeper of Souls": {
    linkedModifiers: [
      onCreatureDeathTriggerPreset("keeper_of_souls", {
        creatureFilter: "enemy",
        rangeFeet: 60,
        effectCatalogRefId: "cat_fx_heal_from_pool",
      }),
      usesPoolWithRestore(
        { type: "ability_modifier", abilityModifier: "WIS", recharges: [{ rest: "long_rest" }] },
        "Keeper of Souls",
        undefined,
        { minSpellLevel: 6, restores: 1 },
      ),
    ],
  },
  // Bundled feature name some sources use for Enhanced Necromancy + Keeper of Souls together.
  "*::Divine Reaper": {
    linkedModifiers: [
      usesPool(
        { type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 },
        "Enhanced Necromancy (target a second creature)",
      ),
      onCreatureDeathTriggerPreset("divine_reaper_keeper_of_souls", {
        creatureFilter: "enemy",
        rangeFeet: 60,
        effectCatalogRefId: "cat_fx_heal_from_pool",
      }),
      usesPoolWithRestore(
        { type: "ability_modifier", abilityModifier: "WIS", recharges: [{ rest: "long_rest" }] },
        "Divine Reaper (Keeper of Souls)",
        undefined,
        { minSpellLevel: 6, restores: 1 },
      ),
    ],
  },
  "*::Healing Light": [
    healingDicePoolPreset("healing_light", {
      dieType: "d6",
      poolSize: 6,
      maxAbility: "CHA",
      label: "Healing Light d6 pool",
    }),
  ],
  "*::Awakened Mind": [telepathyPreset("awakened_mind", 60, "Telepathy 60 ft.")],
  "*::Unfettered Mind": [telepathyPreset("unfettered_mind", 60, "Telepathy 60 ft.")],
  "*::Cosmic Omen": {
    linkedModifiers: [
      d20TestReactionPreset("cosmic_omen_boon", {
        modifierMode: "add",
        targetScope: "allies_in_area",
        rangeFeet: 30,
        useReaction: true,
        dieSource: "fixed",
        fixedDie: "1d6",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
      }),
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Cosmic Omen",
        { resourceKey: "wild_shape", restores: 1 },
      ),
    ],
  },

  // —— Warlock patrons (2024) ——
  "*::Archfey Spells": [alwaysPreparedSpells("Archfey Patron spells")],
  "*::Celestial Spells": [alwaysPreparedSpells("Celestial Patron spells")],
  "*::Great Old One Spells": [alwaysPreparedSpells("Great Old One Patron spells")],
  "*::Undead Spells": [alwaysPreparedSpells("Undead Patron spells")],
  "*::Form of Dread": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "CHA", recharges: [{ rest: "long_rest" }] },
        "Form of Dread",
      ),
      conditionImmunity(
        ["Frightened"],
        "While Form of Dread is active",
        [requiresActiveToggleLimitation("form_of_dread")],
      ),
      fxInstance("modinst_form_of_dread_temp_hp", GRANT_TEMP_HP_CATALOG_ID, {
        bonusAction: true,
        effects: [
          {
            id: modId("form_of_dread_temp_hp"),
            kind: "grant_temp_hp",
            tempHpTrigger: "bonus_action",
            healMode: "dice",
            healDiceCount: 1,
            healDieType: "d10",
            label: "Facsimile of Life: Temp HP 1d10 + Warlock level on activation",
          },
        ],
      }),
    ],
  },
  "*::Necrotic Husk": {
    linkedModifiers: [
      damageResistance(["Necrotic"], "Necrotic Resilience"),
      damageImmunity(["Necrotic"], "While Form of Dread is active", [
        requiresActiveToggleLimitation("form_of_dread"),
      ]),
      usesPool(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] },
        "Unholy Resuscitation",
      ),
    ],
  },
  "*::Superior Dread": {
    linkedModifiers: [
      damageResistance(["Bludgeoning", "Piercing", "Slashing"], "Dread Resistance (while Form of Dread active)", [
        requiresActiveToggleLimitation("form_of_dread"),
      ]),
      charInstance("modinst_ghostly_flight", "cat_char_speed", [
        {
          id: modId("ghostly_flight"),
          type: "speed",
          speedType: "fly",
          mode: "equal_to_walk",
          value: 0,
          label: "Ghostly Flight: Fly Speed = Speed (hover) while Form of Dread active",
          limitations: [requiresActiveToggleLimitation("form_of_dread")],
        },
      ]),
    ],
  },

  // —— Druid circles (2024) ——
  "*::Circle of the Moon Spells": [alwaysPreparedSpells("Circle of the Moon spells")],
  "*::Circle of the Sea Spells": [alwaysPreparedSpells("Circle of the Sea spells")],
  "*::Circle of the Forged Spells": [alwaysPreparedSpells("Circle of the Forged spells")],
  "*::Starry Form": {
    linkedModifiers: [
      featureOptionPicker("Starry Form constellation", true),
      usesPool({ type: "class_resource", classResourceKey: "wild_shape", classResourceAmount: 1 }, "Starry Form"),
    ],
  },
  "*::Wrath of the Sea": {
    linkedModifiers: [
      usesPool({ type: "class_resource", classResourceKey: "wild_shape", classResourceAmount: 1 }, "Wrath of the Sea"),
    ],
  },

  // —— Barbarian paths (2024) ——
  "*::Retaliation": {
    activation: { reaction: true },
    linkedModifiers: [
      fxInstance("modinst_retaliation", REACTION_ATTACK_CATALOG_ID, {
        reaction: true,
        effects: [{ id: modId("retaliation"), kind: "reaction_attack" }],
      }),
    ],
  },
  "*::Animal Speaker": [alwaysPreparedSpells("Beast Sense and Speak with Animals (ritual)")],
  "*::Rage of the Wilds": [featureOptionPicker("Rage of the Wilds (Bear/Eagle/Wolf)")],
  "*::Aspect of the Wilds": [featureOptionPicker("Aspect of the Wilds (Owl/Panther/Salmon)", true)],
  "*::Nature Speaker": [alwaysPreparedSpells("Commune with Nature (ritual)")],
  "*::Power of the Wilds": [featureOptionPicker("Power of the Wilds (Falcon/Lion/Ram)")],
  "*::Vitality of the Tree": {
    linkedModifiers: [
      grantTempHpPool("Vitality Surge temp HP on Rage"),
      fxInstance("modinst_life_giving_force", GRANT_TEMP_HP_CATALOG_ID, {
        effects: [
          {
            id: modId("life_giving_force"),
            kind: "grant_temp_hp",
            tempHpTrigger: "on_action",
            healMode: "dice",
            healDiceCount: 1,
            healDieType: "d6",
            label: "Life-Giving Force: ally within 10 ft. gains temp HP (Rage Damage d6s)",
          },
        ],
      }),
    ],
  },
  "*::Branches of the Tree": {
    activation: { reaction: true },
    linkedModifiers: [
      savingThrowTriggerPreset("branches_of_tree", {
        triggerOn: "make",
        targetScope: "target_creature",
        effectCatalogRefId: FORCE_SAVE_CATALOG_ID,
        useReaction: true,
      }),
    ],
  },
  "*::Battering Roots": {
    linkedModifiers: [
      charInstance("modinst_battering_roots", FEAT_MODIFIER_CATALOG.attackRollModifiers, [
        {
          id: modId("battering_roots"),
          type: "attack_roll_modifiers",
          entries: [{ bonus: 0, target: "all" }],
          label: "+10 ft. reach with Heavy or Versatile melee weapons; extra Push/Topple mastery",
        },
      ]),
    ],
  },
  "*::Travel along the Tree": {
    activation: { bonusAction: true },
    linkedModifiers: [
      fxInstance("modinst_travel_tree", FEAT_MODIFIER_CATALOG.movementOption, {
        bonusAction: true,
        effects: [
          {
            id: modId("travel_tree"),
            kind: "movement_option",
            movementTeleport: true,
            moveDistanceMode: "fixed",
            moveDistanceFixed: 60,
            label: "Teleport up to 60 ft. (150 ft. once per Rage with allies)",
          },
        ],
      }),
    ],
  },
  "*::Divine Fury": {
    linkedModifiers: [
      onHitTriggerPreset("divine_fury", {
        effectCatalogRefId: "cat_fx_extra_damage_on_hit",
      }),
      extraDamageOnHit("divine_fury_damage", "1d6"),
    ],
  },
  "*::Warrior of the Gods": [
    healingDicePoolPreset("warrior_of_gods", {
      dieType: "d12",
      poolSize: 4,
      poolSizeByLevel: [
        { level: 6, mode: "fixed", fixed: 5 },
        { level: 12, mode: "fixed", fixed: 6 },
        { level: 17, mode: "fixed", fixed: 7 },
      ],
      label: "Warrior of the Gods healing d12 pool",
    }),
  ],
  "*::Fanatical Focus": {
    linkedModifiers: [
      failedRollTriggerPreset("fanatical_focus", {
        rollKind: "save",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
        spendResourceKey: "rage",
      }),
    ],
  },
  "*::Zealous Presence": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Zealous Presence",
        { resourceKey: "rage", restores: 1 },
      ),
      fxInstance("modinst_zealous_presence", CHECK_ROLL_MODIFIER_CATALOG_ID, {
        bonusAction: true,
        effects: [
          {
            id: modId("zealous_presence"),
            kind: "check_roll_modifier",
            checkRollMode: "advantage",
            checkCategory: "other",
            label: "Allies within 60 ft. have Advantage on attacks and saves until your next turn",
          },
        ],
      }),
    ],
  },

  // —— Bard colleges (2024) ——
  "*::Dazzling Footwork": {
    linkedModifiers: [
      unarmoredDefense("dance_uac", ["DEX", "CHA"], "Unarmored Defense (10 + DEX + CHA)"),
      checkAdvantage("dance_virtuoso", { category: "skill", skills: ["Performance"] }),
    ],
  },
  "*::Leading Evasion": [evasion()],
  "*::Cutting Words": {
    linkedModifiers: [
      failedRollTriggerPreset("cutting_words", {
        rollKind: "attack",
        triggerOn: "success",
        targetScope: "target_creature",
        rangeFeet: 60,
        useReaction: true,
        spendResourceKey: "bardic_inspiration",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
      }),
    ],
  },
  "*::Combat Inspiration": {
    linkedModifiers: [
      charInstance("modinst_combat_inspiration", RESOURCE_ABILITY_MENU_CATALOG_ID, [
        {
          id: modId("combat_inspiration"),
          type: "resource_ability_menu",
          resourceKey: "bardic_inspiration",
          options: [
            {
              name: "Defense",
              description: "Reaction: add BI die to AC vs one attack",
              bonusConfig: { mode: "die", dieScaling: "class_resource", classResourceKey: "bardic_inspiration" },
            },
            {
              name: "Offense",
              description: "After hit: add BI die to damage",
              bonusConfig: { mode: "die", dieScaling: "class_resource", classResourceKey: "bardic_inspiration" },
            },
          ],
        },
      ]),
    ],
  },
  "*::Martial Training": {
    linkedModifiers: [
      charInstance("modinst_martial_training_weapons", "cat_char_weapon_proficiencies", [
        { id: modId("martial_training_weapons"), type: "weapon_proficiencies", mode: "martial_weapons", values: [] },
      ]),
      charInstance("modinst_martial_training_armor", "cat_char_armor_proficiencies", [
        {
          id: modId("martial_training_armor"),
          type: "armor_proficiencies",
          values: ["Medium armor", "Shields"],
        },
      ]),
    ],
  },
  "*::Extra Attack": {
    linkedModifiers: [
      fxInstance("modinst_extra_attack", EXTRA_ATTACK_CATALOG_ID, {
        effects: [{ id: modId("extra_attack"), kind: "extra_attack", extraAttackCount: 1 }],
      }),
    ],
  },
  "*::Battle Magic": {
    activation: { bonusAction: true },
    linkedModifiers: [
      fxInstance("modinst_battle_magic", "cat_fx_bonus_action_attack", {
        bonusAction: true,
        effects: [
          {
            id: modId("battle_magic"),
            kind: "bonus_action_attack",
            label: "After casting an action spell, make one weapon attack",
          },
        ],
      }),
    ],
  },
  "*::Beguiling Magic": {
    linkedModifiers: [
      alwaysPreparedSpells("Charm Person and Mirror Image"),
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Beguiling Magic rider",
        { resourceKey: "bardic_inspiration", restores: 1 },
      ),
    ],
  },
  "*::Mantle of Inspiration": {
    activation: { bonusAction: true },
    linkedModifiers: [
      fxInstance("modinst_mantle_inspiration", GRANT_TEMP_HP_CATALOG_ID, {
        bonusAction: true,
        effects: [
          {
            id: modId("mantle_inspiration"),
            kind: "grant_temp_hp",
            tempHpTrigger: "on_action",
            healMode: "dice",
            healDiceCount: 2,
            label: "Temp HP = 2× Bardic Inspiration die; allies can move",
          },
        ],
      }),
    ],
  },
  "*::Mantle of Majesty": {
    linkedModifiers: [
      alwaysPreparedSpells("Command"),
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Mantle of Majesty",
        undefined,
        { minSpellLevel: 3, restores: 1 },
      ),
    ],
  },
  "*::Unbreakable Majesty": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] }, "Unbreakable Majesty"),
      fxInstance("modinst_unbreakable_majesty", MODIFY_CREATURE_CATALOG_ID, {
        bonusAction: true,
        effects: [
          {
            id: modId("unbreakable_majesty"),
            kind: "modify_creature",
            rollTarget: "enemy",
            creatureModifyMode: "roll",
            label: "First hit each turn: attacker CHA save or miss",
          },
        ],
      }),
    ],
  },
  "*::Channeler": {
    linkedModifiers: [
      spellsKnownChar("channeler_guidance", {
        spells: [],
        alwaysPrepared: true,
        spellListClassOptions: ["Bard"],
        label: "Guidance cantrip; range 60 ft.",
      }),
      toolsPreset("channeler", ["Gaming Set (playing cards)"], "Spiritual Focus tool proficiency"),
    ],
  },
  "*::Spirits from Beyond": {
    linkedModifiers: [
      charInstance("modinst_spirits_beyond", RESOURCE_ABILITY_MENU_CATALOG_ID, [
        {
          id: modId("spirits_beyond"),
          type: "resource_ability_menu",
          resourceKey: "bardic_inspiration",
          label: "Channel spirits — each option is a custom ability (see Spirits table)",
          options: [],
        },
      ]),
    ],
  },
  "*::Empowered Channeling": {
    linkedModifiers: [
      spellsKnownChar("empowered_channeling_spirit_guardians", {
        spells: [],
        alwaysPrepared: true,
        spellListClassOptions: ["Bard"],
        freeCastPerLongRest: [{ spellName: "Spirit Guardians", count: 1 }],
        label: "Always prepared; cast once without a slot per Long Rest (Half Cover option 1/rest)",
      }),
      usesPool(
        { type: "special", specialDescription: "Power from Beyond: once/turn, +1d6 to a spell's damage or healing" },
        "Power from Beyond",
      ),
    ],
  },
  "*::Broad Inspiration": {
    linkedModifiers: [
      charInstance("modinst_broad_inspiration", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("broad_inspiration"),
          type: "spells_known",
          spells: [],
          choiceGrants: [{ level: 0, count: 1 }],
          spellListClassOptions: ["Bard"],
          label: "Guidance cantrip (Bard spell); confer BI to two creatures",
        },
      ]),
    ],
  },
  "*::Keeper of History": [
    skillChoice(2, "History and Performance (Expertise if already proficient)", true),
  ],
  "*::Commanding Voice": {
    linkedModifiers: [
      fxInstance("modinst_commanding_voice", REACTION_ATTACK_CATALOG_ID, {
        effects: [
          {
            id: modId("commanding_voice"),
            kind: "reaction_attack",
            label: "Allies with BI die may Reaction attack when you Attack or cast",
          },
        ],
      }),
    ],
  },
  "*::Battle Hymn": {
    activation: { bonusAction: true },
    linkedModifiers: [
      auraPreset("battle_hymn", {
        radiusFeet: 30,
        label: "Allies within 30 ft. add 1d4 to ability checks and saves while hymn is active",
      }),
    ],
  },

  // —— Fighter subclasses (2024) ——
  "*::Knightly Envoy": {
    linkedModifiers: [
      alwaysPreparedSpells("Comprehend Languages (ritual)"),
      skillChoice(1, "Knightly Envoy skill"),
      languages([], 1, "Polyglot language"),
    ],
  },
  "*::Group Recovery": {
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] }, "Group Recovery"),
      fxInstance("modinst_group_recovery", "cat_fx_heal_self", {
        effects: [
          {
            id: modId("group_recovery"),
            kind: "heal_self",
            healMode: "dice",
            healDiceCount: 1,
            healDieType: "d4",
            label: "On Second Wind: allies in 30 ft. heal 1d4 + Fighter level",
          },
        ],
      }),
    ],
  },
  "*::Team Tactics": {
    linkedModifiers: [
      checkAdvantage("team_tactics", { category: "other", ability: null }),
    ],
  },
  "*::Rallying Surge": {
    linkedModifiers: [
      fxInstance("modinst_rallying_surge", REACTION_ATTACK_CATALOG_ID, {
        effects: [
          {
            id: modId("rallying_surge"),
            kind: "reaction_attack",
            label: "On Action Surge: allies Reaction attack or move half Speed",
          },
        ],
      }),
    ],
  },
  "*::Shared Resilience": {
    linkedModifiers: [
      usesPool(INDOMITABLE_FEATURE_USES, "Indomitable"),
      charInstance("modinst_shared_resilience", SAVING_THROW_TRIGGER_CATALOG_ID, [
        {
          id: modId("shared_resilience"),
          type: "saving_throw_trigger",
          triggerOn: "ally_fails",
          targetScope: "allied_creature",
          useReaction: true,
          effect: { catalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID },
          label: "Ally rerolls failed save with bonus equal to Fighter level",
        },
      ]),
    ],
  },
  "*::Inspiring Commander": {
    linkedModifiers: [
      conditionImmunity(["Charmed", "Frightened"], "Unshakable Bravery"),
    ],
  },
  "*::Combat Superiority": {
    linkedModifiers: [
      usesPool(
        {
          type: "class_resource",
          classResourceKey: "superiority_dice",
          classResourceAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
        "Superiority Dice — maneuvers are custom abilities",
      ),
    ],
  },
  "*::Student of War": [skillChoice(1, "Student of War skill")],
  "*::Know Your Enemy": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Know Your Enemy",
        { resourceKey: "superiority_dice", resourceAmount: 1, restores: 1 },
      ),
    ],
  },
  "*::Improved Combat Superiority": {
    linkedModifiers: [
      charInstance("modinst_improved_combat_superiority", FEAT_MODIFIER_CATALOG.uses, [
        {
          id: modId("improved_combat_superiority"),
          type: "uses",
          uses: { type: "class_resource", classResourceKey: "superiority_dice", dieType: "d10" },
          label: "Superiority Die becomes d10",
        },
      ]),
    ],
  },
  "*::Ultimate Combat Superiority": {
    linkedModifiers: [
      charInstance("modinst_ultimate_combat_superiority", FEAT_MODIFIER_CATALOG.uses, [
        {
          id: modId("ultimate_combat_superiority"),
          type: "uses",
          uses: { type: "class_resource", classResourceKey: "superiority_dice", dieType: "d12" },
          label: "Superiority Die becomes d12",
        },
      ]),
    ],
  },
  "*::Relentless": {
    linkedModifiers: [
      charInstance("modinst_relentless_bm", FEAT_MODIFIER_CATALOG.uses, [
        {
          id: modId("relentless_bm"),
          type: "uses",
          uses: { type: "class_resource", classResourceKey: "superiority_dice", freeUseAfterLevel: 15 },
          label: "Once per turn: roll 1d8 instead of expending Superiority Die",
        },
      ]),
    ],
  },
  "*::War Magic": {
    linkedModifiers: [
      fxInstance("modinst_war_magic", "cat_fx_weapon_attack", {
        effects: [
          {
            id: modId("war_magic"),
            kind: "weapon_attack",
            label: "Replace one Attack action attack with a Wizard cantrip",
          },
        ],
      }),
    ],
  },
  "*::Arcane Charge": {
    linkedModifiers: [
      fxInstance("modinst_arcane_charge", FEAT_MODIFIER_CATALOG.movementOption, {
        effects: [
          {
            id: modId("arcane_charge"),
            kind: "movement_option",
            movementTeleport: true,
            moveDistanceMode: "fixed",
            moveDistanceFixed: 30,
            label: "On Action Surge: teleport up to 30 ft.",
          },
        ],
      }),
    ],
  },
  "*::Psionic Power": {
    linkedModifiers: [
      usesPool(
        {
          type: "class_resource",
          classResourceKey: "psionic_energy_dice",
          classResourceAmount: 1,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
        "Psionic Energy Dice",
      ),
    ],
  },
  "*::Guarded Mind": [damageResistance(["Psychic"], "Psychic Resistance")],

  // —— Monk warriors (2024) ——
  "*::Hand of Harm": {
    linkedModifiers: [
      onHitTriggerPreset("hand_of_harm", {
        appliesTo: "Unarmed Strike",
        spendResourceKey: "focus_points",
        spendResourceAmount: 1,
        effectCatalogRefId: "cat_fx_extra_damage_on_hit",
      }),
    ],
  },
  "*::Hand of Healing": {
    linkedModifiers: [
      fxInstance("modinst_hand_of_healing", FEAT_MODIFIER_CATALOG.healSelf, {
        effects: [
          {
            id: modId("hand_of_healing"),
            kind: "heal_self",
            healMode: "dice",
            healDiceCount: 1,
            healAbility: "WIS",
            label: "Magic action: heal Martial Arts die + WIS (touch)",
          },
        ],
      }),
    ],
  },
  "*::Implements of Mercy": [skillChoice(2, "Insight and Medicine")],
  "*::Physician's Touch": {
    linkedModifiers: [
      onHitTriggerPreset("physicians_harm", {
        appliesTo: "Unarmed Strike",
        effectCatalogRefId: FORCE_SAVE_CATALOG_ID,
      }),
    ],
  },
  "*::Shadow Arts": {
    linkedModifiers: [
      vision(60, "darkvision", "Darkvision 60 ft."),
      alwaysPreparedSpells("Minor Illusion"),
    ],
  },
  "*::Shadow Step": {
    activation: { bonusAction: true },
    linkedModifiers: [
      fxInstance("modinst_shadow_step", FEAT_MODIFIER_CATALOG.movementOption, {
        bonusAction: true,
        effects: [
          {
            id: modId("shadow_step"),
            kind: "movement_option",
            movementTeleport: true,
            moveDistanceMode: "fixed",
            moveDistanceFixed: 60,
            label: "Teleport 60 ft. in dim light/darkness; Advantage on next melee attack",
          },
        ],
      }),
    ],
  },
  "*::Elemental Attunement": [featureOptionPicker("Martial Form / Elemental Attunement")],
  // SRD 2024 Warrior of the Elements' own "Elemental Attunement" (reach + elemental damage type
  // swap) is unrelated to the "Martial Form" homebrew wildcard above — scope this key to the
  // exact class/subclass so it wins resolvePresetKey's lookup instead of the generic one.
  "Monk::Warrior of the Elements::Elemental Attunement": {
    linkedModifiers: [
      charInstance("modinst_elemental_attunement_reach", characteristicCatalogRefId("weapon_reach_modifier"), [
        {
          id: modId("elemental_attunement_reach"),
          type: "weapon_reach_modifier",
          reachBonusFeet: 10,
          appliesToUnarmedStrike: true,
          requiresSheetToggle: "elemental_attunement_active",
          label: "+10 ft. reach on Unarmed Strikes while Elemental Attunement is active",
        },
      ]),
    ],
  },
  "*::Elemental Burst": {
    activation: { action: true },
    linkedModifiers: [
      usesPool({ type: "class_resource", classResourceKey: "focus_points", classResourceAmount: 2 }, "Elemental Burst"),
      fxInstance("modinst_elemental_burst", FORCE_SAVE_CATALOG_ID, {
        action: true,
        effects: [
          {
            id: modId("elemental_burst"),
            kind: "force_save_control",
            attackProfile: "force_save",
            saveAbility: "DEX",
            areaShape: "sphere",
            areaRadiusFeet: 20,
            label: "20-ft. sphere DEX save for 3× Martial Arts die elemental damage",
          } as import("@/lib/types").FeatureEffect,
        ],
      }),
    ],
  },
  "*::Martial Form": [featureOptionPicker("Martial Form (Forged Heart/Nightmare Shroud/Traveler's Blade/Weretouched)")],
  "*::Manifest Blow": [featureOptionPicker("Manifest Blow upgrade", true)],
  "*::Reflexive Adaptation": {
    linkedModifiers: [
      fxInstance("modinst_reflexive_adaptation", FEAT_MODIFIER_CATALOG.healSelf, {
        effects: [
          {
            id: modId("reflexive_adaptation"),
            kind: "heal_self",
            removeConditions: ["Blinded", "Deafened", "Grappled"],
            label: "Self-Restoration also ends Blinded, Deafened, Grappled; remove Exhaustion on rest",
          },
        ],
      }),
    ],
  },
  "*::Hand of Ultimate Mercy": {
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Hand of Ultimate Mercy"),
      fxInstance("modinst_hand_ultimate_mercy", FEAT_MODIFIER_CATALOG.healSelf, {
        effects: [
          {
            id: modId("hand_ultimate_mercy"),
            kind: "heal_self",
            healMode: "dice",
            healDiceCount: 4,
            healDieType: "d10",
            label: "Revive corpse within 24 hours (5 Focus Points)",
          },
        ],
      }),
    ],
  },

  // —— Paladin oaths (2024) ——
  "*::Sacred Weapon": {
    activation: { action: true },
    linkedModifiers: [
      usesPool({ type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 }, "Sacred Weapon"),
      fxInstance("modinst_sacred_weapon", SELF_BUFF_CASTER_CATALOG_ID, {
        action: true,
        effects: [
          {
            id: modId("sacred_weapon"),
            kind: "self_buff_caster",
            casterBuffLabel: "Sacred Weapon (+CHA attacks, radiant option, light)",
          },
        ],
      }),
    ],
  },
  "*::Oath of Glory Spells": [alwaysPreparedSpells("Oath of Glory spells")],
  "*::Inspiring Smite": {
    linkedModifiers: [
      onCastSpellChar("inspiring_smite", {
        spellTags: ["smite", "divine smite"],
        effect: { catalogRefId: GRANT_TEMP_HP_CATALOG_ID },
        label: "After Divine Smite: CD → temp HP divided among allies within 30 ft.",
      }),
    ],
  },
  "*::Peerless Athlete": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool({ type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 }, "Peerless Athlete"),
      checkAdvantage("peerless_athlete_athletics", {
        category: "skill",
        skills: ["Athletics"],
        limitations: [requiresActiveToggleLimitation("peerless_athlete_active")],
      }),
      checkAdvantage("peerless_athlete_acrobatics", {
        category: "skill",
        skills: ["Acrobatics"],
        limitations: [requiresActiveToggleLimitation("peerless_athlete_active")],
      }),
    ],
  },
  "*::Aura of Alacrity": {
    linkedModifiers: [
      speedAdd(10, "+10 ft. Speed"),
      auraPreset("aura_alacrity", {
        radiusFeet: 10,
        label: "Allies in Aura of Protection gain +10 ft. Speed when entering or starting turn there",
      }),
    ],
  },
  "*::Glorious Defense": {
    activation: { reaction: true },
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "CHA", recharges: [{ rest: "long_rest" }] },
        "Glorious Defense",
      ),
      fxInstance("modinst_glorious_defense", "cat_fx_boost_ac", {
        reaction: true,
        effects: [
          {
            id: modId("glorious_defense"),
            kind: "boost_ac",
            label: "Reaction: +CHA AC vs hit; counterattack if miss",
          },
        ],
      }),
    ],
  },
  "*::Living Legend": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Living Legend",
        undefined,
        { minSpellLevel: 5, restores: 1 },
      ),
      checkAdvantage("living_legend_charisma", {
        category: "ability",
        ability: "Charisma",
        limitations: [requiresActiveToggleLimitation("living_legend_active")],
      }),
      failedRollTriggerPreset("living_legend_save", {
        rollKind: "save",
        useReaction: true,
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
      }),
    ],
  },
  "*::Oath of the Ancients Spells": [alwaysPreparedSpells("Oath of the Ancients spells")],
  "*::Nature's Wrath": {
    activation: { action: true },
    linkedModifiers: [
      usesPool({ type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 }, "Nature's Wrath"),
      fxInstance("modinst_natures_wrath", FORCE_SAVE_CATALOG_ID, {
        action: true,
        effects: [
          {
            id: modId("natures_wrath"),
            kind: "force_save_control",
            attackProfile: "force_save",
            saveAbility: "STR",
            effectConditionTypes: ["Restrained"],
          },
        ],
      }),
    ],
  },
  "*::Aura of Warding": [
    auraPreset("aura_warding", {
      radiusFeet: 10,
      label: "Allies in Aura of Protection: Resistance to Necrotic, Psychic, and Radiant",
    }),
    damageResistance(["Necrotic", "Psychic", "Radiant"], "Aura of Warding"),
  ],
  "*::Undying Sentinel": {
    activation: { onDropToZeroHp: true },
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Undying Sentinel"),
      fxInstance("modinst_undying_sentinel", FEAT_MODIFIER_CATALOG.healSelf, {
        effects: [
          {
            id: modId("undying_sentinel"),
            kind: "heal_self",
            healMode: "character_level",
            healLevelMultiplier: 3,
            label: "Drop to 1 HP instead; heal 3× Paladin level",
          },
        ],
      }),
    ],
  },
  "*::Elder Champion": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Elder Champion",
        undefined,
        { minSpellLevel: 5, restores: 1 },
      ),
      auraPreset("elder_champion", {
        radiusFeet: 10,
        label: "Enemies in aura: Disadvantage on saves vs your spells/CD; regen 10 HP/turn; action spells as BA",
      }),
    ],
  },
  "*::Genie Spells": [alwaysPreparedSpells("Oath of the Noble Genies spells")],
  "*::Elemental Strike": {
    linkedModifiers: [
      onCastSpellChar("elemental_strike", {
        spellTags: ["smite", "divine smite"],
        effect: { catalogRefId: FORCE_SAVE_CATALOG_ID },
        label: "After Divine Smite: CD → Dao/Djinni/Efreeti/Marid effect",
      }),
      featureOptionPicker("Elemental Strike (Dao/Djinni/Efreeti/Marid)"),
    ],
  },
  "*::Genie's Splendor": {
    linkedModifiers: [
      unarmoredDefense("genie_splendor_uac", ["DEX", "CHA"], "Unarmored Defense (10 + DEX + CHA, shield OK)"),
      skillChoice(1, "Genie's Splendor skill"),
    ],
  },
  "*::Aura of Elemental Shielding": [
    featureOptionPicker("Elemental Shielding damage type (swappable each turn)", true),
    auraPreset("aura_elemental_shield", {
      radiusFeet: 10,
      label: "Allies in Aura of Protection: Resistance to chosen elemental type",
    }),
  ],
  "*::Elemental Rebuke": {
    activation: { reaction: true },
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "CHA", recharges: [{ rest: "long_rest" }] },
        "Elemental Rebuke",
      ),
      damageHalvingReactionPreset("elemental_rebuke"),
      fxInstance("modinst_elemental_rebuke_reflect", FORCE_SAVE_CATALOG_ID, {
        reaction: true,
        effects: [
          {
            id: modId("elemental_rebuke_reflect"),
            kind: "force_save_control",
            attackProfile: "force_save",
            saveAbility: "DEX",
            label: "DEX save or take 2d10+CHA elemental damage (half on save)",
          },
        ],
      }),
    ],
  },
  "*::Noble Scion": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Noble Scion",
        undefined,
        { minSpellLevel: 5, restores: 1 },
      ),
      speedTypeAdd("fly", 60, "Fly Speed 60 ft. (hover)"),
      d20TestReactionPreset("noble_scion_wish", {
        modifierMode: "add",
        targetScope: "allies_in_area",
        rangeFeet: 10,
        useReaction: true,
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
      }),
    ],
  },
  "*::Oath of Vengeance Spells": [alwaysPreparedSpells("Oath of Vengeance spells")],
  "*::Vow of Enmity": {
    activation: { action: true },
    linkedModifiers: [
      usesPool({ type: "class_resource", classResourceKey: "channel_divinity", classResourceAmount: 1 }, "Vow of Enmity"),
      checkAdvantage("vow_of_enmity", {
        category: "attack",
        ability: null,
        limitations: [requiresActiveToggleLimitation("vow_of_enmity")],
      }),
    ],
  },
  "*::Relentless Avenger": {
    linkedModifiers: [
      fxInstance("modinst_relentless_avenger", FEAT_MODIFIER_CATALOG.movementOption, {
        reaction: true,
        effects: [
          {
            id: modId("relentless_avenger"),
            kind: "movement_option",
            movementDisengage: true,
            moveDistanceMode: "multiplier",
            moveDistanceMultiplier: 0.5,
            label: "On Opportunity Attack hit: target Speed 0; move half Speed",
          },
        ],
      }),
    ],
  },
  "*::Soul of Vengeance": {
    activation: { reaction: true },
    linkedModifiers: [
      fxInstance("modinst_soul_of_vengeance", REACTION_ATTACK_CATALOG_ID, {
        reaction: true,
        effects: [{ id: modId("soul_of_vengeance"), kind: "reaction_attack" }],
      }),
    ],
  },
  "*::Avenging Angel": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Avenging Angel",
        undefined,
        { minSpellLevel: 5, restores: 1 },
      ),
      speedTypeAdd("fly", 60, "Fly Speed 60 ft. (hover)"),
      auraPreset("avenging_angel", {
        radiusFeet: 10,
        label: "Frightful Aura: WIS save or Frightened; attacks vs Frightened have Advantage",
      }),
    ],
  },

  // —— Ranger subclasses (2024) ——
  "*::Primal Companion": [
    featureOptionPicker("Primal Companion (Land/Sea/Sky)"),
    grantCreaturePreset(
      "primal_companion",
      ["Beast of the Land", "Beast of the Sea", "Beast of the Sky"],
      {
        choiceOptions: ["Beast of the Land", "Beast of the Sea", "Beast of the Sky"],
        count: 1,
        label: "Primal Companion beast (import the Beast of the Land/Sea/Sky creatures)",
      },
    ),
  ],
  "*::Exceptional Training": {
    activation: { bonusAction: true },
    linkedModifiers: [
      fxInstance("modinst_exceptional_training", FEAT_MODIFIER_CATALOG.movementOption, {
        bonusAction: true,
        effects: [
          {
            id: modId("exceptional_training"),
            kind: "movement_option",
            movementDash: true,
            movementDisengage: true,
            label: "Command beast: also Dash, Disengage, Dodge, or Help as Bonus Action",
          },
        ],
      }),
      onHitTriggerPreset("exceptional_training_force", {
        effectCatalogRefId: "cat_fx_extra_damage_on_hit",
      }),
    ],
  },
  "*::Bestial Fury": {
    linkedModifiers: [
      onHitTriggerPreset("bestial_fury_mark", {
        appliesTo: "Hunter's Mark target",
        effectCatalogRefId: "cat_fx_extra_damage_on_hit",
      }),
    ],
  },
  "*::Share Spells": {
    linkedModifiers: [
      charInstance("modinst_share_spells", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("share_spells"),
          type: "spells_known",
          spells: [],
          label: "Self-targeting spells also affect Primal Companion within 30 ft.",
        },
      ]),
    ],
  },
  "*::Fey Wanderer Spells": [alwaysPreparedSpells("Fey Wanderer spells")],
  "*::Feywild Gifts": [featureOptionPicker("Feywild Gift (or random)", false)],
  "*::Dreadful Strikes": {
    linkedModifiers: [
      onHitTriggerPreset("dreadful_strikes", { effectCatalogRefId: "cat_fx_extra_damage_on_hit" }),
      // "increases to 1d6 when you reach Ranger level 11" — was stuck at a flat 1d4.
      extraDamageOnHitByLevel("dreadful_strikes_psychic", [
        { level: 3, dice: "1d4" },
        { level: 11, dice: "1d6" },
      ]),
    ],
  },
  "*::Otherworldly Glamour": {
    linkedModifiers: [
      checkBonus("otherworldly_glamour", {
        category: "ability",
        ability: "Charisma",
        bonusConfig: { mode: "ability_modifier", ability: "WIS" },
      }),
      skillChoice(1, "Otherworldly Glamour skill (Deception/Performance/Persuasion)"),
    ],
  },
  "*::Beguiling Twist": {
    linkedModifiers: [
      checkAdvantage("beguiling_twist_saves", {
        category: "save",
        ability: "Wisdom",
        conditions: ["Charmed", "Frightened"],
      }),
      savingThrowTriggerPreset("beguiling_twist", {
        triggerOn: "make",
        targetScope: "self",
        useReaction: true,
        effectCatalogRefId: FORCE_SAVE_CATALOG_ID,
      }),
    ],
  },
  "*::Fey Reinforcements": {
    linkedModifiers: [
      spellsKnownChar("fey_reinforcements", {
        choiceGrants: [{ level: 5, count: 1 }],
        spellListClassOptions: ["Ranger"],
        freeCastPerLongRest: [{ spellName: "Summon Fey", count: 1 }],
        label: "Summon Fey without slot/M once per Long Rest; optional no-concentration",
      }),
    ],
  },
  "*::Misty Wanderer": {
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "WIS", recharges: [{ rest: "long_rest" }] },
        "Misty Step without slot",
      ),
      castSpellFx("misty_wanderer", { castSpellName: "Misty Step", castSpellWithoutSlot: true }, { bonusAction: true }),
    ],
  },
  "*::Gloom Stalker Spells": [alwaysPreparedSpells("Gloom Stalker spells")],
  "*::Dread Ambusher": {
    linkedModifiers: [
      speedAdd(10, "Ambusher's Leap: +10 ft. Speed first turn", [
        requiresActiveToggleLimitation("first_turn_of_combat"),
      ]),
      checkBonus("dread_ambusher_init", {
        category: "initiative",
        bonusConfig: { mode: "ability_modifier", ability: "WIS" },
      }),
      usesPool(
        { type: "ability_modifier", abilityModifier: "WIS", recharges: [{ rest: "long_rest" }] },
        "Dreadful Strike (2d6 Psychic)",
      ),
      onHitTriggerPreset("dread_ambusher", { effectCatalogRefId: "cat_fx_extra_damage_on_hit" }),
      extraDamageOnHit("dread_ambusher_psychic", "2d6"),
    ],
  },
  "*::Umbral Sight": {
    linkedModifiers: [
      vision(60, "darkvision", "Darkvision 60 ft. (+60 if already had)"),
      fxInstance("modinst_umbral_sight", MODIFY_CREATURE_CATALOG_ID, {
        effects: [
          {
            id: modId("umbral_sight"),
            kind: "modify_creature",
            rollTarget: "self",
            creatureModifyMode: "roll",
            label: "Invisible to Darkvision while in Darkness",
          },
        ],
      }),
    ],
  },
  "*::Iron Mind": [savingThrows(["Wisdom"], "WIS saves (or INT/CHA if already proficient)")],
  "*::Stalker's Flurry": {
    linkedModifiers: [
      extraDamageOnHit("stalkers_flurry", "2d8"),
      featureOptionPicker("Stalker's Flurry rider (Sudden Strike / Mass Fear)"),
    ],
  },
  "*::Shadowy Dodge": {
    activation: { reaction: true },
    linkedModifiers: [
      fxInstance("modinst_shadowy_dodge", IMPOSE_DISADVANTAGE_CATALOG_ID, {
        reaction: true,
        effects: [{ id: modId("shadowy_dodge"), kind: "impose_disadvantage" }],
      }),
      fxInstance("modinst_shadowy_dodge_tp", FEAT_MODIFIER_CATALOG.movementOption, {
        reaction: true,
        effects: [
          {
            id: modId("shadowy_dodge_tp"),
            kind: "movement_option",
            label: "Then teleport up to 30 ft.",
          },
        ],
      }),
    ],
  },
  "*::Hollow Warden Spells": [alwaysPreparedSpells("Hollow Warden spells")],
  "*::Wrath of the Wild": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Wrath of the Wild (Favored Enemy)"),
      fxInstance("modinst_wrath_wild", "cat_fx_boost_ac", {
        bonusAction: true,
        effects: [
          {
            id: modId("wrath_wild"),
            kind: "boost_ac",
            label: "Transform: +1 AC (+2 at 11), Frightened aura, retribution Opportunity Attack",
          },
        ],
      }),
    ],
  },
  "*::Hungering Might": [
    checkBonus("hungering_might", {
      category: "save",
      ability: "Constitution",
      bonusConfig: { mode: "ability_modifier", ability: "WIS" },
    }),
    fxInstance("modinst_hungering_might", FEAT_MODIFIER_CATALOG.healSelf, {
      effects: [
        {
          id: modId("hungering_might"),
          kind: "heal_self",
          healMode: "dice",
          healDiceCount: 1,
          healDieType: "d10",
          label: "Once/turn while transformed and Bloodied: heal 1d10+WIS on hit",
        },
      ],
    }),
  ],
  "*::Rot and Violence": {
    linkedModifiers: [
      weaponMasterySwap("rot_violence", ["Sap", "Slow"], "Sap or Slow mastery in addition while transformed"),
    ],
  },
  "*::Ancient Might": {
    activation: { onDropToZeroHp: true },
    linkedModifiers: [
      onHitTriggerPreset("ancient_might_ominous", {
        effectCatalogRefId: "cat_fx_extra_damage_on_hit",
      }),
      conditionImmunity(["Exhausted"], "Timeless"),
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Persistent Wrath",
        undefined,
        { minSpellLevel: 4, restores: 1 },
      ),
      fxInstance("modinst_persistent_wrath", FEAT_MODIFIER_CATALOG.healSelf, {
        effects: [
          {
            id: modId("persistent_wrath"),
            kind: "heal_self",
            healMode: "character_level",
            healLevelMultiplier: 2,
            label: "While transformed at 0 HP: surge to 2× Ranger level HP",
          },
        ],
      }),
    ],
  },
  "*::Frigid Explorer": {
    linkedModifiers: [
      damageResistance(["Cold"], "Frost Resistance"),
      onHitTriggerPreset("polar_strikes", { effectCatalogRefId: "cat_fx_extra_damage_on_hit" }),
      extraDamageOnHit("polar_strikes_cold", "1d4"),
    ],
  },
  "*::Hunter's Rime": {
    linkedModifiers: [
      onCastSpellChar("hunters_rime", {
        spellTags: ["hunter's mark"],
        effect: { catalogRefId: GRANT_TEMP_HP_CATALOG_ID },
      }),
      fxInstance("modinst_hunters_rime", MODIFY_CREATURE_CATALOG_ID, {
        effects: [
          {
            id: modId("hunters_rime"),
            kind: "modify_creature",
            rollTarget: "enemy",
            creatureModifyMode: "movement",
            label: "Marked creature can't Disengage",
          },
        ],
      }),
    ],
  },
  "*::Winter Walker Spells": [alwaysPreparedSpells("Winter Walker spells")],
  "*::Fortifying Soul": {
    activation: { action: true },
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Fortifying Soul"),
      fxInstance("modinst_fortifying_soul", FEAT_MODIFIER_CATALOG.healSelf, {
        action: true,
        effects: [
          {
            id: modId("fortifying_soul"),
            kind: "heal_self",
            healMode: "character_level",
            healLevelMultiplier: 1,
            label: "WIS-mod allies heal 1d10+level; Advantage vs Frightened 1 hour",
          },
        ],
      }),
    ],
  },
  "*::Chilling Retribution": {
    activation: { reaction: true },
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "WIS", recharges: [{ rest: "long_rest" }] },
        "Chilling Retribution",
      ),
      fxInstance("modinst_chilling_retribution", FORCE_SAVE_CATALOG_ID, {
        reaction: true,
        effects: [
          {
            id: modId("chilling_retribution"),
            kind: "force_save_control",
            attackProfile: "force_save",
            saveAbility: "WIS",
            effectConditionTypes: ["Stunned"],
          },
        ],
      }),
    ],
  },
  "*::Frozen Haunt": {
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Frozen Haunt",
        undefined,
        { minSpellLevel: 4, restores: 1 },
      ),
      damageResistance(["Cold"], "Frozen Soul immunity while in form"),
      conditionImmunity(["Grappled", "Prone", "Restrained"], "Partially Incorporeal"),
    ],
  },

  // —— Rogue subclasses (2024) ——
  "*::Mage Hand Legerdemain": {
    linkedModifiers: [
      castSpellFx(
        "mage_hand_legerdemain",
        { castSpellName: "Mage Hand", castSpellCastingTime: "bonus_action" },
        { bonusAction: true },
      ),
    ],
  },
  "*::Magical Ambush": {
    linkedModifiers: [
      onCastSpellChar("magical_ambush", {
        effect: { catalogRefId: MODIFY_CREATURE_CATALOG_ID },
        label: "Invisible when casting: targets have Disadvantage on save vs spell",
      }),
    ],
  },
  "*::Versatile Trickster": {
    linkedModifiers: [
      bonusRidersPreset(
        "versatile_trickster",
        [{ name: "Trip (Mage Hand)", costDice: "1d6", description: "Trip second creature within 5 ft. of hand" }],
        1,
        "Cunning Strike",
      ),
    ],
  },
  "*::Spell Thief": {
    activation: { reaction: true },
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Spell Thief"),
      savingThrowTriggerPreset("spell_thief", {
        triggerOn: "make",
        targetScope: "target_creature",
        useReaction: true,
        saveAbility: "Intelligence",
        effectCatalogRefId: "cat_fx_cast_spell",
      }),
    ],
  },
  "*::Assassinate": {
    linkedModifiers: [
      checkAdvantage("assassinate_init", { category: "initiative" }),
      checkAdvantage("assassinate_surprise", { category: "attack", ability: null }),
      onHitTriggerPreset("assassinate_surprise_damage", {
        effectCatalogRefId: "cat_fx_bonus_damage_by_level",
      }),
    ],
  },
  "*::Assassin's Tools": [
    charInstance("modinst_assassin_tools", "cat_char_tool_proficiencies", [
      { id: modId("assassin_tools"), type: "tool_proficiencies", values: ["Disguise Kit", "Poisoner's Kit"] },
    ]),
  ],
  "*::Infiltration Expertise": {
    linkedModifiers: [
      charInstance("modinst_roving_aim", FEAT_MODIFIER_CATALOG.attackRollModifiers, [
        {
          id: modId("roving_aim"),
          type: "attack_roll_modifiers",
          entries: [{ bonus: 0, target: "all" }],
          label: "Speed not reduced to 0 when using Steady Aim",
        },
      ]),
    ],
  },
  "*::Envenom Weapons": {
    linkedModifiers: [
      bonusRidersPreset(
        "envenom_weapons",
        [{ name: "Poison", costDice: "1d6", description: "Failed Poison save: +2d6 Poison damage (ignores Resistance)" }],
        1,
        "Cunning Strike",
      ),
    ],
  },
  "*::Death Strike": {
    linkedModifiers: [
      onHitTriggerPreset("death_strike", { effectCatalogRefId: FORCE_SAVE_CATALOG_ID }),
    ],
  },
  "*::Wails from the Grave": {
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "DEX", recharges: [{ rest: "long_rest" }] },
        "Wails from the Grave",
      ),
      onHitTriggerPreset("wails_from_grave", { effectCatalogRefId: "cat_fx_extra_damage_on_hit" }),
    ],
  },
  "*::Whispers of the Dead": [skillChoice(1, "Whispers of the Dead proficiency (swap on rest)")],
  "*::Voice of Death": [
    usesPool(
      { type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] },
      "Voice of Death (cast Speak with Dead without a slot, using DEX)",
    ),
  ],
  "*::Tokens of the Departed": {
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 2, recharges: [{ rest: "long_rest" }] }, "Soul trinkets"),
      checkAdvantage("life_essence", { category: "save", ability: "Constitution" }),
    ],
  },
  "*::Ghost Walk": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription: "Once per Long Rest; restore by destroying a soul trinket (no action)",
          recharges: [{ rest: "long_rest" }],
        },
        "Ghost Walk",
      ),
      speedTypeAdd("fly", 10, "Fly Speed 10 ft. (hover) while spectral"),
    ],
  },
  "*::Death's Friend": {
    linkedModifiers: [
      onHitTriggerPreset("deaths_lament", {
        effectCatalogRefId: "cat_fx_extra_damage_on_hit",
      }),
    ],
  },
  "*::Bloodthirst": {
    activation: { reaction: true },
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "INT", recharges: [{ rest: "long_rest" }] },
        "Bloodthirst",
      ),
      fxInstance("modinst_bloodthirst", REACTION_ATTACK_CATALOG_ID, {
        reaction: true,
        effects: [
          {
            id: modId("bloodthirst"),
            kind: "reaction_attack",
            label: "Reaction teleport 5 ft. and melee attack when enemy becomes Bloodied",
          },
        ],
      }),
    ],
  },
  "*::Dread Allegiance": {
    linkedModifiers: [
      featureOptionPicker("Dread Allegiance (Bane/Bhaal/Myrkul)", true),
      damageResistance([], "Resistance from chosen Dead Three patron"),
    ],
  },
  "*::Strike Fear": {
    linkedModifiers: [
      bonusRidersPreset(
        "strike_fear",
        [{ name: "Terrify", costDice: "1d6", description: "WIS save or Frightened 1 minute" }],
        1,
        "Cunning Strike",
      ),
    ],
  },
  "*::Aura of Malevolence": {
    linkedModifiers: [
      onHitTriggerPreset("aura_malevolence", {
        effectCatalogRefId: "cat_fx_extra_damage_on_hit",
      }),
    ],
  },
  "*::Dread Incarnate": {
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }] }, "Cutthroat Bloodthirst refresh"),
      charInstance("modinst_murderous_intent", FEAT_MODIFIER_CATALOG.damageRollModifiers, [
        {
          id: modId("murderous_intent"),
          type: "damage_roll_modifiers",
          entries: [{ bonus: 0, target: "all" }],
          label: "Sneak Attack: treat 1–2 on die as 3",
        },
      ]),
    ],
  },
  "*::Psychic Blades": {
    linkedModifiers: [
      charInstance("modinst_psychic_blades", FEAT_MODIFIER_CATALOG.unarmedStrikeDamage, [
        {
          id: modId("psychic_blades"),
          type: "unarmed_strike_damage",
          die: "1d6",
          label: "Psychic Blades: 1d6 Psychic, Finesse, Thrown 60/120; BA second blade 1d4",
        },
      ]),
    ],
  },
  "*::Soul Blades": {
    linkedModifiers: [
      failedRollTriggerPreset("homing_strikes", {
        rollKind: "attack",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
        spendResourceKey: "psionic_energy_dice",
      }),
    ],
  },
  "*::Psychic Veil": {
    activation: { action: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Psychic Veil",
        { resourceKey: "psionic_energy_dice", restores: 1 },
      ),
      fxInstance("modinst_psychic_veil", MODIFY_CREATURE_CATALOG_ID, {
        action: true,
        effects: [
          {
            id: modId("psychic_veil"),
            kind: "modify_creature",
            rollTarget: "self",
            creatureModifyMode: "roll",
            label: "Invisible 1 hour; ends early on damage or forced save",
          },
        ],
      }),
    ],
  },
  "*::Rend Mind": {
    linkedModifiers: [
      onHitTriggerPreset("rend_mind", {
        appliesTo: "Psychic Blades Sneak Attack",
        effectCatalogRefId: FORCE_SAVE_CATALOG_ID,
      }),
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Rend Mind",
        { resourceKey: "psionic_energy_dice", resourceAmount: 3, restores: 1 },
      ),
    ],
  },

  // —— Sorcerer subclasses (2024) ——
  "*::Psionic Spells": [alwaysPreparedSpells("Psionic Spells (Aberrant Sorcery)")],
  "*::Telepathic Speech": [telepathyPreset("telepathic_speech", 1, "Telepathy miles = CHA mod (min 1)")],
  "*::Psionic Sorcery": {
    linkedModifiers: [
      charInstance("modinst_psionic_sorcery", ON_CAST_SPELL_TRIGGER_CATALOG_ID, [
        {
          id: modId("psionic_sorcery"),
          type: "on_cast_spell_trigger",
          spellTags: ["psionic"],
          effect: { catalogRefId: CLASS_RESOURCE_CATALOG_ID },
          label: "Cast Psionic Spells with Sorcery Points (no V/S/M unless consumed)",
        },
      ]),
    ],
  },
  "*::Psychic Defenses": {
    linkedModifiers: [
      damageResistance(["Psychic"], "Psychic Resistance"),
      checkAdvantage("psychic_defenses", {
        category: "save",
        ability: "Wisdom",
        conditions: ["Charmed", "Frightened"],
      }),
    ],
  },
  "*::Revelation in Flesh": {
    activation: { bonusAction: true },
    linkedModifiers: [
      featureOptionPicker("Revelation in Flesh (Aquatic/Glistening/See Invisible/Wormlike)"),
      usesPool({ type: "class_resource", classResourceKey: "sorcery_points", classResourceAmount: 1 }, "Revelation in Flesh"),
    ],
  },
  "*::Warping Implosion": {
    activation: { action: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Warping Implosion",
        { resourceKey: "sorcery_points", resourceAmount: 5, restores: 1 },
      ),
      fxInstance("modinst_warping_implosion", FORCE_SAVE_CATALOG_ID, {
        action: true,
        effects: [
          {
            id: modId("warping_implosion"),
            kind: "force_save_control",
            attackProfile: "force_save",
            saveAbility: "STR",
            label: "Teleport 120 ft.; STR save or 3d10 Force and pulled",
          },
        ],
      }),
    ],
  },
  "*::Clockwork Spells": [alwaysPreparedSpells("Clockwork Spells")],
  "*::Manifestations of Order": [featureOptionPicker("Manifestations of Order (or random)", false)],
  "*::Restore Balance": {
    activation: { reaction: true },
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "CHA", recharges: [{ rest: "long_rest" }] },
        "Restore Balance",
      ),
      d20TestReactionPreset("restore_balance", {
        modifierMode: "subtract",
        targetScope: "target_creature",
        rangeFeet: 60,
        useReaction: true,
        dieSource: "fixed",
        fixedDie: "0",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
      }),
    ],
  },
  "*::Bastion of Law": {
    activation: { action: true },
    linkedModifiers: [
      charInstance("modinst_bastion_of_law", HEALING_DICE_POOL_CATALOG_ID, [
        {
          id: modId("bastion_of_law"),
          type: "healing_dice_pool",
          dieType: "d8",
          activation: "action",
          label: "Spend 1–5 SP: ward creature with d8s = SP spent",
        },
      ]),
    ],
  },
  "*::Trance of Order": {
    activation: { bonusAction: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Trance of Order",
        { resourceKey: "sorcery_points", resourceAmount: 5, restores: 1 },
      ),
      checkRollFloor("trance_of_order", { category: "other", below: 9, setTo: 10 }),
      elusive(),
    ],
  },
  "*::Clockwork Cavalcade": {
    activation: { action: true },
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Clockwork Cavalcade",
        { resourceKey: "sorcery_points", resourceAmount: 7, restores: 1 },
      ),
      fxInstance("modinst_clockwork_cavalcade", FEAT_MODIFIER_CATALOG.healSelf, {
        action: true,
        effects: [
          {
            id: modId("clockwork_cavalcade"),
            kind: "heal_self",
            healMode: "fixed",
            healAmount: 100,
            label: "30-ft. cube: heal 100 HP split, repair objects, dispel level 6−",
          },
        ],
      }),
    ],
  },
  "*::Shadow Spells": [alwaysPreparedSpells("Shadow Spells")],
  "*::Power of Shadow": {
    activation: { onDropToZeroHp: true },
    linkedModifiers: [
      vision(120, "darkvision", "Darkvision 120 ft."),
      vision(10, "blindsight", "Blindsight 10 ft."),
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Strength of the Grave"),
      savingThrowTriggerPreset("strength_of_grave", {
        triggerOn: "fail",
        targetScope: "self",
        saveAbility: "Charisma",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
      }),
    ],
  },
  "*::Beasts of Ill Omen": {
    linkedModifiers: [
      spellsKnownChar("beasts_ill_omen", {
        choiceGrants: [{ level: 6, count: 1 }],
        spellListClassOptions: ["Sorcerer"],
        freeCastPerLongRest: [{ spellName: "Summon Beast", count: 1 }],
        label: "Summon Beast as BA for 3 SP; shadow beast; no-concentration option",
      }),
    ],
  },
  "*::Shadow Walk": {
    activation: { bonusAction: true },
    linkedModifiers: [
      fxInstance("modinst_shadow_walk", FEAT_MODIFIER_CATALOG.movementOption, {
        bonusAction: true,
        effects: [
          {
            id: modId("shadow_walk"),
            kind: "movement_option",
            label: "Teleport up to 120 ft. between dim light/darkness",
          },
        ],
      }),
    ],
  },
  "*::Umbral Form": {
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Umbral Form",
        { resourceKey: "sorcery_points", resourceAmount: 6, restores: 1 },
      ),
      damageResistance([], "Resistance to all damage except Force and Radiant while Umbral"),
    ],
  },
  "*::Spellfire Burst": {
    linkedModifiers: [
      onCastSpellChar("spellfire_burst", {
        effect: { catalogRefId: GRANT_TEMP_HP_CATALOG_ID },
        label: "Once/turn when spending SP: Bolstering Flames or Radiant Fire",
      }),
    ],
  },
  "*::Spellfire Spells": [alwaysPreparedSpells("Spellfire Spells")],
  "*::Absorb Spells": [alwaysPreparedSpells("Counterspell")],
  "*::Honed Spellfire": {
    linkedModifiers: [
      onCastSpellChar("honed_spellfire", {
        effect: { catalogRefId: GRANT_TEMP_HP_CATALOG_ID },
        label: "Bolstering Flames +level HP; Radiant Fire 1d8",
      }),
    ],
  },
  "*::Crown of Spellfire": {
    linkedModifiers: [
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Crown of Spellfire",
        { resourceKey: "sorcery_points", resourceAmount: 5, restores: 1 },
      ),
      speedTypeAdd("fly", 60, "Fly Speed 60 ft. (hover)"),
      evasion(),
    ],
  },
  "*::Wild Magic Surge": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription: "Once per turn after casting with slot: roll d20; on 20 roll Wild Magic Surge table",
        },
        "Wild Magic Surge",
      ),
    ],
  },
  "*::Tides of Chaos": {
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Tides of Chaos"),
      checkAdvantage("tides_of_chaos", {
        category: "other",
        limitations: [requiresActiveToggleLimitation("tides_of_chaos_active")],
      }),
    ],
  },
  "*::Bend Luck": {
    activation: { reaction: true },
    linkedModifiers: [
      d20TestReactionPreset("bend_luck", {
        modifierMode: "add",
        targetScope: "target_creature",
        rangeFeet: 60,
        useReaction: true,
        spendResourceKey: "sorcery_points",
        dieSource: "fixed",
        fixedDie: "1d4",
        effectCatalogRefId: CHECK_ROLL_MODIFIER_CATALOG_ID,
      }),
    ],
  },
  "*::Controlled Chaos": {
    linkedModifiers: [
      charInstance("modinst_controlled_chaos", FEAT_MODIFIER_CATALOG.uses, [
        {
          id: modId("controlled_chaos"),
          type: "uses",
          uses: { type: "special", specialDescription: "Roll Wild Magic Surge table twice; choose result" },
        },
      ]),
    ],
  },
  "*::Tamed Surge": {
    linkedModifiers: [
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Tamed Surge"),
      charInstance("modinst_tamed_surge", RESOURCE_ABILITY_MENU_CATALOG_ID, [
        {
          id: modId("tamed_surge"),
          type: "resource_ability_menu",
          resourceKey: "sorcery_points",
          label: "Choose Wild Magic Surge effect instead of rolling (except row 97–00)",
          options: [],
        },
      ]),
    ],
  },

  // —— Artificer subclasses ——
  "*::Alchemist Spells": [alwaysPreparedSpells("Alchemist spells")],
  "Artificer::Alchemist::Tools of the Trade": {
    linkedModifiers: [
      toolsPreset("alchemist", ["Alchemist's Supplies", "Herbalism Kit"], "Alchemist tool proficiencies"),
      usesPool(
        { type: "special", specialDescription: "Potion crafting time halved (DMG crafting rules)" },
        "Potion Crafting",
      ),
    ],
  },
  "*::Experimental Elixir": {
    linkedModifiers: [
      usesPool(
        {
          type: "at_level",
          atLevelMode: "tier",
          recharges: [{ rest: "long_rest" }],
          atLevelTable: [
            { level: 3, count: 2 },
            { level: 5, count: 3 },
            { level: 9, count: 4 },
            { level: 15, count: 5 },
          ],
          restoreBySpellSlot: { minSpellLevel: 1, restores: 1 },
        },
        "Experimental Elixir",
      ),
      featureOptionPicker("Experimental Elixir effect"),
    ],
  },
  "*::Alchemical Savant": {
    linkedModifiers: [
      onCastSpellChar("alchemical_savant", {
        effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
        label: "Cast through Alchemist's Supplies: +INT to healing or Acid/Fire/Poison damage roll (min +1)",
      }),
    ],
  },
  "*::Restorative Reagents": {
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "INT", recharges: [{ rest: "long_rest" }] },
        "Restorative Reagents (Lesser Restoration)",
      ),
      spellsKnownChar("restorative_reagents", {
        spells: [],
        alwaysPrepared: true,
        label: "Cast Lesser Restoration without a slot via Alchemist's Supplies (INT uses/LR)",
      }),
    ],
  },
  "*::Chemical Mastery": {
    linkedModifiers: [
      damageResistance(["Acid", "Poison"], "Resistance to Acid and Poison damage"),
      charInstance("modinst_chemical_mastery_immune", CONDITION_IMMUNITY_CATALOG_ID, [
        { id: modId("chemical_mastery_immune"), type: "condition_immunity", conditions: ["Poisoned"] },
      ]),
      onHitTriggerPreset("alchemical_eruption", {
        effectCatalogRefId: "cat_fx_extra_damage_on_hit",
      }),
      spellsKnownChar("conjured_cauldron", {
        spells: [],
        alwaysPrepared: true,
        freeCastPerLongRest: [{ spellName: "Tasha's Bubbling Cauldron", count: 1 }],
        label: "Conjured Cauldron: cast Tasha's Bubbling Cauldron 1/Long Rest (no slot, no M)",
      }),
    ],
  },
  "*::Armorer Spells": [alwaysPreparedSpells("Armorer spells")],
  "Artificer::Armorer::Tools of the Trade": {
    linkedModifiers: [
      charInstance("modinst_armorer_heavy", "cat_char_armor_proficiencies", [
        { id: modId("armorer_heavy"), type: "armor_proficiencies", values: ["Heavy armor"] },
      ]),
      toolsPreset("armorer", ["Smith's Tools"], "Armorer tool proficiencies"),
      usesPool(
        { type: "special", specialDescription: "Armor crafting time halved" },
        "Armor Crafting",
      ),
    ],
  },
  "*::Arcane Armor": {
    activation: { action: true },
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Magic action with Smith's Tools: worn armor becomes Arcane Armor (no STR req, quick don/doff, spell focus)",
        },
        "Arcane Armor",
      ),
    ],
  },
  "*::Armor Model": {
    linkedModifiers: [featureOptionPicker("Arcane Armor model (Dreadnaught / Guardian / Infiltrator)", true)],
  },
  "*::Improved Armorer": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription: "Extra Replicate Magic Item armor plan and item; +1 to Arcane Armor model weapon attacks",
        },
        "Improved Armorer",
      ),
    ],
  },
  "*::Perfected Armor": {
    linkedModifiers: [featureOptionPicker("Perfected Armor model upgrades", true)],
  },
  "*::Artillerist Spells": [alwaysPreparedSpells("Artillerist spells")],
  "Artificer::Artillerist::Tools of the Trade": {
    linkedModifiers: [
      charInstance("modinst_artillerist_ranged", "cat_char_weapon_proficiencies", [
        {
          id: modId("artillerist_ranged"),
          type: "weapon_proficiencies",
          mode: "martial_weapons",
          values: ["Martial ranged weapons"],
        },
      ]),
      toolsPreset("artillerist", ["Woodcarver's Tools"], "Artillerist tool proficiencies"),
      usesPool(
        { type: "special", specialDescription: "Magic wand crafting time halved" },
        "Wand Crafting",
      ),
    ],
  },
  "*::Eldritch Cannon": {
    activation: { action: true },
    linkedModifiers: [
      companionPreset("Eldritch Cannon"),
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Eldritch Cannon",
        undefined,
        { minSpellLevel: 1, restores: 1 },
      ),
    ],
  },
  "*::Arcane Firearm": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Long Rest: inscribe Rod/Staff/Wand/Martial Ranged weapon as spell focus; +1d8 to one Artificer spell damage roll",
        },
        "Arcane Firearm",
      ),
    ],
  },
  "*::Explosive Cannon": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription: "Detonate cannon on damage (Reaction); cannon damage and Protector temp HP +1d8",
        },
        "Explosive Cannon",
      ),
    ],
  },
  "*::Fortified Position": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription: "Two cannons per creation; activate both with one Bonus Action; Half Cover within 10 ft.",
        },
        "Fortified Position",
      ),
      auraPreset("fortified_position", { radiusFeet: 10, halfCover: true, label: "Half Cover near Eldritch Cannon" }),
    ],
  },
  "*::Battle Smith Spells": [alwaysPreparedSpells("Battle Smith spells")],
  "Artificer::Battle Smith::Tools of the Trade": {
    linkedModifiers: [
      toolsPreset("battle_smith", ["Smith's Tools"], "Battle Smith tool proficiencies"),
      usesPool(
        { type: "special", specialDescription: "Weapon crafting time halved" },
        "Weapon Crafting",
      ),
    ],
  },
  "*::Battle Ready": { linkedModifiers: battleReadyPreset() },
  "*::Steel Defender": {
    linkedModifiers: [companionPreset("Steel Defender")],
  },
  "*::Arcane Jolt": {
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "INT", recharges: [{ rest: "long_rest" }] },
        "Arcane Jolt",
      ),
      onHitTriggerPreset("arcane_jolt", { effectCatalogRefId: "cat_fx_extra_damage_on_hit" }),
    ],
  },
  "*::Improved Defender": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription: "Arcane Jolt damage/healing 4d6; Deflect Attack deals 1d4+INT Force to attacker",
        },
        "Improved Defender",
      ),
    ],
  },
  "*::Cartographer Spells": [alwaysPreparedSpells("Cartographer spells")],
  "Artificer::Cartographer::Tools of the Trade": {
    linkedModifiers: [
      toolsPreset("cartographer", ["Calligrapher's Supplies", "Cartographer's Tools"], "Cartographer tool proficiencies"),
      usesPool(
        { type: "special", specialDescription: "Spell scroll crafting time halved" },
        "Scroll Crafting",
      ),
    ],
  },
  "*::Adventurer's Atlas": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Long Rest with Cartographer's Tools: magical maps for 1+INT creatures; +1d4 Initiative; shared positioning",
        },
        "Adventurer's Atlas",
      ),
    ],
  },
  "*::Mapping Magic": {
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "INT", recharges: [{ rest: "long_rest" }] },
        "Illuminated Cartography (Faerie Fire)",
      ),
      spellsKnownChar("illuminated_cartography", {
        spells: [],
        alwaysPrepared: true,
        label: "Cast Faerie Fire without a slot (INT uses/LR via Illuminated Cartography)",
      }),
      fxInstance("modinst_portal_jump", FEAT_MODIFIER_CATALOG.movementOption, {
        effects: [
          {
            id: modId("portal_jump"),
            kind: "movement_option",
            label: "Spend half Speed: teleport within 10 ft. of self or mapped ally within 30 ft.",
          },
        ],
      }),
    ],
  },
  "*::Guided Precision": {
    linkedModifiers: [
      onCastSpellChar("guided_precision", {
        effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
        label: "Once per turn: +INT to damage on Cartographer spell or attack vs Faerie Fire target",
      }),
      spellsKnownChar("guided_precision_conc", {
        concentrationImmuneForSpell: "Faerie Fire",
        label: "Damage cannot break Concentration on Faerie Fire",
      }),
    ],
  },
  "*::Ingenious Movement": {
    linkedModifiers: [
      fxInstance("modinst_ingenious_movement", FEAT_MODIFIER_CATALOG.movementOption, {
        reaction: true,
        effects: [
          {
            id: modId("ingenious_movement"),
            kind: "movement_option",
            label: "Flash of Genius Reaction: you or ally within 30 ft. teleports up to 30 ft.",
          },
        ],
      }),
    ],
  },
  "*::Superior Atlas": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Map holder at 0 HP: destroy map to set HP to 2×Artificer level and teleport near map holder",
        },
        "Safe Haven",
      ),
      usesPool(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Unerring Path (Find the Path)",
      ),
    ],
  },
  "*::Reanimator Spells": [alwaysPreparedSpells("Reanimator spells")],
  // Source text spells this "Reanimator's Skill Set" (two words) — kept as the canonical key.
  "*::Reanimator's Skill Set": {
    linkedModifiers: [
      usesPool(
        { type: "ability_modifier", abilityModifier: "INT", recharges: [{ rest: "long_rest" }] },
        "Jolt to Life (Spare the Dying)",
      ),
      toolsPreset("reanimator", ["Alchemist's Supplies"], "Reanimator tool proficiencies"),
    ],
  },
  "*::Reanimated Companion": {
    activation: { action: true },
    linkedModifiers: [
      companionPreset("Reanimated Companion"),
      usesPoolWithRestore(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Reanimated Companion",
        undefined,
        { minSpellLevel: 1, restores: 1 },
      ),
    ],
  },
  "*::Strange Modifications": {
    linkedModifiers: [featureOptionPicker("Strange Modifications (companion upgrade)", true)],
  },
  "*::Improved Reanimation": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription: "Death Burst 4d4; companion Necrotic damage ignores Resistance",
        },
        "Improved Reanimation",
      ),
    ],
  },
  "*::Macabre Modifications": {
    linkedModifiers: [
      featureOptionPicker("Macabre Modifications (Bloated / Gaunt / Moist)", true),
      usesPool(
        { type: "special", specialDescription: "Companion gains two Strange Modifications options" },
        "Macabre Modifications",
      ),
    ],
  },
  "*::Refined Reanimation": {
    linkedModifiers: [
      usesPool(
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Facilitated Revival (Raise Dead)",
      ),
      damageResReaction(
        "life_transfer",
        "Reaction when you or companion takes damage: gain HP equal to companion's current HP; companion dies",
      ),
      usesPool(
        { type: "special", specialDescription: "Companion gains three Strange Modifications options" },
        "Superior Modifications",
      ),
    ],
  },
  "*::Forge Adept Spells": [alwaysPreparedSpells("Forge Adept spells")],
  "Artificer::Forge Adept::Tool Proficiency": {
    linkedModifiers: [
      toolsPreset("forge_adept", ["Smith's Tools"], "Forge Adept tool proficiencies"),
      usesPool(
        { type: "special", specialDescription: "Weapon crafting time halved" },
        "Weapon Crafting",
      ),
    ],
  },
  "*::Ghaal'Shaarat": {
    activation: { action: true },
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Magic action with Smith's Tools: imbue melee weapon (+1 attack/damage, Thrown 30/120, returns after throw)",
        },
        "Ghaal'Shaarat",
      ),
    ],
  },
  "*::Runes of War": {
    linkedModifiers: [
      usesPool(
        {
          type: "ability_modifier",
          abilityModifier: "INT",
          recharges: [{ rest: "long_rest" }],
          specialDescription: "While wielding Ghaal'Shaarat: +2 weapon; Aura of War 1d4 elemental damage to allies' weapon hits",
        },
        "Runes of War",
      ),
      auraPreset("aura_of_war", {
        radiusFeet: 30,
        label: "Aura of War: allies' weapon hits deal extra 1d4 chosen elemental damage",
      }),
    ],
  },
  "*::Perfect Weapon": {
    linkedModifiers: [
      usesPool(
        {
          type: "special",
          specialDescription:
            "Ghaal'Shaarat +3; transfer weapon bonus to AC on first attack; Elemental Strike +1d6; Psychic resistance; immune Charmed/Frightened",
        },
        "Perfect Weapon",
      ),
    ],
  },
  "*::Maverick Spells": {
    linkedModifiers: [
      spellsKnownChar("maverick_cantrip", {
        choiceGrants: [{ level: 0, count: 1 }],
        spellListClassOptions: ["Artificer", "Cleric", "Wizard"],
        label: "Extra cantrip from Artificer, Cleric, or Wizard list",
      }),
      usesPool(
        {
          type: "proficiency",
          specialDescription: "Prepare additional spells equal to PB from Artificer/Cleric/Wizard lists",
        },
        "Maverick Spells",
      ),
    ],
  },
  "Artificer::Maverick::Tools Proficiency": {
    linkedModifiers: [
      toolsPreset("maverick", ["Tinker's Tools"], "Maverick tool proficiencies"),
      usesPool(
        { type: "special", specialDescription: "Magic item crafting time halved" },
        "Magic Item Crafting",
      ),
    ],
  },
  "*::Arcane Prototype": {
    linkedModifiers: [
      usesPool(
        {
          type: "at_level",
          atLevelMode: "tier",
          recharges: [{ rest: "long_rest" }],
          atLevelTable: [
            { level: 3, count: 1 },
            { level: 5, count: 3 },
            { level: 9, count: 5 },
            { level: 13, count: 7 },
            { level: 15, count: 9 },
            { level: 17, count: 11 },
            { level: 20, count: 13 },
          ],
          specialDescription: "Arcane Charges imbue prototype spell-scrolls at Long Rest",
        },
        "Arcane Charges",
      ),
      usesPool(
        {
          type: "at_level",
          atLevelMode: "tier",
          recharges: [{ rest: "long_rest" }],
          atLevelTable: [
            { level: 3, count: 1 },
            { level: 5, count: 2 },
            { level: 9, count: 3 },
            { level: 15, count: 4 },
            { level: 20, count: 5 },
          ],
          specialDescription: "Prototype max spell level scales 1–6 by Artificer level",
        },
        "Arcane Prototypes",
      ),
    ],
  },
  "*::Fine Tuning": {
    linkedModifiers: [
      onCastSpellChar("fine_tuning", {
        effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
        label: "Cast Artificer spell with Tinker's Tools: +INT to one damage roll",
      }),
    ],
  },
  "*::Work In Progress": {
    linkedModifiers: [
      usesPool(
        {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }],
          specialDescription: "Short Rest: replace one prepared spell from Artificer/Cleric/Wizard list",
        },
        "Work In Progress",
      ),
    ],
  },
  "*::Final Breakthrough": {
    linkedModifiers: [
      usesPool(
        {
          type: "fixed",
          fixedAmount: 1,
          recharges: [{ rest: "short_rest" }],
          specialDescription: "Short Rest: swap spell in a Prototype; ignore attunement class/level requirements",
        },
        "Final Breakthrough",
      ),
    ],
  },
}

/** Features still without a satisfactory common-modifier mapping. */
export const SRD_CLASS_FEATURES_WITHOUT_MODIFIER_MATCH = [
  "Hunter's Lore — marked-target info reveal (intentionally descriptive-only)",
  "Pact Magic — spell slot progression table (spellcasting system, not a modifier)",
] as const

function resolvePresetKey(
  className: string,
  subclassName: string | null,
  featureName: string,
): string | null {
  const normalized = featureName.trim().replace(/[\u2018\u2019\u201B']/g, "'")
  const keys = [
    subclassName ? `${className}::${subclassName}::${normalized}` : null,
    `${className}::${normalized}`,
    `*::${normalized}`,
  ].filter(Boolean) as string[]
  for (const key of keys) {
    if (SRD_CLASS_FEATURE_MODIFIER_PRESETS[key]) return key
  }
  if (/\bspells\b/i.test(normalized)) {
    return "*::__subclass_spells__"
  }
  return null
}

/** Apply only global `*::Feature` presets (safe for homebrew imports). */
export function enrichWildcardFeaturePresets(feature: Feature): Feature {
  const key = `*::${(feature.name ?? "").trim().replace(/[\u2018\u2019\u201B']/g, "'")}`
  const preset = SRD_CLASS_FEATURE_MODIFIER_PRESETS[key]
  if (!preset) return feature
  if (shouldSkipWildcardPreset(feature.name ?? "", feature.description ?? "", key)) {
    return feature
  }
  let merged = mergePresetModifiers(feature, preset)
  if (key === "*::Expertise") {
    merged = applyExpertisePresetOverride(merged)
  }
  if (key === "*::Blindsense") {
    merged = applyBlindsensePresetOverride(merged)
  }
  return merged
}

/** Whether a known modifier preset applies to this feature (for import reports). */
export function featureHasModifierPreset(
  className: string,
  subclassName: string | null,
  featureName: string,
): boolean {
  const key = resolvePresetKey(className, subclassName, featureName)
  return key != null && key !== "*::__subclass_spells__"
}

/** Whether the feature name looks like a subclass spell-list feature. */
export function featureLooksLikeSpellList(featureName: string): boolean {
  return /\bspells\b/i.test(featureName.trim())
}

function mergePresetModifiers(
  feature: Feature,
  preset: ClassFeatureModifierPreset,
): Feature {
  const { linkedModifiers: additions, activation: activationPatch } = normalizePreset(preset)
  if (!additions.length && !activationPatch) return feature

  let next: Feature = feature
  if (additions.length) {
    const existing = feature.linkedModifiers ?? []
    // Semantic fingerprints (same catalog + effective values), not instanceId —
    // presets use fixed ids while AI/detector paths mint new ones each import.
    // Also skip armor/tool list entries whose values are already covered.
    const toAdd = additions.filter(
      (entry) => !isModifierRedundantAgainst(entry, existing),
    )
    if (toAdd.length) {
      next = syncModifierRefs({
        ...next,
        linkedModifiers: [...existing, ...toAdd],
      })
    }
  }

  if (activationPatch) {
    next = {
      ...next,
      activation: { ...(next.activation ?? {}), ...activationPatch },
    }
  }

  if (!next.limitedUses) {
    const usesFromChars = extractUsesConfig(
      (next.linkedModifiers ?? []).flatMap((entry) => entry.characteristics ?? []),
    )
    if (usesFromChars) {
      next = { ...next, limitedUses: usesFromChars }
    }
  }

  return enrichCanonicalFeatureChoices(migrateFeatureOptionPickers(next))
}

/** Append passive/action common-modifier presets to a class or subclass feature. */
export function enrichClassFeatureWithModifierPresets(
  className: string,
  feature: Feature,
  subclassName: string | null = null,
  options?: { skipMechanicalDetection?: boolean },
): Feature {
  const key = resolvePresetKey(className, subclassName, feature.name ?? "")
  let next = feature
  if (key) {
    if (key === "*::__subclass_spells__") {
      next = mergePresetModifiers(feature, {
        linkedModifiers: [alwaysPreparedSpells(`${feature.name ?? "Subclass spells"}`)],
      })
    } else {
      next = mergePresetModifiers(feature, SRD_CLASS_FEATURE_MODIFIER_PRESETS[key])
    }
  }

  if (options?.skipMechanicalDetection) {
    return enrichWeaponMasteryFeature(migrateFeatureOptionPickers(next), className)
  }

  next = enrichFeatureWithMechanicalDetection(migrateFeatureOptionPickers(next), {
    contentKind: subclassName ? "subclass_feature" : "class_feature",
    sourceName: subclassName ?? className,
    featureName: feature.name,
    level: feature.level,
    classPrefix: className,
  })

  return enrichWeaponMasteryFeature(next, className)
}

export function enrichClassFeaturesWithModifierPresets(
  className: string,
  features: unknown,
): import("@/lib/types").Feature[] {
  if (!Array.isArray(features)) return []
  return features.map((raw) =>
    enrichClassFeatureWithModifierPresets(className, raw as import("@/lib/types").Feature),
  )
}

export function enrichSubclassFeaturesWithModifierPresets(
  parentClassName: string,
  subclassName: string,
  features: unknown,
): import("@/lib/types").Feature[] {
  if (!Array.isArray(features)) return []
  return features.map((raw) =>
    enrichClassFeatureWithModifierPresets(
      parentClassName,
      raw as import("@/lib/types").Feature,
      subclassName,
    ),
  )
}

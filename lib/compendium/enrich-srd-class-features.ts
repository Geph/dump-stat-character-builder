import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"
import { FEAT_MODIFIER_CATALOG } from "@/lib/compendium/enrich-srd-feats"
import { GRANT_FEAT_CATALOG_ID, grantFeatCharacteristic } from "@/lib/compendium/grant-feat-catalog"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { Feature, FeatureActivation, UsesConfig } from "@/lib/types"

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

type ClassFeatureModifierPreset =
  | LinkedModifierInstance[]
  | {
      linkedModifiers: LinkedModifierInstance[]
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
  abilities: ("DEX" | "CON" | "WIS")[],
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

function draconicAc(instanceKey: string): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.ac, [
    {
      id: modId(instanceKey),
      type: "ac",
      mode: "ability_modifiers",
      base: 13,
      abilities: ["DEX"],
      label: "Draconic AC (13 + DEX while unarmored)",
    },
  ])
}

function speedAdd(feet: number, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_speed_walk_${feet}`, "cat_char_speed", [
    {
      id: modId(`speed_walk_${feet}`),
      type: "speed",
      speedType: "walk",
      mode: "add",
      value: feet,
      label,
    },
  ])
}

function speedTypeAdd(
  speedType: "climb" | "swim" | "fly",
  feet: number,
  label?: string,
): LinkedModifierInstance {
  return charInstance(`modinst_speed_${speedType}_${feet}`, "cat_char_speed", [
    {
      id: modId(`speed_${speedType}_${feet}`),
      type: "speed",
      speedType,
      mode: "add",
      value: feet,
      label,
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

function damageResistance(types: string[] = [], label?: string): LinkedModifierInstance {
  const key = label ?? (types.join("_") || "pick")
  return charInstance(`modinst_res_${key}`, FEAT_MODIFIER_CATALOG.damageResistance, [
    {
      id: modId(`res_${key}`),
      type: "damage_resistance",
      damageTypes: types,
      label,
    },
  ])
}

function conditionImmunity(conditions: string[], label?: string): LinkedModifierInstance {
  return charInstance(`modinst_cond_imm_${conditions.join("_")}`, CONDITION_IMMUNITY_CATALOG_ID, [
    {
      id: modId(`cond_imm_${conditions.join("_")}`),
      type: "condition_immunity",
      conditions,
      label,
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
    category: "save" | "attack" | "initiative" | "ability" | "skill" | "other"
    ability?: string | null
    skills?: string[]
    conditions?: string[]
  },
): LinkedModifierInstance {
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
      },
    ],
  })
}

function checkBonus(
  instanceKey: string,
  options: {
    category: "save" | "attack" | "initiative" | "ability" | "skill" | "other"
    bonusConfig: import("@/lib/compendium/roll-bonus-config").RollBonusConfig
    ability?: string | null
    skills?: string[]
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
      },
    ],
  })
}

function checkRollFloor(
  instanceKey: string,
  options: {
    category: "save" | "attack" | "initiative" | "ability" | "skill" | "other"
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

function healSelfBonusAction(instanceKey: string): LinkedModifierInstance {
  return fxInstance(`modinst_${instanceKey}`, FEAT_MODIFIER_CATALOG.healSelf, {
    bonusAction: true,
    effects: [
      {
        id: modId(instanceKey),
        kind: "heal_self",
        healMode: "dice",
        healDiceCount: 1,
        healDieType: "d6",
        label: "Martial Arts die",
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
  return fxInstance("modinst_evasion", DAMAGE_REDUCTION_CATALOG_ID, {
    effects: [
      {
        id: modId("evasion"),
        kind: "damage_reduction",
        mitigation: "reduction",
        defensiveSaveScope: true,
        checkCategory: "save",
        checkAbility: "Dexterity",
        defensiveSaveSuccess: "none",
      },
    ],
  })
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
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, AURA_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "aura",
      radiusFeet: config.radiusFeet,
      affectsSelf: true,
      affectsAllies: true,
      halfCover: config.halfCover ?? false,
      saveBonusConfig: config.saveAbility
        ? { mode: "ability_modifier", ability: config.saveAbility }
        : null,
      radiusByLevel: config.radiusAtLevel
        ? [{ level: config.radiusAtLevel.level, mode: "fixed", fixed: config.radiusAtLevel.radiusFeet }]
        : [],
      label: config.label,
    },
  ])
}

function featureOptionPicker(category: string, swappableOnRest = false): LinkedModifierInstance {
  const key = category.replace(/[^a-z0-9]+/gi, "_").toLowerCase()
  return charInstance(`modinst_feature_opt_${key}`, FEATURE_OPTION_PICKER_CATALOG_ID, [
    {
      id: modId(`feature_opt_${key}`),
      type: "feature_option_picker",
      category,
      choiceCount: 1,
      swappableOnRest,
      label: category,
    },
  ])
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
    effectCatalogRefId: string
    spendResourceKey?: string
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${instanceKey}`, FAILED_ROLL_TRIGGER_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "failed_roll_trigger",
      rollKind: config.rollKind,
      targetScope: "self",
      spendResourceKey: config.spendResourceKey ?? null,
      spendResourceAmount: config.spendResourceKey ? 1 : null,
      effect: { catalogRefId: config.effectCatalogRefId },
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

function intimidatingPresence(): LinkedModifierInstance {
  return fxInstance("modinst_intimidating_presence", FORCE_SAVE_CATALOG_ID, {
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
  })
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
    {
      id: modId("fast_hands"),
      type: "feature_option_picker",
      category: "Fast Hands",
      choiceCount: 1,
      options: [
        { name: "Sleight of Hand" },
        { name: "Use Object" },
        { name: "Thieves' Tools" },
      ],
    },
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

function mysticArcanumPreset(): LinkedModifierInstance[] {
  return [
    usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Mystic Arcanum"),
    charInstance("modinst_mystic_arcanum", FEAT_MODIFIER_CATALOG.spellsKnown, [
      {
        id: modId("mystic_arcanum"),
        type: "spells_known",
        spells: [],
        choiceGrants: [
          { level: 6, count: 1 },
          { level: 7, count: 1 },
          { level: 8, count: 1 },
          { level: 9, count: 1 },
        ],
        spellListClassOptions: ["Warlock"],
        label: "Mystic Arcanum",
      },
    ]),
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
  riders: { name: string; costDice?: string; description?: string }[],
  maxRidersPerUse = 1,
  appliesTo?: string,
): LinkedModifierInstance {
  return charInstance(`modinst_riders_${instanceKey}`, BONUS_DAMAGE_RIDERS_CATALOG_ID, [
    {
      id: modId(instanceKey),
      type: "bonus_damage_riders",
      riders: riders.map((rider) => ({
        name: rider.name,
        costDice: rider.costDice ?? null,
        description: rider.description ?? null,
      })),
      maxRidersPerUse,
      appliesTo: appliesTo ?? null,
    },
  ])
}

function normalizePreset(preset: ClassFeatureModifierPreset): {
  linkedModifiers: LinkedModifierInstance[]
  activation?: Partial<FeatureActivation>
} {
  if (Array.isArray(preset)) return { linkedModifiers: preset }
  return preset
}

const CUNNING_STRIKE_RIDERS = [
  { name: "Poison", costDice: "1d6", description: "Target makes CON save or is Poisoned" },
  { name: "Trip", costDice: "1d6", description: "Target makes DEX save or is Prone" },
  { name: "Withdraw", costDice: "1d6", description: "Move half speed without opportunity attacks" },
]

const BRUTAL_STRIKE_RIDERS = [
  { name: "Forceful Blow", costDice: "1d10", description: "Push target 15 ft." },
  { name: "Staggering Blow", costDice: "1d10", description: "Target has Disadvantage on next save" },
]

const ALL_SAVES = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]

/** `${Class}::${Feature}` or `*::${Feature}` for shared presets. */
const SRD_CLASS_FEATURE_MODIFIER_PRESETS: Record<string, ClassFeatureModifierPreset> = {
  "Barbarian::Unarmored Defense": [unarmoredDefense("barb_uac", ["DEX", "CON"], "Unarmored Defense")],
  "Monk::Unarmored Defense": [unarmoredDefense("monk_uac", ["DEX", "WIS"], "Unarmored Defense")],
  "*::Danger Sense": [checkAdvantage("danger_sense", { category: "save", ability: "Dexterity" })],
  "*::Reckless Attack": [
    checkAdvantage("reckless_attack", { category: "attack", ability: "Strength" }),
  ],
  "*::Primal Knowledge": [skillChoice(1, "Primal Knowledge skill")],
  "*::Fast Movement": [speedAdd(10, "+10 ft. walk (no Heavy armor)")],
  "*::Unarmored Movement": [speedAdd(10, "+10 ft. walk (unarmored)")],
  "*::Feral Instinct": [checkAdvantage("feral_instinct", { category: "initiative" })],
  "*::Mindless Rage": [
    conditionImmunity(["Charmed", "Frightened"], "While Rage is active"),
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
  "*::Bonus Proficiencies": [skillChoice(3, "Bonus skill proficiencies")],
  "*::Jack of All Trades": [
    checkBonus("jack_of_all_trades", {
      category: "ability",
      bonusConfig: { mode: "proficiency", multiplier: 0.5 },
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
  "*::Improved Critical": [criticalHitRange(19, "Critical hit on 19–20")],
  "*::Superior Critical": [criticalHitRange(18, "Critical hit on 18–20")],
  "*::Remarkable Athlete": [
    checkAdvantage("remarkable_athlete_init", { category: "initiative" }),
    checkAdvantage("remarkable_athlete_athletics", {
      category: "skill",
      skills: ["Athletics"],
    }),
  ],
  "*::Heroic Warrior": [gainInspiration()],
  "*::Additional Fighting Style": [grantFeat(["Fighting Style"], "Fighting Style feat")],
  "*::Survivor": [checkAdvantage("survivor_defy_death", { category: "other" })],
  "Sorcerer::Draconic Sorcery::Draconic Resilience": [
    hitPointsPerLevel(3, "+3 HP per Sorcerer level"),
    draconicAc("draconic_resilience_ac"),
  ],
  "*::Elemental Affinity": [damageResistance([], "Chosen dragon damage type")],
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
    speedAdd(10, "+10 ft. walk (no Heavy armor)"),
    speedTypeAdd("climb", 0, "Climb Speed equal to Speed"),
    speedTypeAdd("swim", 0, "Swim Speed equal to Speed"),
  ],
  "*::Feral Senses": [vision(30, "blindsight", "Blindsight 30 ft.")],
  "*::Precise Hunter": [
    checkAdvantage("precise_hunter", { category: "attack", ability: null }),
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
  "*::Wholeness of Body": [healSelfBonusAction("wholeness_of_body")],
  "*::Dragon Wings": [
    speedTypeAdd("fly", 60, "Fly Speed 60 ft."),
    usesPool({ type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Dragon Wings"),
  ],
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
  "*::Holy Nimbus": [
    auraPreset("holy_nimbus", {
      radiusFeet: 30,
      halfCover: true,
      label: "Holy Nimbus",
    }),
  ],
  "*::Paladin's Smite": [alwaysPreparedSpells("Divine Smite")],
  "*::Favored Enemy": [alwaysPreparedSpells("Hunter's Mark")],
  "*::Faithful Steed": [alwaysPreparedSpells("Find Steed")],
  "*::Life Domain Spells": [alwaysPreparedSpells("Life Domain spells")],
  "*::Oath of Devotion Spells": [alwaysPreparedSpells("Oath of Devotion spells")],
  "*::Fiend Spells": [alwaysPreparedSpells("Fiend Patron spells")],
  "*::Draconic Spells": [alwaysPreparedSpells("Draconic Sorcery spells")],
  "*::Circle of the Land Spells": [alwaysPreparedSpells("Circle of the Land spells")],
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
  "*::Font of Magic": {
    linkedModifiers: [fontOfMagicMenu()],
  },
  "*::Mystic Arcanum": {
    linkedModifiers: mysticArcanumPreset(),
  },
  "*::Sorcery Incarnate": {
    linkedModifiers: [
      fxInstance("modinst_sorcery_incarnate", SELF_BUFF_CASTER_CATALOG_ID, {
        bonusAction: true,
        effects: [{ id: modId("sorcery_incarnate"), kind: "self_buff_caster", casterBuffLabel: "Sorcery Incarnate" }],
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
        ...CUNNING_STRIKE_RIDERS,
        { name: "Daze", costDice: "2d6", description: "Target makes CON save or has Disadvantage on next attack" },
        { name: "Knock Out", costDice: "6d6", description: "Target makes CON save or falls Unconscious" },
      ],
      2,
      "Sneak Attack",
    ),
  ],
  "*::Cunning Strike": [
    bonusRidersPreset("cunning_strike", CUNNING_STRIKE_RIDERS, 1, "Sneak Attack"),
  ],
  "*::Improved Cunning Strike": [
    bonusRidersPreset("improved_cunning_strike", CUNNING_STRIKE_RIDERS, 2, "Sneak Attack"),
  ],
  "*::Brutal Strike": [
    bonusRidersPreset("brutal_strike", BRUTAL_STRIKE_RIDERS, 1, "Reckless Attack"),
  ],
  "*::Improved Brutal Strike": [
    bonusRidersPreset("improved_brutal_strike", BRUTAL_STRIKE_RIDERS, 2, "Reckless Attack"),
  ],
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
    linkedModifiers: [intimidatingPresence()],
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
        [{ name: "Stealth Attack", costDice: "1d6", description: "Hide as part of Cunning Strike attack" }],
        1,
        "Sneak Attack",
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
      charInstance("modinst_magical_secrets", FEAT_MODIFIER_CATALOG.spellsKnown, [
        {
          id: modId("magical_secrets"),
          type: "spells_known",
          spells: [],
          choiceGrants: [{ level: 1, count: 2, crossClassAnyList: true }],
          playerPicksSpellList: true,
          spellListClassOptions: ["Cleric", "Druid", "Wizard"],
        },
      ]),
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
      charInstance("modinst_empowered_evocation", ON_CAST_SPELL_TRIGGER_CATALOG_ID, [
        {
          id: modId("empowered_evocation"),
          type: "on_cast_spell_trigger",
          spellSchool: "Evocation",
          effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
        },
      ]),
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
  "*::Evocation Savant": {
    linkedModifiers: [
      spellsKnownChar("evocation_savant", {
        choiceGrants: [
          { level: 1, count: 2 },
          { level: 2, count: 2 },
        ],
        spellListClassOptions: ["Wizard"],
        label: "Evocation spells (≤2nd level) added to spellbook at half time/gold",
      }),
    ],
  },
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
  "*::Improved Elemental Fury": {
    linkedModifiers: [
      featureOptionPicker("Improved Elemental Fury", false),
      onCastSpellChar("elemental_fury_potent", {
        spellSchool: "Evocation",
        effect: { catalogRefId: "cat_fx_bonus_damage_by_level" },
        label: "Potent Spellcasting: add WIS to Evocation damage",
      }),
    ],
  },

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
      onHitTriggerPreset("quivering_palm", {
        appliesTo: "Unarmed Strike",
        spendResourceKey: "focus_points",
        spendResourceAmount: 4,
        effectCatalogRefId: FORCE_SAVE_CATALOG_ID,
      }),
      usesPool({ type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Quivering Palm kill"),
    ],
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
  "*::Improved Blessed Strikes": {
    linkedModifiers: [
      bonusRidersPreset(
        "improved_blessed_strikes",
        [
          { name: "Divine Strike (upgraded)", costDice: "1d8", description: "Extra radiant damage on weapon attack" },
          { name: "Potent Spellcasting (upgraded)", costDice: "0", description: "Add WIS to Cleric cantrip damage" },
        ],
        1,
        "Blessed Strikes",
      ),
    ],
  },

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
  const normalized = featureName.trim()
  const keys = [
    subclassName ? `${className}::${subclassName}::${normalized}` : null,
    `${className}::${normalized}`,
    `*::${normalized}`,
  ].filter(Boolean) as string[]
  for (const key of keys) {
    if (SRD_CLASS_FEATURE_MODIFIER_PRESETS[key]) return key
  }
  return null
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
    const existingInstanceIds = new Set(existing.map((entry) => entry.instanceId))
    const toAdd = additions.filter((entry) => !existingInstanceIds.has(entry.instanceId))
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

  return next
}

/** Append passive/action common-modifier presets to a class or subclass feature. */
export function enrichClassFeatureWithModifierPresets(
  className: string,
  feature: Feature,
  subclassName: string | null = null,
): Feature {
  const key = resolvePresetKey(className, subclassName, feature.name ?? "")
  if (!key) return feature
  return mergePresetModifiers(feature, SRD_CLASS_FEATURE_MODIFIER_PRESETS[key])
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

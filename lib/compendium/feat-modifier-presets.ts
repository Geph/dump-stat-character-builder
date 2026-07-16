import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import {
  charInstance,
  fxInstance,
  modId,
  usesInstance,
} from "@/lib/compendium/modifier-instance-builders"
import { SRD_ARTISANS_TOOLS, SRD_MUSICAL_INSTRUMENTS } from "@/lib/compendium/srd-tool-names"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { FeatureActivation, FeatureEffect, UsesConfig } from "@/lib/types"

/** Catalog entry ids from buildDefaultModifierCatalog (cat_char_* / cat_fx_*). */
export const FEAT_MODIFIER_CATALOG = {
  abilityScores: "cat_char_ability_scores",
  skills: "cat_char_skills",
  toolProficiencies: "cat_char_tool_proficiencies",
  savingThrows: "cat_char_saving_throws",
  armorProficiencies: "cat_char_armor_proficiencies",
  weaponProficiencies: "cat_char_weapon_proficiencies",
  initiative: "cat_char_initiative",
  ac: "cat_char_ac",
  hitPoints: "cat_char_hit_points",
  speed: "cat_char_speed",
  attackRollModifiers: "cat_char_attack_roll_modifiers",
  damageRollModifiers: "cat_char_damage_roll_modifiers",
  unarmedStrikeDamage: "cat_char_unarmed_strike_damage",
  damageResistance: "cat_char_damage_resistance",
  vision: "cat_char_vision",
  spellsKnown: "cat_char_spells_known",
  spellcastingAbility: "cat_char_spellcasting_ability",
  spellHealingModifier: "cat_char_spell_healing_modifier",
  uses: "cat_char_uses",
  movementEffects: "cat_char_movement_effects",
  telepathy: "cat_char_telepathy",
  d20TestReaction: "cat_char_d20_test_reaction",
  failedRollTrigger: "cat_char_failed_roll_trigger",
  damageHalvingReaction: "cat_char_damage_halving_reaction",
  turnStartTrigger: "cat_char_turn_start_trigger",
  healSelf: "cat_fx_heal_self",
  riderDamage: "cat_fx_rider_damage",
  checkAdvantage: "cat_fx_check_roll_modifier",
  checkBonus: "cat_fx_check_roll_modifier",
  checkRollModifier: "cat_fx_check_roll_modifier",
  extraAction: "cat_fx_extra_action",
  movementOption: "cat_fx_movement_option",
  selfBuffCaster: "cat_fx_self_buff_caster",
  damageReduction: "cat_fx_damage_reduction",
  grantTempHp: "cat_fx_grant_temp_hp",
  bonusActionAttack: "cat_fx_bonus_action_attack",
  reactionAttack: "cat_fx_reaction_attack",
  imposeDisadvantage: "cat_fx_impose_disadvantage",
  modifyCreature: "cat_fx_modify_creature",
  forceSave: "cat_fx_force_save_control",
  castSpell: "cat_fx_cast_spell",
  onHitTrigger: "cat_char_on_hit_trigger",
  savingThrowTrigger: "cat_char_saving_throw_trigger",
  healingDicePool: "cat_char_healing_dice_pool",
  specialAttack: "cat_char_special_attack",
  equipmentAndMagicItems: "cat_char_equipment_and_magic_items",
} as const

export type FeatModifierPreset = {
  linkedModifiers?: LinkedModifierInstance[]
  repeatable?: boolean
  isChoice?: boolean
  choices?: import("@/lib/types").FeatureChoice
}

export function asiPool(instanceId: string, points = 2, label?: string): LinkedModifierInstance {
  return charInstance(instanceId, FEAT_MODIFIER_CATALOG.abilityScores, [
    {
      id: modId(`${instanceId}_asi`),
      type: "ability_scores",
      mode: "asi_pool",
      points,
      bonuses: {},
      label,
    },
  ])
}

export function asiOne(key: string, label: string): LinkedModifierInstance {
  return asiPool(`modinst_${key}`, 1, label)
}

export function toolsChoice(
  key: string,
  count: number,
  choiceOptions: readonly string[],
  label: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.toolProficiencies, [
    {
      id: modId(key),
      type: "tool_proficiencies",
      values: [],
      choiceCount: count,
      choiceOptions: [...choiceOptions],
      label,
    },
  ])
}

export function skillChoice(
  key: string,
  config: {
    count?: number
    allowAnySkill?: boolean
    entries?: { skill: string; expertise: boolean }[]
    grantExpertise?: boolean
    sharedChoiceGroup?: string
    sharedChoiceCount?: number
    label?: string
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.skills, [
    {
      id: modId(key),
      type: "skills",
      entries: config.entries ?? [],
      allowAnySkill: config.allowAnySkill ?? false,
      choiceCount: config.sharedChoiceGroup ? 0 : (config.count ?? null),
      grantExpertise: config.grantExpertise ?? false,
      sharedChoiceGroup: config.sharedChoiceGroup,
      sharedChoiceCount: config.sharedChoiceCount,
      label: config.label,
    },
  ])
}

export function armorProf(key: string, values: string[], label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.armorProficiencies, [
    { id: modId(key), type: "armor_proficiencies", values, label },
  ])
}

export function weaponProf(
  key: string,
  mode: "martial_weapons" | "specific",
  values: string[] = [],
  label?: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.weaponProficiencies, [
    { id: modId(key), type: "weapon_proficiencies", mode, values, label },
  ])
}

export function savingThrowProf(key: string, values: string[], label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.savingThrows, [
    { id: modId(key), type: "saving_throws", values, label },
  ])
}

export function hitPerLevel(key: string, value: number, label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.hitPoints, [
    { id: modId(key), type: "hit_points", mode: "per_level", value, label },
  ])
}

export function speedMod(
  key: string,
  speedType: "walk" | "climb" | "fly" | "swim",
  mode: "add" | "equal_to_walk",
  value: number,
  label: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.speed, [
    { id: modId(key), type: "speed", speedType, mode, value, label },
  ])
}

export function visionMod(
  key: string,
  visionType: "darkvision" | "blindsight" | "truesight" | "tremorsense",
  rangeFeet: number,
  label: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.vision, [
    { id: modId(key), type: "vision", visionType, rangeFeet, label },
  ])
}

export function acBonus(
  key: string,
  config: {
    flatBonus: number
    requiresArmor?: boolean
    label?: string
  },
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.ac, [
    {
      id: modId(key),
      type: "ac",
      mode: "flat_bonus",
      flatBonus: config.flatBonus,
      requiresArmor: config.requiresArmor ?? false,
      label: config.label,
    },
  ])
}

export function attackMod(
  key: string,
  entries: import("@/lib/compendium/characteristic-modifiers").RollModifierEntry[],
  label: string,
  extras?: Partial<import("@/lib/compendium/characteristic-modifiers").AttackRollModifiersCharacteristic>,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.attackRollModifiers, [
    {
      id: modId(key),
      type: "attack_roll_modifiers",
      entries,
      label,
      ...extras,
    },
  ])
}

export function damageMod(
  key: string,
  entries: import("@/lib/compendium/characteristic-modifiers").RollModifierEntry[],
  label: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.damageRollModifiers, [
    { id: modId(key), type: "damage_roll_modifiers", entries, label },
  ])
}

export function unarmedDie(key: string, die: "1d4" | "1d6" | "1d8", label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.unarmedStrikeDamage, [
    { id: modId(key), type: "unarmed_strike_damage", die, label },
  ])
}

export function spellsKnown(
  key: string,
  config: Partial<Extract<CharacteristicModifier, { type: "spells_known" }>>,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.spellsKnown, [
    {
      id: modId(key),
      type: "spells_known",
      spells: [],
      choiceGrants: [],
      spellListClassOptions: [],
      ...config,
    },
  ])
}

export function spellAbility(
  key: string,
  label: string,
  abilityOptions?: import("@/lib/compendium/characteristic-modifiers").AbilityScoreKey[],
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.spellcastingAbility, [
    {
      id: modId(key),
      type: "spellcasting_ability",
      ability: abilityOptions?.[0] ?? "intelligence",
      ...(abilityOptions?.length ? { abilityOptions } : {}),
      label,
    },
  ])
}

export function damageResistanceFixed(
  key: string,
  damageTypes: string[],
  label: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.damageResistance, [
    {
      id: modId(key),
      type: "damage_resistance",
      damageTypes,
      label,
    },
  ])
}

export function spellHealing(
  key: string,
  config: Partial<Extract<CharacteristicModifier, { type: "spell_healing_modifier" }>>,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.spellHealingModifier, [
    { id: modId(key), type: "spell_healing_modifier", ...config },
  ])
}

export function uses(key: string, usesConfig: UsesConfig, label: string): LinkedModifierInstance {
  return usesInstance(`modinst_${key}`, usesConfig, label)
}

export function checkFx(
  key: string,
  effect: Omit<FeatureEffect, "id">,
  activation: Partial<FeatureActivation> = {},
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.checkRollModifier, {
    ...activation,
    effects: [{ ...effect, id: modId(key) }],
  })
}

export function movementFx(
  key: string,
  effect: Omit<FeatureEffect, "id">,
  activation: Partial<FeatureActivation> = {},
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.movementOption, {
    ...activation,
    effects: [{ ...effect, id: modId(key) }],
  })
}

export function movementEffectsPassive(
  key: string,
  flags: Partial<Extract<CharacteristicModifier, { type: "movement_effects" }>>,
  label: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.movementEffects, [
    {
      id: modId(key),
      type: "movement_effects",
      movementDash: false,
      movementDisengage: false,
      movementHide: false,
      movementMoveThroughLargerSpaces: false,
      movementHideBehindLargerCreatures: false,
      ...flags,
      label,
    },
  ])
}

export function telepathyMod(key: string, rangeFeet: number, label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.telepathy, [
    { id: modId(key), type: "telepathy", rangeFeet, canInitiate: true, label },
  ])
}

export function damageResistancePick(key: string, label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.damageResistance, [
    {
      id: modId(key),
      type: "damage_resistance",
      damageTypes: [],
      label,
    },
  ])
}

export function d20TestReaction(
  key: string,
  config: Partial<Extract<CharacteristicModifier, { type: "d20_test_reaction" }>>,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.d20TestReaction, [
    {
      id: modId(key),
      type: "d20_test_reaction",
      modifierMode: "add",
      targetScope: "self",
      ...config,
    },
  ])
}

export function failedRollTrigger(
  key: string,
  config: Partial<Extract<CharacteristicModifier, { type: "failed_roll_trigger" }>>,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.failedRollTrigger, [
    {
      id: modId(key),
      type: "failed_roll_trigger",
      triggerOn: "fail",
      rollKind: "save",
      targetScope: "self",
      ...config,
    },
  ])
}

export function damageHalvingReaction(key: string, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.damageHalvingReaction, [
    {
      id: modId(key),
      type: "damage_halving_reaction",
      useReaction: true,
      label,
    },
  ])
}

export function turnStartFx(
  key: string,
  effect: FeatureEffect,
  config?: Partial<Extract<CharacteristicModifier, { type: "turn_start_trigger" }>>,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.turnStartTrigger, [
    {
      id: modId(key),
      type: "turn_start_trigger",
      effect: { catalogRefId: FEAT_MODIFIER_CATALOG.riderDamage },
      ...config,
    },
  ])
}

export function riderFx(
  key: string,
  config: { bonusDice?: string },
  activation: Partial<FeatureActivation> = { action: true },
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.riderDamage, {
    ...activation,
    effects: [
      {
        id: modId(key),
        kind: "rider_damage",
        bonusDice: config.bonusDice,
      },
    ],
  })
}

export function damageReductionFx(
  key: string,
  activation: Partial<FeatureActivation> = { reaction: true },
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.damageReduction, {
    ...activation,
    effects: [
      {
        id: modId(key),
        kind: "damage_reduction",
        mitigation: "reduction",
      },
    ],
  })
}

export function grantTempHpFx(
  key: string,
  activation: Partial<FeatureActivation> = {},
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.grantTempHp, {
    ...activation,
    effects: [{ id: modId(key), kind: "grant_temp_hp" }],
  })
}

export function bonusActionAttackFx(key: string): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.bonusActionAttack, {
    bonusAction: true,
    effects: [{ id: modId(key), kind: "bonus_action_attack" }],
  })
}

export function reactionAttackFx(key: string): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.reactionAttack, {
    reaction: true,
    effects: [{ id: modId(key), kind: "reaction_attack" }],
  })
}

export function imposeDisadvantageFx(key: string): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.imposeDisadvantage, {
    reaction: true,
    effects: [{ id: modId(key), kind: "impose_disadvantage" }],
  })
}

export function modifyCreatureFx(
  key: string,
  activation: Partial<FeatureActivation> = { reaction: true },
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.modifyCreature, {
    ...activation,
    effects: [{ id: modId(key), kind: "modify_creature" }],
  })
}

export function castSpellFx(
  key: string,
  config: Partial<FeatureEffect>,
  activation: Partial<FeatureActivation> = { reaction: true },
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.castSpell, {
    ...activation,
    effects: [
      {
        kind: "cast_spell",
        castSpellCastingTime: "action",
        castSpellLevel: 0,
        castSpellListClasses: [],
        ...config,
        id: modId(key),
      },
    ],
  })
}

export function feyShadowTouchedSpells(
  key: string,
  schoolLabel: string,
  fixedSpell: string,
  label: string,
): LinkedModifierInstance[] {
  return [
    spellsKnown(`${key}_pick`, {
      choiceGrants: [{ level: 1, count: 1 }],
      alwaysPrepared: true,
      label: `${label}: choose level-1 ${schoolLabel} spell`,
    }),
    spellsKnown(`${key}_fixed`, {
      spells: [{ spellId: fixedSpell, alwaysPrepared: true }],
      label: `${label}: ${fixedSpell} always prepared`,
    }),
    uses(`${key}_free`, { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, `Free cast each spell without a slot (1/Long Rest each)`),
    spellAbility(`${key}_ability`, "Spellcasting ability: ability increased by this feat"),
  ]
}

export function onHitTrigger(
  key: string,
  config: Partial<Extract<CharacteristicModifier, { type: "on_hit_trigger" }>>,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.onHitTrigger, [
    {
      id: modId(key),
      type: "on_hit_trigger",
      oncePerTurn: true,
      ...config,
    },
  ])
}

export function savingThrowTrigger(
  key: string,
  config: Partial<Extract<CharacteristicModifier, { type: "saving_throw_trigger" }>>,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.savingThrowTrigger, [
    {
      id: modId(key),
      type: "saving_throw_trigger",
      triggerOn: "fail",
      targetScope: "self",
      ...config,
    },
  ])
}

export function damageResistanceChoice(
  key: string,
  choiceOptions: string[],
  label: string,
  choiceCount = 1,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.damageResistance, [
    {
      id: modId(key),
      type: "damage_resistance",
      damageTypes: [],
      choiceCount,
      choiceOptions,
      label,
    },
  ])
}

export function savingThrowChoice(key: string, label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.savingThrows, [
    {
      id: modId(key),
      type: "saving_throws",
      values: ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"],
      choiceCount: 1,
      label,
    },
  ])
}

export function toolProf(key: string, tool: string, label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.toolProficiencies, [
    { id: modId(key), type: "tool_proficiencies", values: [tool], label },
  ])
}

export function healingDicePool(
  key: string,
  config: Partial<Extract<CharacteristicModifier, { type: "healing_dice_pool" }>>,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.healingDicePool, [
    {
      id: modId(key),
      type: "healing_dice_pool",
      dieType: "d8",
      activation: "bonus_action",
      ...config,
    },
  ])
}

export function forceSaveFx(
  key: string,
  activation: Partial<FeatureActivation> = { action: true },
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.forceSave, {
    ...activation,
    effects: [{ id: modId(key), kind: "force_save_control" }],
  })
}

/** SRD feat name → common modifier presets. */
export const FEAT_MODIFIER_PRESETS: Record<string, FeatModifierPreset> = {
  Alert: {
    linkedModifiers: [
      checkFx(
        "alert_initiative",
        {
          kind: "check_bonus",
          checkCategory: "initiative",
          bonusConfig: { mode: "proficiency" },
        },
        {},
      ),
    ],
  },

  "Magic Initiate": {
    repeatable: true,
    linkedModifiers: [
      spellsKnown("magic_initiate_spells", {
        choiceGrants: [
          { level: 0, count: 2 },
          { level: 1, count: 1 },
        ],
        spellListClassOptions: ["Cleric", "Druid", "Wizard"],
        playerPicksSpellList: true,
        label: "Magic Initiate spells",
      }),
      spellAbility("magic_initiate_ability", "Spellcasting ability: INT, WIS, or CHA (chosen with feat)"),
      uses(
        "magic_initiate_cast",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Cast chosen level-1 spell once without a slot",
      ),
    ],
  },

  "Savage Attacker": {
    linkedModifiers: [
      riderFx("savage_attacker", { bonusDice: "reroll weapon damage once per turn" }),
    ],
  },

  Skilled: {
    repeatable: true,
    linkedModifiers: [
      skillChoice("skilled_skills", {
        allowAnySkill: true,
        sharedChoiceGroup: "skilled_proficiencies",
        sharedChoiceCount: 3,
        label: "Choose 3 skills or tools",
      }),
      charInstance("modinst_skilled_tools", FEAT_MODIFIER_CATALOG.toolProficiencies, [
        {
          id: modId("skilled_tools"),
          type: "tool_proficiencies",
          values: [],
          choiceCount: 0,
          sharedChoiceGroup: "skilled_proficiencies",
          sharedChoiceCount: 3,
        },
      ]),
    ],
  },

  "Ability Score Improvement": {
    repeatable: true,
    linkedModifiers: [asiPool("modinst_asi", 2, "SRD ASI: +2 to one ability or +1 to two")],
  },

  Grappler: {
    linkedModifiers: [
      asiPool("modinst_grappler_asi", 1, "+1 Strength or Dexterity"),
      onHitTrigger("grappler_punch_grab", {
        appliesTo: "unarmed",
        label: "Punch and Grab: damage + grapple on unarmed hit (once/turn)",
      }),
      checkFx(
        "grappler_advantage",
        {
          kind: "check_advantage",
          checkCategory: "attack",
        },
        {},
      ),
      movementEffectsPassive(
        "grappler_fast_wrestler",
        {},
        "Fast Wrestler: no extra movement dragging grappled creature your size or smaller",
      ),
    ],
  },

  Archery: {
    linkedModifiers: [
      attackMod("archery", [{ bonus: 2, target: "ranged" }], "+2 to ranged weapon attack rolls"),
    ],
  },

  Defense: {
    linkedModifiers: [
      acBonus("defense", { flatBonus: 1, requiresArmor: true, label: "+1 AC while wearing armor" }),
    ],
  },

  "Great Weapon Fighting": {
    linkedModifiers: [
      damageMod(
        "gwf",
        [{ bonus: 0, target: "custom", customTarget: "Two-handed/versatile melee: treat 1–2 on damage dice as 3" }],
        "Great Weapon Fighting",
      ),
    ],
  },

  "Two-Weapon Fighting": {
    linkedModifiers: [
      damageMod(
        "twf",
        [{ bonus: 0, target: "custom", customTarget: "Light weapon bonus-action attack", grantAbilityModifierWhenMissing: true }],
        "Add ability modifier to light weapon bonus-action damage",
      ),
    ],
  },

  "Boon of Combat Prowess": {
    linkedModifiers: [
      asiOne("boon_combat_asi", "+1 to one ability score (max 30)"),
      checkFx("boon_combat_hit", { kind: "extra_action" }),
    ],
  },
  "Boon of Dimensional Travel": {
    linkedModifiers: [
      asiOne("boon_dim_asi", "+1 to one ability score (max 30)"),
      movementFx("boon_dim_travel", { kind: "movement_option" }),
    ],
  },
  "Boon of Fate": {
    linkedModifiers: [
      asiOne("boon_fate_asi", "+1 to one ability score (max 30)"),
      checkFx("boon_fate", { kind: "check_bonus", checkCategory: "other" }, { reaction: true }),
      uses(
        "boon_fate_uses",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] },
        "Recharges when you roll Initiative or finish a rest",
      ),
    ],
  },
  "Boon of Irresistible Offense": {
    linkedModifiers: [
      asiOne("boon_offense_asi", "+1 Strength or Dexterity (max 30)"),
      damageMod(
        "boon_offense_resist",
        [{ bonus: 0, target: "custom", customTarget: "B/P/S damage ignores resistance" }],
        "Overcome Defenses",
      ),
      riderFx("boon_offense_crit", { bonusDice: "Overwhelming Strike: extra damage on nat 20" }),
    ],
  },
  "Boon of Spell Recall": {
    linkedModifiers: [
      asiOne("boon_spell_asi", "+1 Intelligence, Wisdom, or Charisma (max 30)"),
      checkFx("boon_spell_recall", { kind: "self_buff_caster" }),
    ],
  },
  "Boon of the Night Spirit": {
    linkedModifiers: [
      asiOne("boon_night_asi", "+1 to one ability score (max 30)"),
      checkFx("boon_night_invis", { kind: "self_buff_caster" }, { bonusAction: true }),
      damageResistancePick("boon_night_resist", "Shadowy Form: Resistance to most damage in dim light/darkness"),
    ],
  },
  "Boon of Truesight": {
    linkedModifiers: [
      asiOne("boon_truesight_asi", "+1 to one ability score (max 30)"),
      visionMod("boon_truesight", "truesight", 60, "Truesight 60 ft."),
    ],
  },
}

/** @deprecated Use FEAT_MODIFIER_PRESETS */
export const SRD_FEAT_MODIFIER_PRESETS = FEAT_MODIFIER_PRESETS

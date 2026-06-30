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
} as const

export type FeatModifierPreset = {
  linkedModifiers?: LinkedModifierInstance[]
  repeatable?: boolean
  isChoice?: boolean
  choices?: import("@/lib/types").FeatureChoice
}

function asiPool(instanceId: string, points = 2, label?: string): LinkedModifierInstance {
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

function asiOne(key: string, label: string): LinkedModifierInstance {
  return asiPool(`modinst_${key}`, 1, label)
}

function toolsChoice(
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

function skillChoice(
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

function armorProf(key: string, values: string[], label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.armorProficiencies, [
    { id: modId(key), type: "armor_proficiencies", values, label },
  ])
}

function weaponProf(
  key: string,
  mode: "martial_weapons" | "specific",
  values: string[] = [],
  label?: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.weaponProficiencies, [
    { id: modId(key), type: "weapon_proficiencies", mode, values, label },
  ])
}

function savingThrowProf(key: string, values: string[], label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.savingThrows, [
    { id: modId(key), type: "saving_throws", values, label },
  ])
}

function hitPerLevel(key: string, value: number, label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.hitPoints, [
    { id: modId(key), type: "hit_points", mode: "per_level", value, label },
  ])
}

function speedMod(
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

function visionMod(
  key: string,
  visionType: "darkvision" | "blindsight" | "truesight" | "tremorsense",
  rangeFeet: number,
  label: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.vision, [
    { id: modId(key), type: "vision", visionType, rangeFeet, label },
  ])
}

function acBonus(
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

function attackMod(
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

function damageMod(
  key: string,
  entries: import("@/lib/compendium/characteristic-modifiers").RollModifierEntry[],
  label: string,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.damageRollModifiers, [
    { id: modId(key), type: "damage_roll_modifiers", entries, label },
  ])
}

function unarmedDie(key: string, die: "1d4" | "1d6" | "1d8", label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.unarmedStrikeDamage, [
    { id: modId(key), type: "unarmed_strike_damage", die, label },
  ])
}

function spellsKnown(
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

function spellAbility(key: string, label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.spellcastingAbility, [
    {
      id: modId(key),
      type: "spellcasting_ability",
      ability: "intelligence",
      label,
    },
  ])
}

function spellHealing(
  key: string,
  config: Partial<Extract<CharacteristicModifier, { type: "spell_healing_modifier" }>>,
): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.spellHealingModifier, [
    { id: modId(key), type: "spell_healing_modifier", ...config },
  ])
}

function uses(key: string, usesConfig: UsesConfig, label: string): LinkedModifierInstance {
  return usesInstance(`modinst_${key}`, usesConfig, label)
}

function checkFx(
  key: string,
  effect: Omit<FeatureEffect, "id">,
  activation: Partial<FeatureActivation> = {},
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.checkRollModifier, {
    ...activation,
    effects: [{ ...effect, id: modId(key) }],
  })
}

function movementFx(
  key: string,
  effect: Omit<FeatureEffect, "id">,
  activation: Partial<FeatureActivation> = {},
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.movementOption, {
    ...activation,
    effects: [{ ...effect, id: modId(key) }],
  })
}

function movementEffectsPassive(
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

function telepathyMod(key: string, rangeFeet: number, label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.telepathy, [
    { id: modId(key), type: "telepathy", rangeFeet, canInitiate: true, label },
  ])
}

function damageResistancePick(key: string, label: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.damageResistance, [
    {
      id: modId(key),
      type: "damage_resistance",
      damageTypes: [],
      label,
    },
  ])
}

function d20TestReaction(
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

function failedRollTrigger(
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

function damageHalvingReaction(key: string, label?: string): LinkedModifierInstance {
  return charInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.damageHalvingReaction, [
    {
      id: modId(key),
      type: "damage_halving_reaction",
      useReaction: true,
      label,
    },
  ])
}

function turnStartFx(
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

function riderFx(
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

function damageReductionFx(
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

function grantTempHpFx(
  key: string,
  activation: Partial<FeatureActivation> = {},
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.grantTempHp, {
    ...activation,
    effects: [{ id: modId(key), kind: "grant_temp_hp" }],
  })
}

function bonusActionAttackFx(key: string): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.bonusActionAttack, {
    bonusAction: true,
    effects: [{ id: modId(key), kind: "bonus_action_attack" }],
  })
}

function reactionAttackFx(key: string): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.reactionAttack, {
    reaction: true,
    effects: [{ id: modId(key), kind: "reaction_attack" }],
  })
}

function imposeDisadvantageFx(key: string): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.imposeDisadvantage, {
    reaction: true,
    effects: [{ id: modId(key), kind: "impose_disadvantage" }],
  })
}

function modifyCreatureFx(
  key: string,
  activation: Partial<FeatureActivation> = { reaction: true },
): LinkedModifierInstance {
  return fxInstance(`modinst_${key}`, FEAT_MODIFIER_CATALOG.modifyCreature, {
    ...activation,
    effects: [{ id: modId(key), kind: "modify_creature" }],
  })
}

function castSpellFx(
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

function feyShadowTouchedSpells(
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

/** Player's Handbook & SRD feat name → common modifier presets. */
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

  Crafter: {
    linkedModifiers: [
      toolsChoice("crafter_tools", 3, SRD_ARTISANS_TOOLS, "Tool Proficiency: 3 Artisan's Tools"),
    ],
  },

  Healer: {
    linkedModifiers: [
      fxInstance("modinst_healer_battle_medic", FEAT_MODIFIER_CATALOG.healSelf, {
        action: true,
        effects: [{ id: modId("healer_battle_medic"), kind: "heal_self" }],
      }),
      checkFx(
        "healer_reroll",
        {
          kind: "check_roll_modifier",
          checkCategory: "other",
          checkRerollOnNaturalOne: true,
        },
        {},
      ),
    ],
  },

  Lucky: {
    linkedModifiers: [
      uses("lucky_points", { type: "proficiency", recharges: [{ rest: "long_rest" }] }, "Luck Points"),
      d20TestReaction("lucky_advantage", {
        modifierMode: "add",
        targetScope: "self",
        spendResourceKey: "luck_points",
        spendResourceAmount: 1,
      }),
      d20TestReaction("lucky_disadvantage", {
        modifierMode: "subtract",
        targetScope: "target_creature",
        spendResourceKey: "luck_points",
        spendResourceAmount: 1,
        useReaction: true,
      }),
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
      }),
      spellAbility("magic_initiate_ability", "Spellcasting ability: INT, WIS, or CHA (chosen with feat)"),
      uses(
        "magic_initiate_cast",
        { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
        "Cast chosen level-1 spell once without a slot",
      ),
    ],
  },

  Musician: {
    linkedModifiers: [
      toolsChoice("musician_instruments", 3, SRD_MUSICAL_INSTRUMENTS, "Instrument Training: 3 Musical Instruments"),
      grantTempHpFx("musician_encouraging_song"),
    ],
  },

  "Savage Attacker": {
    linkedModifiers: [
      riderFx("savage_attacker", { bonusDice: "reroll weapon damage once per turn"}),
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

  "Tavern Brawler": {
    linkedModifiers: [
      unarmedDie("tavern_unarmed", "1d4", "Enhanced Unarmed Strike: 1d4 + STR bludgeoning"),
      damageMod("tavern_reroll", [{ bonus: 0, target: "custom", customTarget: "Unarmed Strike damage die" }], "Damage Rerolls: reroll unarmed damage die on 1"),
      weaponProf("tavern_improvised", "specific", ["Improvised weapons"], "Improvised Weaponry"),
      riderFx("tavern_push", { bonusDice: "Push 5 ft on unarmed hit (once per turn)" }),
    ],
  },

  Tough: {
    linkedModifiers: [hitPerLevel("tough", 2, "HP maximum +2 per character level")],
  },

  "Ability Score Improvement": {
    repeatable: true,
    linkedModifiers: [asiPool("modinst_asi", 2, "SRD ASI: +2 to one ability or +1 to two")],
  },

  Actor: {
    linkedModifiers: [
      asiOne("actor_asi", "+1 Charisma"),
      checkFx(
        "actor_impersonation",
        {
          kind: "check_advantage",
          checkCategory: "skill",
          checkSkills: ["Deception", "Performance"],
        },
        {},
      ),
    ],
  },

  Athlete: {
    linkedModifiers: [
      asiOne("athlete_asi", "+1 Strength or Dexterity"),
      speedMod("athlete_climb", "climb", "equal_to_walk", 0, "Climb Speed equal to Speed"),
      movementEffectsPassive("athlete_hop", { movementMoveThroughLargerSpaces: false }, "Hop Up: stand from Prone with 5 ft movement"),
      movementFx("athlete_jump", { kind: "movement_option", movementDash: false }),
    ],
  },

  Charger: {
    linkedModifiers: [
      asiOne("charger_asi", "+1 Strength or Dexterity"),
      movementFx("charger_dash", { kind: "movement_option", movementDash: true }),
      riderFx("charger_attack", { bonusDice: "1d8 on charge melee hit or push 10 ft"}),
    ],
  },

  Chef: {
    linkedModifiers: [
      asiOne("chef_asi", "+1 Constitution or Wisdom"),
      charInstance("modinst_chef_utensils", FEAT_MODIFIER_CATALOG.toolProficiencies, [
        { id: modId("chef_utensils"), type: "tool_proficiencies", values: ["Cook's Utensils"] },
      ]),
      spellHealing("chef_meal", { bonusFlat: 0 }),
      grantTempHpFx("chef_treats", { bonusAction: true }),
    ],
  },

  "Crossbow Expert": {
    linkedModifiers: [
      asiOne("crossbow_asi", "+1 Dexterity"),
      attackMod("crossbow_ignore_loading", [{ bonus: 0, target: "custom", customTarget: "Crossbows: ignore Loading" }], "Ignore Loading on crossbows"),
      attackMod("crossbow_melee", [{ bonus: 0, target: "ranged", customTarget: "No melee disadvantage with crossbows" }], "Firing in Melee"),
      damageMod("crossbow_dual", [{ bonus: 0, target: "custom", customTarget: "Light crossbow extra attack: add ability mod to damage", grantAbilityModifierWhenMissing: true }], "Dual Wielding with Light crossbows"),
    ],
  },

  Crusher: {
    linkedModifiers: [
      asiOne("crusher_asi", "+1 Strength or Constitution"),
      riderFx("crusher_push", { bonusDice: "Push 5 ft on bludgeoning hit (once per turn)" }),
      attackMod("crusher_crit", [{ bonus: 0, target: "custom", customTarget: "Advantage on attacks vs target after bludgeoning crit" }], "Enhanced Critical"),
    ],
  },

  "Defensive Duelist": {
    linkedModifiers: [
      asiOne("defensive_duelist_asi", "+1 Dexterity"),
      damageReductionFx("defensive_duelist_parry"),
    ],
  },

  "Dual Wielder": {
    linkedModifiers: [
      asiOne("dual_wielder_asi", "+1 Strength or Dexterity"),
      bonusActionAttackFx("dual_wielder_extra"),
      movementFx("dual_wielder_draw", { kind: "movement_option" }),
    ],
  },

  Durable: {
    linkedModifiers: [
      asiOne("durable_asi", "+1 Constitution"),
      checkFx("durable_death", { kind: "check_advantage", checkCategory: "save", checkAbility: "Constitution" }),
      checkFx("durable_recovery", { kind: "heal_self" }, { bonusAction: true }),
    ],
  },

  "Elemental Adept": {
    repeatable: true,
    linkedModifiers: [
      asiOne("elemental_adept_asi", "+1 Intelligence, Wisdom, or Charisma"),
      damageResistancePick("elemental_adept_energy", "Energy Mastery: choose Acid, Cold, Fire, Lightning, or Thunder"),
      damageMod("elemental_adept_dice", [{ bonus: 0, target: "custom", customTarget: "Spell damage: treat 1s as 2s for chosen type" }], "Energy Mastery damage dice"),
    ],
  },

  "Fey Touched": {
    linkedModifiers: feyShadowTouchedSpells("fey_touched", "Divination or Enchantment", "Misty Step", "Fey Magic"),
  },

  Grappler: {
    linkedModifiers: [
      asiOne("grappler_asi", "+1 Strength or Dexterity"),
      riderFx("grappler_punch_grab", { bonusDice: "Punch and Grab: Damage + Grapple on unarmed hit (once per turn)" }),
      checkFx("grappler_advantage", { kind: "check_advantage", checkCategory: "attack" }),
      movementFx("grappler_wrestler", { kind: "movement_option" }),
    ],
  },

  "Great Weapon Master": {
    linkedModifiers: [
      asiOne("gwm_asi", "+1 Strength"),
      riderFx("gwm_heavy", { bonusDice: "Proficiency Bonus on Heavy weapon hit"}),
      bonusActionAttackFx("gwm_hew"),
    ],
  },

  "Heavily Armored": {
    linkedModifiers: [
      asiOne("heavily_armored_asi", "+1 Constitution or Strength"),
      armorProf("heavily_armored", ["Heavy armor"], "Armor Training: Heavy armor"),
    ],
  },

  "Heavy Armor Master": {
    linkedModifiers: [
      asiOne("heavy_armor_master_asi", "+1 Constitution or Strength"),
      damageReductionFx("heavy_armor_master"),
    ],
  },

  "Inspiring Leader": {
    linkedModifiers: [
      asiOne("inspiring_leader_asi", "+1 Wisdom or Charisma"),
      grantTempHpFx("inspiring_leader"),
    ],
  },

  "Keen Mind": {
    linkedModifiers: [
      asiOne("keen_mind_asi", "+1 Intelligence"),
      skillChoice("keen_mind_lore", {
        count: 1,
        entries: [
          { skill: "Arcana", expertise: false },
          { skill: "History", expertise: false },
          { skill: "Investigation", expertise: false },
          { skill: "Nature", expertise: false },
          { skill: "Religion", expertise: false },
        ],
        label: "Lore Knowledge: proficiency or Expertise in chosen skill",
      }),
      checkFx("keen_mind_study", { kind: "extra_action" }, { bonusAction: true }),
    ],
  },

  "Lightly Armored": {
    linkedModifiers: [
      asiOne("lightly_armored_asi", "+1 Strength or Dexterity"),
      armorProf("lightly_armored", ["Light armor", "Shields"], "Armor Training: Light armor and Shields"),
    ],
  },

  "Mage Slayer": {
    linkedModifiers: [
      asiOne("mage_slayer_asi", "+1 Strength or Dexterity"),
      imposeDisadvantageFx("mage_slayer_concentration"),
      failedRollTrigger("mage_slayer_guarded", {
        triggerOn: "fail",
        rollKind: "save",
        ability: null,
        targetScope: "self",
      }),
      uses("mage_slayer_guarded_uses", { type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] }, "Guarded Mind uses"),
    ],
  },

  "Martial Weapon Training": {
    linkedModifiers: [
      asiOne("martial_weapon_asi", "+1 Strength or Dexterity"),
      weaponProf("martial_weapon", "martial_weapons", [], "Weapon Proficiency: Martial weapons"),
    ],
  },

  "Medium Armor Master": {
    linkedModifiers: [
      asiOne("medium_armor_master_asi", "+1 Strength or Dexterity"),
      acBonus("medium_armor_master", { flatBonus: 1, requiresArmor: true, label: "Dexterous Wearer: +1 AC from DEX in Medium armor (max +3 at DEX 16+)" }),
    ],
  },

  "Moderately Armored": {
    linkedModifiers: [
      asiOne("moderately_armored_asi", "+1 Strength or Dexterity"),
      armorProf("moderately_armored", ["Medium armor"], "Armor Training: Medium armor"),
    ],
  },

  "Mounted Combatant": {
    linkedModifiers: [
      asiOne("mounted_combatant_asi", "+1 Strength, Dexterity, or Wisdom"),
      checkFx("mounted_strike", { kind: "check_advantage", checkCategory: "attack" }),
      damageHalvingReaction("mounted_leap"),
      modifyCreatureFx("mounted_veer"),
    ],
  },

  Observant: {
    linkedModifiers: [
      asiOne("observant_asi", "+1 Intelligence or Wisdom"),
      skillChoice("observant_keen", {
        count: 1,
        entries: [
          { skill: "Insight", expertise: false },
          { skill: "Investigation", expertise: false },
          { skill: "Perception", expertise: false },
        ],
        label: "Keen Observer: proficiency or Expertise in chosen skill",
      }),
      checkFx("observant_search", { kind: "extra_action" }, { bonusAction: true }),
    ],
  },

  Piercer: {
    linkedModifiers: [
      asiOne("piercer_asi", "+1 Strength or Dexterity"),
      riderFx("piercer_puncture", { bonusDice: "reroll one piercing damage die once per turn"}),
      riderFx("piercer_crit", { bonusDice: "extra piercing damage die on crit"}),
    ],
  },

  Poisoner: {
    linkedModifiers: [
      asiOne("poisoner_asi", "+1 Dexterity or Intelligence"),
      damageMod("poisoner_potent", [{ bonus: 0, target: "custom", customTarget: "Poison damage ignores Resistance" }], "Potent Poison"),
      charInstance("modinst_poisoner_kit", FEAT_MODIFIER_CATALOG.toolProficiencies, [
        { id: modId("poisoner_kit"), type: "tool_proficiencies", values: ["Poisoner's Kit"] },
      ]),
    ],
  },

  "Polearm Master": {
    linkedModifiers: [
      asiOne("polearm_master_asi", "+1 Strength or Dexterity"),
      bonusActionAttackFx("polearm_master_strike"),
      reactionAttackFx("polearm_master_reactive"),
    ],
  },

  Resilient: {
    linkedModifiers: [
      asiOne("resilient_asi", "+1 chosen ability (lacking save proficiency)"),
      charInstance("modinst_resilient_save", FEAT_MODIFIER_CATALOG.savingThrows, [
        {
          id: modId("resilient_save"),
          type: "saving_throws",
          values: [],
          choiceCount: 1,
        },
      ]),
    ],
  },

  "Ritual Caster": {
    linkedModifiers: [
      asiOne("ritual_caster_asi", "+1 Intelligence, Wisdom, or Charisma"),
      spellsKnown("ritual_caster_spells", {
        choiceGrants: [{ level: 1, count: 1 }],
        alwaysPrepared: true,
      }),
      uses("ritual_caster_quick", { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Quick Ritual: cast prepared Ritual at normal casting time without slot (1/Long Rest)"),
    ],
  },

  Sentinel: {
    linkedModifiers: [
      asiOne("sentinel_asi", "+1 Strength or Dexterity"),
      reactionAttackFx("sentinel_guardian"),
      modifyCreatureFx("sentinel_halt"),
    ],
  },

  "Shadow Touched": {
    linkedModifiers: feyShadowTouchedSpells("shadow_touched", "Illusion or Necromancy", "Invisibility", "Shadow Magic"),
  },

  Sharpshooter: {
    linkedModifiers: [
      asiOne("sharpshooter_asi", "+1 Dexterity"),
      attackMod("sharpshooter_cover", [{ bonus: 0, target: "ranged", ignoreHalfCover: true, treatThreeQuartersCoverAsHalf: true }], "Bypass Cover"),
      attackMod("sharpshooter_melee", [{ bonus: 0, target: "ranged", customTarget: "No melee disadvantage with ranged weapons" }], "Firing in Melee"),
      attackMod("sharpshooter_range", [{ bonus: 0, target: "ranged", customTarget: "No long-range disadvantage" }], "Long Shots"),
    ],
  },

  "Shield Master": {
    linkedModifiers: [
      asiOne("shield_master_asi", "+1 Strength"),
      castSpellFx("shield_master_bash", { castSpellName: "Shield Bash" }),
      damageHalvingReaction("shield_master_interpose"),
    ],
  },

  "Skill Expert": {
    linkedModifiers: [
      asiOne("skill_expert_asi", "+1 to one ability score"),
      skillChoice("skill_expert_prof", { count: 1, allowAnySkill: true, label: "Skill Proficiency: one skill" }),
      skillChoice("skill_expert_exp", { count: 1, allowAnySkill: true, grantExpertise: true, label: "Expertise: one proficient skill lacking Expertise" }),
    ],
  },

  Skulker: {
    linkedModifiers: [
      asiOne("skulker_asi", "+1 Dexterity"),
      visionMod("skulker_blindsight", "blindsight", 10, "Blindsight 10 ft."),
      checkFx("skulker_fog", { kind: "check_advantage", checkCategory: "skill", checkSkills: ["Stealth"] }),
      attackMod("skulker_sniper", [{ bonus: 0, target: "custom", customTarget: "Miss while hidden does not reveal location" }], "Sniper"),
    ],
  },

  Slasher: {
    linkedModifiers: [
      asiOne("slasher_asi", "+1 Strength or Dexterity"),
      riderFx("slasher_hamstring", { bonusDice: "Hamstring: −10 ft Speed on slashing hit (once per turn)" }),
      attackMod("slasher_crit", [{ bonus: 0, target: "custom", customTarget: "Disadvantage on attacks after slashing crit" }], "Enhanced Critical"),
    ],
  },

  Speedy: {
    linkedModifiers: [
      asiOne("speedy_asi", "+1 Dexterity or Constitution"),
      speedMod("speedy_walk", "walk", "add", 10, "Speed Increase: +10 ft."),
      movementFx("speedy_dash", { kind: "movement_option", movementDash: true }),
      checkFx("speedy_agile", { kind: "check_disadvantage", checkCategory: "attack" }),
    ],
  },

  "Spell Sniper": {
    linkedModifiers: [
      asiOne("spell_sniper_asi", "+1 Intelligence, Wisdom, or Charisma"),
      attackMod("spell_sniper_cover", [{ bonus: 0, target: "spell_attack", ignoreHalfCover: true, treatThreeQuartersCoverAsHalf: true }], "Bypass Cover on spell attacks"),
      attackMod("spell_sniper_melee", [{ bonus: 0, target: "spell_attack", customTarget: "No melee disadvantage on spell attacks" }], "Casting in Melee"),
      attackMod("spell_sniper_range", [{ bonus: 0, target: "spell_attack", customTarget: "+60 ft range on qualifying spell attacks" }], "Increased Range"),
    ],
  },

  Telekinetic: {
    linkedModifiers: [
      asiOne("telekinetic_asi", "+1 Intelligence, Wisdom, or Charisma"),
      spellsKnown("telekinetic_mage_hand", {
        spells: [{ spellId: "Mage Hand", alwaysPrepared: true }],
      }),
      castSpellFx("telekinetic_shove", { castSpellName: "Telekinetic Shove" }, { bonusAction: true }),
    ],
  },

  Telepathic: {
    linkedModifiers: [
      asiOne("telepathic_asi", "+1 Intelligence, Wisdom, or Charisma"),
      telepathyMod("telepathic_utterance", 60, "Telepathic Utterance"),
      spellsKnown("telepathic_detect", {
        spells: [{ spellId: "Detect Thoughts", alwaysPrepared: true }],
      }),
      uses("telepathic_detect_cast", { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] }, "Cast Detect Thoughts without slot (1/Long Rest)"),
    ],
  },

  "War Caster": {
    linkedModifiers: [
      asiOne("war_caster_asi", "+1 Intelligence, Wisdom, or Charisma"),
      checkFx("war_caster_concentration", { kind: "check_advantage", checkCategory: "save", checkAbility: "Constitution" }),
      castSpellFx("war_caster_reactive", { castSpellCastingTime: "action" }),
    ],
  },

  "Weapon Master": {
    linkedModifiers: [
      asiOne("weapon_master_asi", "+1 Strength or Dexterity"),
      attackMod("weapon_master_mastery", [{ bonus: 0, target: "custom", customTarget: "Weapon Mastery property for one Simple or Martial weapon (change on Long Rest)" }], "Mastery Property"),
    ],
  },

  // Fighting Style feats
  Archery: {
    linkedModifiers: [
      attackMod("archery", [{ bonus: 2, target: "ranged" }], "+2 to ranged weapon attack rolls"),
    ],
  },

  "Blind Fighting": {
    linkedModifiers: [visionMod("blind_fighting", "blindsight", 10, "Blindsight 10 ft.")],
  },

  Defense: {
    linkedModifiers: [
      acBonus("defense", { flatBonus: 1, requiresArmor: true, label: "+1 AC while wearing armor" }),
    ],
  },

  Dueling: {
    linkedModifiers: [
      damageMod("dueling", [{ bonus: 2, target: "custom", customTarget: "One-handed melee weapon with no other weapons" }], "+2 damage with qualifying one-handed melee weapon"),
    ],
  },

  "Great Weapon Fighting": {
    linkedModifiers: [
      damageMod("gwf", [{ bonus: 0, target: "custom", customTarget: "Two-handed/versatile melee: treat 1–2 on damage dice as 3" }], "Great Weapon Fighting"),
    ],
  },

  Interception: {
    linkedModifiers: [
      damageReductionFx("interception"),
    ],
  },

  Protection: {
    linkedModifiers: [
      imposeDisadvantageFx("protection"),
    ],
  },

  "Thrown Weapon Fighting": {
    linkedModifiers: [
      damageMod("thrown_fighting", [{ bonus: 2, target: "custom", customTarget: "Thrown weapon ranged attacks" }], "+2 damage on thrown weapon hits"),
    ],
  },

  "Two-Weapon Fighting": {
    linkedModifiers: [
      damageMod("twf", [{ bonus: 0, target: "custom", customTarget: "Light weapon bonus-action attack", grantAbilityModifierWhenMissing: true }], "Add ability modifier to light weapon bonus-action damage"),
    ],
  },

  "Unarmed Fighting": {
    linkedModifiers: [
      unarmedDie("unarmed_fighting", "1d6", "Unarmed Strike: 1d6 + STR (1d8 if no weapons/Shield)"),
      charInstance("modinst_unarmed_fighting_grapple", FEAT_MODIFIER_CATALOG.turnStartTrigger, [
        {
          id: modId("unarmed_fighting_grapple"),
          type: "turn_start_trigger",
          effect: { catalogRefId: FEAT_MODIFIER_CATALOG.riderDamage },
        },
      ]),
    ],
  },

  // Epic Boons (bundled SRD seed — kept for completeness)
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
      uses("boon_fate_uses", { type: "fixed", fixedAmount: 1, recharges: [{ rest: "short_rest" }, { rest: "long_rest" }] }, "Recharges when you roll Initiative or finish a rest"),
    ],
  },
  "Boon of Irresistible Offense": {
    linkedModifiers: [
      asiOne("boon_offense_asi", "+1 Strength or Dexterity (max 30)"),
      damageMod("boon_offense_resist", [{ bonus: 0, target: "custom", customTarget: "B/P/S damage ignores resistance" }], "Overcome Defenses"),
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

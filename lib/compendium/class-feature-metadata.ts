export const FEAT_PICK_CATEGORIES = [
  "General",
  "Epic Boon",
  "Fighting Style",
  "Origin",
  "Metamagic",
  "Eldritch Invocation",
  "Planar Pact",
] as const

export type FeatPickCategory = (typeof FEAT_PICK_CATEGORIES)[number]

export type ActionEffectGroup =
  | "healing_temp_hp"
  | "bonus_damage"
  | "extra_attacks"
  | "defensive"
  | "checks_rolls"
  | "buff_debuff"
  | "movement"
  | "resource_casting"

export type EffectInputField =
  | "mitigation"
  | "damageTypes"
  | "conditionTypes"
  | "reductionAmount"
  | "bonusByLevel"
  | "bonusDice"
  | "checkCategory"
  | "checkAbility"
  | "checkSkills"
  | "checkConditionTypes"
  | "checkRollModifier"
  | "bonusAmount"
  | "modifyCreatureRoll"
  | "extraAttackCount"
  | "movementOption"
  | "weaponAttack"
  | "classResourceKey"
  | "classResourceChange"
  | "healAmount"
  | "tempHpTrigger"
  | "defensiveSaveScope"
  | "bonusRiderOptions"
  | "resourceRefresh"
  | "customAbilityId"
  | "casterBuffLabel"
  | "castSpell"
  | "movementTypes"
  | "remoteViewing"
  | "checkRollTargets"
  | "damageLinkedHeal"

export type ActionEffectOption = {
  value: string
  label: string
  group: ActionEffectGroup
  hint?: string
  fields?: EffectInputField[]
}

export const ACTION_EFFECT_GROUPS: { id: ActionEffectGroup; label: string }[] = [
  { id: "healing_temp_hp", label: "Healing / temp HP" },
  { id: "bonus_damage", label: "Bonus damage" },
  { id: "extra_attacks", label: "Extra attacks / actions" },
  { id: "defensive", label: "Defensive / damage reduction" },
  { id: "checks_rolls", label: "Checks & rolls" },
  { id: "buff_debuff", label: "Buff / debuff other creatures" },
  { id: "movement", label: "Movement / repositioning" },
  { id: "resource_casting", label: "Resource / casting manipulation" },
]

export const ACTION_EFFECT_OPTIONS: ActionEffectOption[] = [
  {
    value: "heal_from_pool",
    label: "Heal HP from a pool",
    group: "healing_temp_hp",
    hint: "Lay on Hands",
    fields: ["classResourceKey", "classResourceChange"],
  },
  { value: "heal_self", label: "Heal self", group: "healing_temp_hp", hint: "Second Wind", fields: ["healAmount", "damageLinkedHeal"] },
  {
    value: "grant_temp_hp",
    label: "Grant temporary HP",
    group: "healing_temp_hp",
    fields: ["healAmount", "tempHpTrigger"],
  },
  {
    value: "extra_damage_on_hit",
    label: "Extra dice on a hit",
    group: "bonus_damage",
    hint: "Sneak Attack / Divine Strike",
    fields: ["bonusDice", "bonusByLevel", "damageLinkedHeal"],
  },
  {
    value: "bonus_damage_by_level",
    label: "Bonus damage by level",
    group: "bonus_damage",
    hint: "Rage damage",
    fields: ["bonusByLevel"],
  },
  { value: "rider_damage", label: "Rider damage on attacks", group: "bonus_damage", fields: ["bonusDice", "bonusRiderOptions"] },
  {
    value: "bonus_damage_riders",
    label: "Bonus damage rider options",
    group: "bonus_damage",
    hint: "Cunning Strike, Brutal Strike",
    fields: ["bonusRiderOptions"],
  },
  {
    value: "extra_attack",
    label: "Extra Attack (Attack action)",
    group: "extra_attacks",
    hint: "Attack twice (or more) when you take the Attack action",
    fields: ["extraAttackCount"],
  },
  {
    value: "bonus_action_attack",
    label: "Bonus-action attack",
    group: "extra_attacks",
    hint: "Additional attack as a Bonus Action (e.g. Flurry of Blows)",
  },
  { value: "extra_action", label: "Extra action", group: "extra_attacks", hint: "Action Surge" },
  { value: "reaction_attack", label: "Reaction attack", group: "extra_attacks", hint: "Retaliation" },
  {
    value: "weapon_attack",
    label: "Attack or Effect",
    group: "extra_attacks",
    hint: "Melee, ranged, emanation, or forced saving throw",
    fields: ["weaponAttack"],
  },
  {
    value: "damage_reduction",
    label: "Resistance / immunity / reduction",
    group: "defensive",
    hint: "Rage, Uncanny Dodge, Evasion",
    fields: ["mitigation", "damageTypes", "conditionTypes", "reductionAmount", "defensiveSaveScope"],
  },
  { value: "impose_disadvantage", label: "Disadvantage / redirect attack", group: "defensive" },
  { value: "boost_ac", label: "Boost AC / defensive stance", group: "defensive" },
  {
    value: "check_roll_modifier",
    label: "Bonus or advantage on a check or roll",
    group: "checks_rolls",
    hint: "Bonus, advantage, disadvantage, reroll on 1, or roll minimum",
    fields: ["checkRollModifier"],
  },
  {
    value: "modify_creature",
    label: "Modify another creature",
    group: "buff_debuff",
    hint: "Rolls, speed, movement, disadvantage, action restrictions (Cutting Words, Open Hand, Sentinel)",
    fields: ["modifyCreatureRoll", "checkCategory", "checkAbility", "checkSkills", "checkRollTargets"],
  },
  { value: "force_save_control", label: "Force save / control", group: "buff_debuff" },
  {
    value: "remote_viewing",
    label: "Remote viewing (token)",
    group: "buff_debuff",
    hint: "Perceive through a linked token (Hexblood Eerie Token)",
    fields: ["remoteViewing"],
  },
  {
    value: "movement_option",
    label: "Dash / Disengage / Hide / Related Effects",
    group: "movement",
    fields: ["movementOption", "movementTypes"],
  },
  { value: "transform", label: "Transform", group: "movement", hint: "Wild Shape" },
  { value: "quicken_casting", label: "Speed up spellcasting", group: "resource_casting" },
  {
    value: "cast_spell",
    label: "Cast a spell",
    group: "resource_casting",
    hint: "Channel Divinity, Mystic Arcanum, etc.",
    fields: ["castSpell"],
  },
  {
    value: "class_resource",
    label: "Class resource",
    group: "resource_casting",
    hint: "Reduce, restore, or reset a class resource pool",
    fields: ["classResourceKey", "classResourceChange", "resourceRefresh"],
  },
  { value: "self_buff_caster", label: "Self-buff caster state", group: "resource_casting", hint: "Innate Sorcery, Sacred Weapon, temporary caster mode", fields: ["casterBuffLabel"] },
  { value: "activate_custom_ability", label: "Use custom ability", group: "resource_casting", hint: "Trigger another compendium custom ability", fields: ["customAbilityId"] },
]

export const MOVEMENT_TYPE_OPTIONS = [
  { value: "walk", label: "Walk" },
  { value: "fly", label: "Fly" },
  { value: "swim", label: "Swim" },
  { value: "climb", label: "Climb" },
  { value: "burrow", label: "Burrow" },
  { value: "jump", label: "Jump" },
] as const

export const CAST_SPELL_CASTING_TIME_OPTIONS = [
  { value: "action", label: "Action" },
  { value: "bonus_action", label: "Bonus Action" },
  { value: "reaction", label: "Reaction" },
  { value: "minute", label: "1+ minutes" },
  { value: "hour", label: "1+ hours" },
] as const

export const CHECK_CATEGORIES = [
  { value: "ability", label: "Ability check" },
  { value: "skill", label: "Skill check" },
  { value: "attack", label: "Attack roll" },
  { value: "spell_attack", label: "Spell attack roll" },
  { value: "save", label: "Saving throw" },
  { value: "spell_save_dc", label: "Spell save DC" },
  { value: "initiative", label: "Initiative" },
  { value: "other", label: "Other roll" },
] as const

export const ABILITY_CHECK_OPTIONS = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
] as const

/** Active effect kinds replaced by unified catalog entries (legacy data still loads). */
export const EXCLUDED_ACTION_CATALOG_KINDS = new Set([
  "check_advantage",
  "check_bonus",
  "check_disadvantage",
  "buff_ally_roll",
  "debuff_enemy_roll",
])

/** Passive characteristic types omitted from the default common-modifiers catalog. */
export const EXCLUDED_PASSIVE_CATALOG_TYPES = new Set(["initiative"])

export type CheckRollMode = "bonus" | "advantage" | "disadvantage" | "replace_failure"

/** Resolve bonus / advantage / disadvantage from unified or legacy effect kinds. */
export function resolveCheckRollMode(effect: {
  kind?: string
  checkRollMode?: CheckRollMode | null
  grantAdvantage?: boolean
  grantDisadvantage?: boolean
}): CheckRollMode | null {
  if (effect.checkRollMode) return effect.checkRollMode
  if (effect.kind === "check_advantage" || effect.grantAdvantage) return "advantage"
  if (effect.kind === "check_disadvantage" || effect.grantDisadvantage) return "disadvantage"
  if (effect.kind === "check_bonus") return "bonus"
  return null
}

export function normalizeFeatureEffectKind(kind: string): string {
  return normalizeEffectKind(kind)
}

export function actionEffectOption(value: string | null | undefined): ActionEffectOption | undefined {
  if (!value) return undefined
  return ACTION_EFFECT_OPTIONS.find((option) => option.value === value)
}

export function actionEffectLabel(value: string | null | undefined): string {
  if (!value) return ""
  return actionEffectOption(value)?.label ?? value
}

export function effectFieldsForKind(kind: string): EffectInputField[] {
  const normalized = normalizeEffectKind(kind)
  return actionEffectOption(normalized)?.fields ?? actionEffectOption(kind)?.fields ?? []
}

/** Map legacy effect kinds to the unified catalog entry. */
export function normalizeEffectKind(kind: string): string {
  if (kind === "buff_ally_roll" || kind === "debuff_enemy_roll" || kind === "modify_creature_roll") {
    return "modify_creature"
  }
  if (kind === "check_advantage" || kind === "check_bonus" || kind === "check_disadvantage") {
    return "check_roll_modifier"
  }
  return kind
}

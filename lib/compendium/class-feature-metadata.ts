export const FEAT_PICK_CATEGORIES = [
  "General",
  "Epic Boon",
  "Fighting Style",
  "Origin",
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
  | "reductionAmount"
  | "bonusByLevel"
  | "bonusDice"
  | "checkCategory"
  | "checkAbility"
  | "checkSkills"
  | "bonusAmount"
  | "advantageFlags"
  | "classResourceKey"
  | "classResourceChange"
  | "healAmount"

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
  { value: "heal_from_pool", label: "Heal HP from a pool", group: "healing_temp_hp", hint: "Lay on Hands" },
  { value: "heal_self", label: "Heal self", group: "healing_temp_hp", hint: "Second Wind", fields: ["healAmount"] },
  { value: "grant_temp_hp", label: "Grant temporary HP", group: "healing_temp_hp" },
  {
    value: "extra_damage_on_hit",
    label: "Extra dice on a hit",
    group: "bonus_damage",
    hint: "Sneak Attack",
    fields: ["bonusDice"],
  },
  {
    value: "bonus_damage_by_level",
    label: "Bonus damage by level",
    group: "bonus_damage",
    hint: "Rage damage",
    fields: ["bonusByLevel"],
  },
  { value: "rider_damage", label: "Rider damage on attacks", group: "bonus_damage", fields: ["bonusDice"] },
  { value: "bonus_action_attack", label: "Bonus-action attack", group: "extra_attacks" },
  { value: "extra_action", label: "Extra action", group: "extra_attacks" },
  { value: "reaction_attack", label: "Reaction attack", group: "extra_attacks" },
  {
    value: "damage_reduction",
    label: "Resistance / immunity / reduction",
    group: "defensive",
    hint: "Rage, Uncanny Dodge",
    fields: ["mitigation", "damageTypes", "reductionAmount"],
  },
  { value: "impose_disadvantage", label: "Disadvantage / redirect attack", group: "defensive" },
  { value: "boost_ac", label: "Boost AC / defensive stance", group: "defensive" },
  {
    value: "check_bonus",
    label: "Bonus on a check or roll",
    group: "checks_rolls",
    fields: ["checkCategory", "checkAbility", "checkSkills", "bonusAmount"],
  },
  {
    value: "check_advantage",
    label: "Advantage on a check or roll",
    group: "checks_rolls",
    fields: ["checkCategory", "checkAbility", "checkSkills", "advantageFlags"],
  },
  {
    value: "check_disadvantage",
    label: "Disadvantage on a check or roll",
    group: "checks_rolls",
    fields: ["checkCategory", "checkAbility", "checkSkills", "advantageFlags"],
  },
  { value: "buff_ally_roll", label: "Buff an ally's roll", group: "buff_debuff", hint: "Bardic Inspiration" },
  { value: "debuff_enemy_roll", label: "Debuff an enemy's roll", group: "buff_debuff" },
  { value: "force_save_control", label: "Force save / control", group: "buff_debuff" },
  { value: "movement_option", label: "Dash / Disengage / Hide", group: "movement" },
  { value: "transform", label: "Transform", group: "movement", hint: "Wild Shape" },
  { value: "quicken_casting", label: "Speed up spellcasting", group: "resource_casting" },
  {
    value: "class_resource",
    label: "Class resource",
    group: "resource_casting",
    hint: "Reduce, restore, or reset a class resource pool",
    fields: ["classResourceKey", "classResourceChange"],
  },
  { value: "self_buff_caster", label: "Self-buff caster state", group: "resource_casting" },
]

export const CHECK_CATEGORIES = [
  { value: "ability", label: "Ability check" },
  { value: "skill", label: "Skill check" },
  { value: "attack", label: "Attack roll" },
  { value: "save", label: "Saving throw" },
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

export function actionEffectOption(value: string | null | undefined): ActionEffectOption | undefined {
  if (!value) return undefined
  return ACTION_EFFECT_OPTIONS.find((option) => option.value === value)
}

export function actionEffectLabel(value: string | null | undefined): string {
  if (!value) return ""
  return actionEffectOption(value)?.label ?? value
}

export function effectFieldsForKind(kind: string): EffectInputField[] {
  return actionEffectOption(kind)?.fields ?? []
}

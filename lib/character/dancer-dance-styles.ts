import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { requiresActiveToggleLimitation } from "@/lib/compendium/modifier-limitations"
import type { Feature } from "@/lib/types"

export type DefaultDancerDanceStyle = {
  name: string
  description: string
  toggleId: string
}

/** Class Dance Styles every Dancer can choose when beginning a Dance. */
export const DEFAULT_DANCER_DANCE_STYLES: readonly DefaultDancerDanceStyle[] = [
  {
    name: "Agile Movement",
    description: "Your movement doesn't provoke Opportunity Attacks.",
    toggleId: "dance_style_agile_movement",
  },
  {
    name: "Elegant Form",
    description:
      "When you fail a Dexterity or Charisma check or a saving throw with any ability, add your Dance Die, potentially turning the failure into a success.",
    toggleId: "dance_style_elegant_form",
  },
  {
    name: "Retaliatory Swipe",
    description:
      "When a creature within 5 feet hits you with a melee attack, the attacker takes damage equal to two Dance Dice (same type as a weapon you are holding or your Unarmed Strike).",
    toggleId: "dance_style_retaliatory_swipe",
  },
  {
    name: "Spinning Shot",
    description: "Add your Dance Die to ranged attack rolls you make with weapons.",
    toggleId: "dance_style_spinning_shot",
  },
]

export function normalizeDanceStyleName(name: string): string {
  return name.replace(/\s*\[dance style\]\s*/gi, "").trim().toLowerCase()
}

export function displayDanceStyleName(name: string): string {
  return name.replace(/\s*\[dance style\]\s*/gi, "").trim()
}

export function danceStyleToggleIdForName(name: string): string | null {
  const slug = normalizeDanceStyleName(name)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
  return slug ? `dance_style_${slug}` : null
}

export function isDanceStyleChoiceFeature(feature: Pick<Feature, "name" | "choices">): boolean {
  const choices = feature.choices
  if (choices?.resourceKey === "dance_styles_known") return true
  if (/^dance styles?$/i.test(choices?.category ?? "")) return true
  return /^dance styles?$/i.test(feature.name)
}

export function isSubclassDanceStyleFeature(feature: Pick<Feature, "name">): boolean {
  return /\[dance style\]/i.test(feature.name)
}

export function defaultDancerDanceStyleToggleIds(): string[] {
  return DEFAULT_DANCER_DANCE_STYLES.map((style) => style.toggleId)
}

export function isDanceBeginFeature(feature: Pick<Feature, "name">): boolean {
  return /^dance$/i.test(feature.name.trim())
}

const DANCE_DIE_BONUS = {
  mode: "die" as const,
  dieScaling: "class_resource" as const,
  classResourceKey: "dance_die",
}

/** Graceful Dodge — available while Dancing, regardless of style. */
export const DEFAULT_DANCE_PARENT_CHARACTERISTIC_MODIFIERS: readonly CharacteristicModifier[] = [
  {
    id: "mod_graceful_dodge",
    type: "resource_ability_menu",
    resourceKey: "dance_die",
    limitations: [requiresActiveToggleLimitation("while_dancing")],
    options: [
      {
        name: "Graceful Dodge",
        description: "Add your Dance Die to your AC against one attack.",
        resourceCost: 0,
        bonusConfig: DANCE_DIE_BONUS,
      },
    ],
    label: "Graceful Dodge — Dance Die to AC",
  },
]

export function defaultDanceParentCharacteristicModifiers(): CharacteristicModifier[] {
  return DEFAULT_DANCE_PARENT_CHARACTERISTIC_MODIFIERS as CharacteristicModifier[]
}

/**
 * Default class Dance Style riders. Gated on `dance_style_*` so only the chosen
 * style unlocks its sheet surfaces (save box, weapon badge, movement, reminder).
 */
export const DEFAULT_DANCE_STYLE_CHARACTERISTIC_MODIFIERS: readonly CharacteristicModifier[] = [
  {
    id: "char_agile_movement",
    type: "movement_effects",
    moveWithoutOpportunityAttacks: true,
    label: "Agile Movement — no Opportunity Attacks (this Dance Style)",
    limitations: [requiresActiveToggleLimitation("dance_style_agile_movement")],
  },
  {
    id: "mod_elegant_form",
    type: "resource_ability_menu",
    resourceKey: "dance_die",
    appliesOnRollKinds: ["save", "ability"],
    limitations: [requiresActiveToggleLimitation("dance_style_elegant_form")],
    options: [
      {
        name: "Elegant Form",
        description:
          "When you fail a Dexterity or Charisma check or any saving throw, add Dance Die.",
        resourceCost: 0,
        bonusConfig: DANCE_DIE_BONUS,
      },
    ],
    label: "Elegant Form — Dance Die to a failed DEX/CHA check or any save",
  },
  {
    id: "mod_spinning_shot",
    type: "resource_ability_menu",
    resourceKey: "dance_die",
    appliesOnRollKinds: ["attack"],
    limitations: [requiresActiveToggleLimitation("dance_style_spinning_shot")],
    options: [
      {
        name: "Spinning Shot",
        description: "Add Dance Die to a ranged weapon attack roll (this Dance Style).",
        resourceCost: 0,
        bonusConfig: DANCE_DIE_BONUS,
      },
    ],
    label: "Spinning Shot — Dance Die to ranged weapon attacks",
  },
  {
    id: "char_spinning_shot_badge",
    type: "weapon_sheet_badge",
    label: "Spinning Shot",
    description: "Add Dance Die to a ranged weapon attack roll (this Dance Style).",
    appliesTo: "ranged",
    limitations: [requiresActiveToggleLimitation("dance_style_spinning_shot")],
  },
]

export function defaultDanceStyleCharacteristicModifiers(): CharacteristicModifier[] {
  return DEFAULT_DANCE_STYLE_CHARACTERISTIC_MODIFIERS as CharacteristicModifier[]
}

export type ActivationModeReminderAction = {
  name: string
  description: string
  requiresSheetToggle: string
  trigger: string
  sourceLabel: string
}

/** Reminder-only surfaces that have no numeric engine yet (e.g. Retaliatory Swipe). */
export const DEFAULT_DANCE_STYLE_REMINDER_ACTIONS: readonly ActivationModeReminderAction[] = [
  {
    name: "Retaliatory Swipe",
    description:
      "When a creature within 5 feet hits you with a melee attack, the attacker takes damage equal to two Dance Dice (same type as a weapon you are holding or your Unarmed Strike).",
    requiresSheetToggle: "dance_style_retaliatory_swipe",
    trigger: "While Dance Style: Retaliatory Swipe",
    sourceLabel: "Dance Style",
  },
]

export function defaultDanceStyleReminderActions(): ActivationModeReminderAction[] {
  return DEFAULT_DANCE_STYLE_REMINDER_ACTIONS as ActivationModeReminderAction[]
}

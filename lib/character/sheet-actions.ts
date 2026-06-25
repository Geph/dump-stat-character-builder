import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { Feature, FeatureActivation, Species, UsesConfig } from "@/lib/types"

export type ActionEconomyKind = "action" | "bonus" | "reaction"

/** Combat actions live on the Combat tab; utility actions on the Abilities & Skills tab. */
export type SheetActionCategory = "combat" | "utility"

export type SheetActionEntry = {
  id: string
  name: string
  sourceLabel: string
  kinds: ActionEconomyKind[]
  category: SheetActionCategory
  limitedUses: UsesConfig | null | undefined
  classLevel: number
  description?: string | null
  /** Class id that owns the resource this action draws from, if any. */
  classId?: string | null
  /** Class resource key consumed when the action is used, if any. */
  classResourceKey?: string | null
}

/** Trigger characteristics that represent a player-elected reaction when `useReaction` is set. */
const REACTION_TRIGGER_TYPES = new Set<CharacteristicModifier["type"]>([
  "d20_test_reaction",
  "failed_roll_trigger",
  "saving_throw_trigger",
  "damage_halving_reaction",
  "on_creature_death_trigger",
])

/** Active-effect kinds (cat_fx_*) that mark an action as combat-focused. */
const COMBAT_EFFECT_KINDS = new Set<string>([
  "extra_attack",
  "bonus_action_attack",
  "reaction_attack",
  "weapon_attack",
  "extra_damage_on_hit",
  "bonus_damage_by_level",
  "rider_damage",
  "bonus_damage_riders",
  "boost_ac",
  "damage_reduction",
  "impose_disadvantage",
  "force_save_control",
])

/** Characteristic types that mark an action as combat-focused. */
const COMBAT_CHARACTERISTIC_TYPES = new Set<CharacteristicModifier["type"]>([
  "on_hit_trigger",
  "special_attack",
  "damage_halving_reaction",
  "bonus_damage_riders",
  "unarmed_strike_damage",
  "attack_roll_modifiers",
  "damage_roll_modifiers",
])

const COMBAT_TEXT_RE =
  /\b(?:attacks?|attacking|damage|weapons?|enem(?:y|ies)|foe|hostile|armou?r class|bloodied|initiative|smite|sneak attack|opportunity attack|hit points?)\b/i

/** Description phrasings that imply an action-economy cost when no structured activation exists. */
const ACTION_TEXT_PATTERNS: { re: RegExp; kind: ActionEconomyKind }[] = [
  { re: /\bas a bonus action\b/i, kind: "bonus" },
  { re: /\bas a reaction\b/i, kind: "reaction" },
  { re: /\bas an? (?:magic )?action\b/i, kind: "action" },
]

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ")
}

export function activationKinds(activation?: FeatureActivation | null): ActionEconomyKind[] {
  if (!activation) return []
  const kinds: ActionEconomyKind[] = []
  if (activation.action) kinds.push("action")
  if (activation.bonusAction) kinds.push("bonus")
  if (activation.reaction) kinds.push("reaction")
  return kinds
}

/**
 * Derive action-economy kinds from a feature's linked modifiers when the feature itself
 * carries no top-level activation. Covers presets and imported wiring whose action economy
 * lives on the modifier instance (instance.activation) or on an active characteristic such as
 * a healing dice pool or a reaction trigger.
 */
function kindsFromLinkedModifiers(
  instances: LinkedModifierInstance[] | undefined,
): ActionEconomyKind[] {
  const kinds = new Set<ActionEconomyKind>()
  for (const instance of instances ?? []) {
    for (const kind of activationKinds(instance.activation)) kinds.add(kind)
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "healing_dice_pool") {
        kinds.add(characteristic.activation === "bonus_action" ? "bonus" : "action")
      } else if (
        REACTION_TRIGGER_TYPES.has(characteristic.type) &&
        (characteristic as { useReaction?: boolean }).useReaction
      ) {
        kinds.add("reaction")
      }
    }
  }
  return [...kinds]
}

/** Last-resort detection of an action-economy cost from the feature/trait prose. */
function kindsFromText(description: string | null | undefined): ActionEconomyKind[] {
  if (!description) return []
  const text = stripHtml(description)
  const kinds = new Set<ActionEconomyKind>()
  for (const { re, kind } of ACTION_TEXT_PATTERNS) {
    if (re.test(text)) kinds.add(kind)
  }
  return [...kinds]
}

/** Decide whether an action belongs on the Combat tab or the Abilities & Skills (utility) tab. */
function classifyActionCategory(item: ActivatableItem): SheetActionCategory {
  for (const instance of item.linkedModifiers ?? []) {
    for (const effect of instance.activation?.effects ?? []) {
      const kind = (effect as { kind?: string }).kind
      if (kind && COMBAT_EFFECT_KINDS.has(kind)) return "combat"
    }
    for (const characteristic of instance.characteristics ?? []) {
      if (COMBAT_CHARACTERISTIC_TYPES.has(characteristic.type)) return "combat"
    }
  }
  const haystack = `${item.name} ${stripHtml(item.description ?? "")}`
  return COMBAT_TEXT_RE.test(haystack) ? "combat" : "utility"
}

/** Find the class resource key consumed by an activatable item (feature or trait). */
function resolveActionResourceKey(item: ActivatableItem): string | null {
  if (item.limitedUses?.type === "class_resource") {
    return item.limitedUses.classResourceKey ?? null
  }
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "resource_ability_menu" && characteristic.resourceKey) {
        return characteristic.resourceKey
      }
      const spendKey = (characteristic as { spendResourceKey?: string | null }).spendResourceKey
      if (spendKey) return spendKey
    }
  }
  return null
}

type ActivatableItem = {
  name: string
  description?: string | null
  level?: number
  activation?: FeatureActivation | null
  limitedUses?: UsesConfig | null
  linkedModifiers?: LinkedModifierInstance[]
}

function pushFeatureActions(
  actions: SheetActionEntry[],
  features: ActivatableItem[] | undefined,
  levelCap: number,
  sourceLabel: string,
  idPrefix: string,
  classId: string | null,
) {
  for (const feature of features ?? []) {
    if ((feature.level ?? 1) > levelCap) continue
    const baseKinds = activationKinds(feature.activation)
    const linkedKinds = baseKinds.length ? [] : kindsFromLinkedModifiers(feature.linkedModifiers)
    const kinds = baseKinds.length
      ? baseKinds
      : linkedKinds.length
        ? linkedKinds
        : kindsFromText(feature.description)
    if (!kinds.length) continue
    actions.push({
      id: `${idPrefix}:${feature.level ?? 1}:${feature.name}`,
      name: feature.name,
      sourceLabel,
      kinds,
      category: classifyActionCategory(feature),
      limitedUses: feature.limitedUses,
      classLevel: levelCap,
      description: feature.description ?? null,
      classId,
      classResourceKey: resolveActionResourceKey(feature),
    })
  }
}

export function collectSheetActions(params: {
  classDetails: CharacterClassDetail[]
  species: Species | null
  backgroundFeature?: ActivatableItem | null
}): SheetActionEntry[] {
  const actions: SheetActionEntry[] = []

  for (const entry of params.classDetails) {
    const className = entry.class?.name ?? "Class"
    pushFeatureActions(
      actions,
      entry.class?.features as Feature[] | undefined,
      entry.row.level,
      className,
      entry.row.class_id,
      entry.row.class_id,
    )
    if (entry.subclass) {
      pushFeatureActions(
        actions,
        entry.subclass.features as Feature[] | undefined,
        entry.row.level,
        entry.subclass.name,
        `sub-${entry.subclass.id}`,
        entry.row.class_id,
      )
    }
  }

  const totalLevel = params.classDetails.reduce((sum, entry) => sum + (entry.row.level ?? 0), 0)

  if (params.species) {
    pushFeatureActions(
      actions,
      params.species.traits as ActivatableItem[] | undefined,
      Math.max(totalLevel, 1),
      params.species.name,
      `species-${params.species.id}`,
      null,
    )
  }

  if (params.backgroundFeature) {
    pushFeatureActions(
      actions,
      [params.backgroundFeature],
      Math.max(totalLevel, 1),
      "Background",
      "background",
      null,
    )
  }

  return actions
}

export const ACTION_KIND_LABELS: Record<ActionEconomyKind, string> = {
  action: "Action",
  bonus: "Bonus Action",
  reaction: "Reaction",
}

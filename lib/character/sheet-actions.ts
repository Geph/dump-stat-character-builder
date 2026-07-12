import { featureChoiceKey } from "@/lib/builder/choices"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { DEFAULT_SHEET_ACTIONS } from "@/lib/character/default-actions"
import { resolveFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import { ACTION_PANEL_CLASS_RESOURCE_IDS } from "@/lib/compendium/class-resource-display"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { PsionicAugmentsConfig } from "@/lib/compendium/parse-psionic-augments"
import { resolvePsionicAugments } from "@/lib/compendium/resolve-psionic-augments"
import type { CustomAbility, Feature, FeatureActivation, Species, UsesConfig } from "@/lib/types"

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
  /** Custom ability backing this action, when surfaced from the compendium. */
  customAbilityId?: string | null
  psionicAugments?: PsionicAugmentsConfig | null
  castingTime?: string | null
  range?: string | null
  components?: string[] | null
  duration?: string | null
  concentration?: boolean
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
  "extra_action",
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
  "heal_self",
  "movement_option",
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

function kindsFromCastingTime(castingTime: string | null | undefined): ActionEconomyKind[] {
  if (!castingTime) return []
  const text = castingTime.toLowerCase()
  const kinds = new Set<ActionEconomyKind>()
  if (/\bbonus\s+action\b/.test(text)) kinds.add("bonus")
  if (/\breaction\b/.test(text)) kinds.add("reaction")
  if (/\b(?:magic\s+)?action\b/.test(text) && !/\bbonus\s+action\b/.test(text)) kinds.add("action")
  return [...kinds]
}

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
  const resourceKey = resolveActionResourceKey(item)
  if (resourceKey && ACTION_PANEL_CLASS_RESOURCE_IDS.has(resourceKey)) return "combat"

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
  sheetDisplay?: import("@/lib/types").FeatureSheetDisplay | null
}

export type { ActivatableItem }

/** Derive action-economy kinds from structured activation, modifiers, or prose. */
export function inferActivatableActionKinds(item: ActivatableItem): ActionEconomyKind[] {
  const baseKinds = activationKinds(item.activation)
  const linkedKinds = baseKinds.length ? [] : kindsFromLinkedModifiers(item.linkedModifiers)
  return baseKinds.length
    ? baseKinds
    : linkedKinds.length
      ? linkedKinds
      : kindsFromText(item.description)
}

/** Decide whether an action belongs on the Combat tab or the Abilities & Skills (utility) tab. */
export function inferActivatableActionCategory(item: ActivatableItem): SheetActionCategory {
  return classifyActionCategory(item)
}

/** Standard actions whose default action economy is a normal Action. */
const DEFAULT_ACTION_BY_ID = new Map(DEFAULT_SHEET_ACTIONS.map((action) => [action.id, action]))

const MOVEMENT_OPTION_DEFAULT_ACTIONS: Array<{
  flag: "movementDash" | "movementDisengage" | "movementHide"
  actionId: string
}> = [
  { flag: "movementDash", actionId: "dash" },
  { flag: "movementDisengage", actionId: "disengage" },
  { flag: "movementHide", actionId: "hide" },
]

type MovementOptionExpansion = {
  actionKey: string
  name: string
  description: string
  kinds: ActionEconomyKind[]
  category: SheetActionCategory
}

function expansionsFromMovementOptions(
  feature: ActivatableItem,
  instance: LinkedModifierInstance,
): MovementOptionExpansion[] {
  const kinds = activationKinds(instance.activation)
  if (!kinds.length) return []
  if (kinds.every((kind) => kind === "action")) return []

  const expansions: MovementOptionExpansion[] = []
  for (const effect of instance.activation?.effects ?? []) {
    if ((effect as { kind?: string }).kind !== "movement_option") continue
    for (const { flag, actionId } of MOVEMENT_OPTION_DEFAULT_ACTIONS) {
      if (!(effect as unknown as Record<string, unknown>)[flag]) continue
      const defaultAction = DEFAULT_ACTION_BY_ID.get(actionId)
      if (!defaultAction) continue
      expansions.push({
        actionKey: actionId,
        name: defaultAction.name,
        description:
          (effect as { label?: string | null }).label?.trim() || defaultAction.description,
        kinds,
        category: defaultAction.category === "combat" ? "combat" : "utility",
      })
    }
    if ((effect as { movementHideBehindLargerCreatures?: boolean }).movementHideBehindLargerCreatures) {
      expansions.push({
        actionKey: "hide-behind-larger",
        name: "Hide behind larger creatures",
        description:
          (effect as { label?: string | null }).label?.trim() ||
          "Hide behind a creature at least one size larger than you.",
        kinds,
        category: "combat",
      })
    }
  }
  return expansions
}

function collectMovementOptionExpansions(feature: ActivatableItem): MovementOptionExpansion[] {
  const seen = new Set<string>()
  const expansions: MovementOptionExpansion[] = []
  for (const instance of feature.linkedModifiers ?? []) {
    for (const expansion of expansionsFromMovementOptions(feature, instance)) {
      const key = `${expansion.actionKey}:${expansion.kinds.join("+")}`
      if (seen.has(key)) continue
      seen.add(key)
      expansions.push(expansion)
    }
  }
  return expansions
}

/** Hide the parent feature card when it only exists to grant alternate-timing standard actions. */
function suppressParentForMovementExpansions(
  feature: ActivatableItem,
  expansions: MovementOptionExpansion[],
): boolean {
  if (!expansions.length) return false
  const hasNonMovementEffect = (feature.linkedModifiers ?? []).some((instance) =>
    (instance.activation?.effects ?? []).some(
      (effect) => (effect as { kind?: string }).kind && (effect as { kind?: string }).kind !== "movement_option",
    ),
  )
  return !hasNonMovementEffect
}

function pushActivatableItemActions(
  actions: SheetActionEntry[],
  feature: ActivatableItem,
  levelCap: number,
  sourceLabel: string,
  idPrefix: string,
  classId: string | null,
) {
  if ((feature.level ?? 1) > levelCap) return
  const display = resolveFeatureSheetDisplay(feature as unknown as Feature)
  const movementExpansions = collectMovementOptionExpansions(feature)
  const suppressParent = suppressParentForMovementExpansions(feature, movementExpansions)

  if (!suppressParent) {
    const kinds = inferActivatableActionKinds(feature)
    if (kinds.length) {
      const category = inferActivatableActionCategory(feature)
      if (
        (category !== "combat" || display.combatActions) &&
        (category !== "utility" || display.abilitiesActions)
      ) {
        actions.push({
          id: `${idPrefix}:${feature.level ?? 1}:${feature.name}`,
          name: feature.name,
          sourceLabel,
          kinds,
          category,
          limitedUses: feature.limitedUses,
          classLevel: levelCap,
          description: feature.description ?? null,
          classId,
          classResourceKey: resolveActionResourceKey(feature),
        })
      }
    }
  }

  for (const expansion of movementExpansions) {
    if (expansion.category === "combat" && !display.combatActions) continue
    if (expansion.category === "utility" && !display.abilitiesActions) continue
    actions.push({
      id: `${idPrefix}:${feature.level ?? 1}:${feature.name}:movement:${expansion.actionKey}`,
      name: expansion.name,
      sourceLabel: feature.name,
      kinds: expansion.kinds,
      category: expansion.category,
      limitedUses: feature.limitedUses,
      classLevel: levelCap,
      description: expansion.description,
      classId,
      classResourceKey: resolveActionResourceKey(feature),
    })
  }
}

/** When a feature choice is picked, surface option-level bonus/actions (e.g. Eagle). */
function pushPickedChoiceOptionActions(
  actions: SheetActionEntry[],
  feature: Feature,
  levelCap: number,
  sourceLabel: string,
  idPrefix: string,
  classId: string | null,
  featureChoicePicks: Record<string, string[]> | undefined,
) {
  if (!classId || !featureChoicePicks) return
  if (!feature.isChoice || !feature.choices?.options?.length) return
  const picks = featureChoicePicks[featureChoiceKey(classId, feature.name, feature.level)] ?? []
  for (const pick of picks) {
    const option = feature.choices.options.find((entry) => entry.name === pick)
    if (!option) continue
    pushActivatableItemActions(
      actions,
      {
        name: option.name,
        description: option.description,
        level: feature.level,
        linkedModifiers: option.linkedModifiers,
      },
      levelCap,
      sourceLabel,
      `${idPrefix}:opt`,
      classId,
    )
  }
}

function pushFeatureActions(
  actions: SheetActionEntry[],
  features: Feature[] | ActivatableItem[] | undefined,
  levelCap: number,
  sourceLabel: string,
  idPrefix: string,
  classId: string | null,
  featureChoicePicks?: Record<string, string[]>,
) {
  for (const feature of features ?? []) {
    pushActivatableItemActions(actions, feature, levelCap, sourceLabel, idPrefix, classId)
    pushPickedChoiceOptionActions(
      actions,
      feature as Feature,
      levelCap,
      sourceLabel,
      idPrefix,
      classId,
      featureChoicePicks,
    )
  }
}

function isCustomAbilityAction(ability: CustomAbility): boolean {
  if (ability.ability_role === "discipline" || ability.ability_role === "talent_pool") {
    return false
  }
  if (ability.ability_role === "psionic_power") return true
  if (ability.ability_role === "alchemist_bomb") return true
  if (ability.psionic_augments?.augments?.length) return true
  if (ability.casting_time) return true
  const item: ActivatableItem = {
    name: ability.name,
    description: ability.description,
    limitedUses: ability.uses,
    linkedModifiers: ability.linked_modifiers ?? undefined,
  }
  if (kindsFromLinkedModifiers(item.linkedModifiers).length) return true
  if (kindsFromText(item.description).length) return true
  return false
}

function customAbilitySourceLabel(ability: CustomAbility): string {
  if (ability.attached_to_type === "class" && ability.source) return ability.source
  return ability.source?.trim() || "Custom Ability"
}

function pushCustomAbilityActions(
  actions: SheetActionEntry[],
  abilities: CustomAbility[] | undefined,
  levelCap: number,
  classId: string | null,
) {
  for (const ability of abilities ?? []) {
    if (!isCustomAbilityAction(ability)) continue
    if (ability.level_requirement != null && ability.level_requirement > levelCap) continue

    const item: ActivatableItem = {
      name: ability.name,
      description: ability.description,
      limitedUses: ability.uses,
      linkedModifiers: ability.linked_modifiers ?? undefined,
    }

    const castingKinds = kindsFromCastingTime(ability.casting_time)
    const linkedKinds = castingKinds.length ? [] : kindsFromLinkedModifiers(item.linkedModifiers)
    const kinds = castingKinds.length
      ? castingKinds
      : linkedKinds.length
        ? linkedKinds
        : kindsFromText(item.description)

    if (!kinds.length && ability.ability_role === "psionic_power") {
      kinds.push("action")
    }
    if (!kinds.length && ability.ability_role === "alchemist_bomb") {
      kinds.push("action")
    }
    if (!kinds.length) continue

    actions.push({
      id: `ability:${ability.id}`,
      name: ability.name,
      sourceLabel: customAbilitySourceLabel(ability),
      kinds,
      category: classifyActionCategory(item),
      limitedUses: ability.uses,
      classLevel: levelCap,
      description: ability.description ?? null,
      classId: ability.attached_to_type === "class" ? (ability.attached_to_id ?? classId) : classId,
      classResourceKey: resolveActionResourceKey(item),
      customAbilityId: ability.id,
      psionicAugments: resolvePsionicAugments(ability),
      castingTime: ability.casting_time ?? null,
      range: ability.range ?? null,
      components: ability.components ?? null,
      duration: ability.duration ?? null,
      concentration: ability.concentration,
    })
  }
}

export function collectSheetActions(params: {
  classDetails: CharacterClassDetail[]
  species: Species | null
  backgroundFeature?: ActivatableItem | null
  customAbilities?: CustomAbility[]
  featureChoicePicks?: Record<string, string[]>
}): SheetActionEntry[] {
  const actions: SheetActionEntry[] = []
  const featureChoicePicks = params.featureChoicePicks

  for (const entry of params.classDetails) {
    const className = entry.class?.name ?? "Class"
    pushFeatureActions(
      actions,
      entry.class?.features as Feature[] | undefined,
      entry.row.level,
      className,
      entry.row.class_id,
      entry.row.class_id,
      featureChoicePicks,
    )
    if (entry.subclass) {
      pushFeatureActions(
        actions,
        entry.subclass.features as Feature[] | undefined,
        entry.row.level,
        entry.subclass.name,
        `sub-${entry.subclass.id}`,
        entry.row.class_id,
        featureChoicePicks,
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

  if (params.customAbilities?.length) {
    pushCustomAbilityActions(actions, params.customAbilities, Math.max(totalLevel, 1), null)
  }

  const seen = new Set<string>()
  return actions.filter((action) => {
    if (seen.has(action.id)) return false
    seen.add(action.id)
    return true
  })
}

export const ACTION_KIND_LABELS: Record<ActionEconomyKind, string> = {
  action: "Action",
  bonus: "Bonus Action",
  reaction: "Reaction",
}

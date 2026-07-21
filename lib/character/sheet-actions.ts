import { featureChoiceKey } from "@/lib/builder/choices"
import { isDisciplinePackageAbility } from "@/lib/builder/aggregate-psionic-talents"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { DEFAULT_SHEET_ACTIONS } from "@/lib/character/default-actions"
import { resolveFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import type {
  CharacteristicModifier,
  SpecialAttackCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
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
  /** Structured attack/damage profile when this action is a special attack power. */
  specialAttack?: SpecialAttackCharacteristic | null
  castingTime?: string | null
  range?: string | null
  components?: string[] | null
  duration?: string | null
  concentration?: boolean
  /** Talent / rider alerts that modify this action without their own roll card. */
  relatedTalentAlerts?: SheetActionTalentAlert[]
  /** Menu options from resource_ability_menu (for HD spend pickers and rider matching). */
  menuOptions?: SheetActionMenuOption[]
  /** Hit Dice spent when this action is used (feature activation.spendHitDice). */
  spendHitDice?: number | null
  /** Hit die sides for this action's owning class (e.g. Draconic Vengeance damage). */
  hitDieSides?: number | null
}

export type SheetActionMenuOption = {
  name: string
  description?: string
  resourceCost?: number
  hitDiceCost?: number | null
  unlocksAtLevel?: number | null
}

export type SheetActionTalentAlert = {
  name: string
  summary: string
  description?: string | null
  sourceLabel?: string | null
  /** Internal: powers this alert attaches to (stripped before UI if needed). */
  parentPowerNames?: string[]
  /** When set, attach only if the parent action lists a matching menu option. */
  parentMenuOptionNames?: string[]
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
  /\b(?:attacks?|attacking|damage|weapons?|enem(?:y|ies)|foe|hostile|armou?r class|bloodied|initiative|smite|sneak attack|opportunity attack|hit points?|psi points?|psionic)\b/i

/** Resource keys that always place a spend action on the Combat tab. */
const COMBAT_CLASS_RESOURCE_KEYS = new Set<string>([
  // Keep in sync with ACTION_PANEL_CLASS_RESOURCE_IDS (avoid importing that module —
  // class-resource-display → modifier-catalog → feature-sheet-display → this file).
  "second_wind",
  "psi_points",
])

/** Description phrasings that imply an action-economy cost when no structured activation exists. */
const ACTION_TEXT_PATTERNS: { re: RegExp; kind: ActionEconomyKind }[] = [
  { re: /\bas a bonus action\b/i, kind: "bonus" },
  { re: /\bas a reaction\b/i, kind: "reaction" },
  { re: /\btake a reaction\b/i, kind: "reaction" },
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
  // Drop-to-0 features (Survive) surface as reactions so they appear on the combat panel.
  if (activation.onDropToZeroHp && !kinds.includes("reaction")) kinds.push("reaction")
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
    const fromActivation = activationKinds(instance.activation)
    for (const kind of fromActivation) kinds.add(kind)
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "healing_dice_pool") {
        kinds.add(characteristic.activation === "bonus_action" ? "bonus" : "action")
      } else if (
        REACTION_TRIGGER_TYPES.has(characteristic.type) &&
        (characteristic as { useReaction?: boolean }).useReaction
      ) {
        kinds.add("reaction")
      } else if (characteristic.type === "special_attack" && !fromActivation.length) {
        // Special attacks are combat Actions unless activation was set otherwise.
        kinds.add("action")
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
function classifyActionCategory(
  item: ActivatableItem,
  opts?: { preferCombat?: boolean },
): SheetActionCategory {
  if (opts?.preferCombat) return "combat"

  const resourceKey = resolveActionResourceKey(item)
  if (resourceKey && COMBAT_CLASS_RESOURCE_KEYS.has(resourceKey)) return "combat"

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

function resolveSpecialAttack(
  item: ActivatableItem,
  classLevel?: number,
): SpecialAttackCharacteristic | null {
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "special_attack") {
        const attack = characteristic as SpecialAttackCharacteristic
        // Earthshatter: 5 ft → 10 ft at Warden 14.
        if (/^earthshatter$/i.test(item.name) && (classLevel ?? 0) >= 14) {
          return {
            ...attack,
            areaLengthFeet: 10,
            rangeFeet: 10,
            label:
              attack.label?.replace(/5\s*ft/i, "10 ft") ??
              "Earthshatter — replace one Attack; 10-foot slam (Warden 14+)",
          }
        }
        return attack
      }
    }
  }
  return null
}

function resolveMenuOptions(item: ActivatableItem): SheetActionMenuOption[] {
  const options: SheetActionMenuOption[] = []
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type !== "resource_ability_menu") continue
      for (const option of characteristic.options ?? []) {
        options.push({
          name: option.name,
          description: option.description,
          resourceCost: option.resourceCost,
          hitDiceCost: option.hitDiceCost ?? null,
          unlocksAtLevel: option.unlocksAtLevel ?? null,
        })
      }
    }
  }
  return options
}

function resolveSpendHitDice(item: ActivatableItem): number | null {
  const fromActivation = item.activation?.spendHitDice
  if (fromActivation != null && fromActivation > 0) return fromActivation
  for (const instance of item.linkedModifiers ?? []) {
    const linked = instance.activation?.spendHitDice
    if (linked != null && linked > 0) return linked
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
  const fromText = baseKinds.length || linkedKinds.length ? [] : kindsFromText(item.description)
  const resolved = baseKinds.length
    ? baseKinds
    : linkedKinds.length
      ? linkedKinds
      : fromText
  if (resolved.length) return resolved
  // Hit Dice–fueled menus (Mortal Metamagic) and spend activations need a sheet card
  // even when the source is "when you cast" rather than a discrete action economy cost.
  if (
    resolveSpendHitDice(item) != null ||
    resolveMenuOptions(item).some((option) => (option.hitDiceCost ?? 0) > 0)
  ) {
    return ["action"]
  }
  return []
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

const STANDARD_ACTION_DEFAULT_ACTIONS: Array<{
  flag: "standardActionStudy" | "standardActionSearch"
  actionId: string
}> = [
  { flag: "standardActionStudy", actionId: "study" },
  { flag: "standardActionSearch", actionId: "search" },
]

type MovementOptionExpansion = {
  actionKey: string
  name: string
  description: string
  kinds: ActionEconomyKind[]
  category: SheetActionCategory
}

function expansionsFromStandardActions(
  instance: LinkedModifierInstance,
): MovementOptionExpansion[] {
  const kinds = activationKinds(instance.activation)
  if (!kinds.length) return []
  if (kinds.every((kind) => kind === "action")) return []

  const expansions: MovementOptionExpansion[] = []
  for (const effect of instance.activation?.effects ?? []) {
    if ((effect as { kind?: string }).kind !== "standard_action") continue
    for (const { flag, actionId } of STANDARD_ACTION_DEFAULT_ACTIONS) {
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
  }
  return expansions
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
    for (const expansion of [
      ...expansionsFromMovementOptions(feature, instance),
      ...expansionsFromStandardActions(instance),
    ]) {
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
  const hasNonExpansionEffect = (feature.linkedModifiers ?? []).some((instance) =>
    (instance.activation?.effects ?? []).some((effect) => {
      const kind = (effect as { kind?: string }).kind
      return kind && kind !== "movement_option" && kind !== "standard_action"
    }),
  )
  const hasPassiveCharacteristics = (feature.linkedModifiers ?? []).some(
    (instance) => (instance.characteristics?.length ?? 0) > 0,
  )
  // Feats like Keen Mind also grant ASI/skills — keep the parent card.
  if (hasPassiveCharacteristics || hasNonExpansionEffect) return false
  return true
}

function pushActivatableItemActions(
  actions: SheetActionEntry[],
  feature: ActivatableItem,
  levelCap: number,
  sourceLabel: string,
  idPrefix: string,
  classId: string | null,
  hitDieSides?: number | null,
) {
  if ((feature.level ?? 1) > levelCap) return
  const display = resolveFeatureSheetDisplay(feature as unknown as Feature)
  const movementExpansions = collectMovementOptionExpansions(feature)
  const suppressParent = suppressParentForMovementExpansions(feature, movementExpansions)

  if (!suppressParent) {
    const kinds = inferActivatableActionKinds(feature)
    if (kinds.length) {
      const inferredCategory = inferActivatableActionCategory(feature)
      const category: SheetActionCategory =
        display.combatActions && !display.abilitiesActions
          ? "combat"
          : display.abilitiesActions && !display.combatActions
            ? "utility"
            : inferredCategory
      if (
        (category !== "combat" || display.combatActions) &&
        (category !== "utility" || display.abilitiesActions)
      ) {
        const menuOptions = resolveMenuOptions(feature)
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
          specialAttack: resolveSpecialAttack(feature, levelCap),
          menuOptions: menuOptions.length ? menuOptions : undefined,
          spendHitDice: resolveSpendHitDice(feature),
          hitDieSides: hitDieSides ?? null,
          psionicAugments: resolvePsionicAugments({
            name: feature.name,
            description: feature.description ?? null,
            psionic_augments: null,
          }),
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
      spendHitDice: resolveSpendHitDice(feature),
      hitDieSides: hitDieSides ?? null,
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
  hitDieSides?: number | null,
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
      hitDieSides,
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
  hitDieSides?: number | null,
) {
  for (const feature of features ?? []) {
    pushActivatableItemActions(
      actions,
      feature,
      levelCap,
      sourceLabel,
      idPrefix,
      classId,
      hitDieSides,
    )
    pushPickedChoiceOptionActions(
      actions,
      feature as Feature,
      levelCap,
      sourceLabel,
      idPrefix,
      classId,
      featureChoicePicks,
      hitDieSides,
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
  if (ability.execution) return true
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

function preferCombatForAbility(ability: CustomAbility, item: ActivatableItem): boolean {
  if (ability.ability_role === "psionic_power") return true
  if (ability.psionic_augments?.augments?.length) return true
  for (const instance of item.linkedModifiers ?? []) {
    if ((instance.characteristics ?? []).some((char) => char.type === "special_attack")) {
      return true
    }
  }
  return false
}

function pushCustomAbilityActions(
  actions: SheetActionEntry[],
  abilities: CustomAbility[] | undefined,
  levelCap: number,
  classId: string | null,
) {
  const seenPowerNames = new Set<string>()

  for (const ability of abilities ?? []) {
    if (!isCustomAbilityAction(ability)) continue
    if (ability.level_requirement != null && ability.level_requirement > levelCap) continue

    const item: ActivatableItem = {
      name: ability.name,
      description: ability.description,
      limitedUses: ability.uses,
      linkedModifiers: ability.linked_modifiers ?? undefined,
    }

    const castingKinds = kindsFromCastingTime(ability.casting_time ?? ability.execution)
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

    seenPowerNames.add(normalizePickName(ability.name))
    actions.push({
      id: `ability:${ability.id}`,
      name: ability.name,
      sourceLabel: customAbilitySourceLabel(ability),
      kinds,
      category: classifyActionCategory(item, {
        preferCombat: preferCombatForAbility(ability, item),
      }),
      limitedUses: ability.uses,
      classLevel: levelCap,
      description: ability.description ?? null,
      classId: ability.attached_to_type === "class" ? (ability.attached_to_id ?? classId) : classId,
      classResourceKey: resolveActionResourceKey(item),
      customAbilityId: ability.id,
      psionicAugments: resolvePsionicAugments(ability),
      specialAttack: resolveSpecialAttack(item),
      castingTime: ability.casting_time ?? ability.execution ?? null,
      range: ability.range ?? null,
      components: ability.components ?? null,
      duration: ability.duration ?? null,
      concentration: ability.concentration,
    })
  }

  // Fallback: known discipline packages may only nest powers in modifier_catalog
  // (no sibling psionic_power rows). Promote Psionic Powers / special attacks onto Combat.
  for (const ability of abilities ?? []) {
    if (!isDisciplinePackageAbility(ability)) continue
    const catalog = ability.modifier_catalog
    if (!Array.isArray(catalog) || !catalog.length) continue

    for (const entry of catalog) {
      const group = String(entry.group ?? "")
      const isPowerGroup = /psionic\s+powers?/i.test(group)
      const hasSpecialAttack = (entry.characteristics ?? []).some(
        (char) => char.type === "special_attack",
      )
      if (!isPowerGroup && !hasSpecialAttack) continue

      const entryName = String(entry.name ?? "").trim()
      if (!entryName || seenPowerNames.has(normalizePickName(entryName))) continue

      const linkedModifiers: LinkedModifierInstance[] = [
        {
          instanceId: `modinst_catalog_${ability.id}_${entry.id}`,
          catalogRefId: entry.id,
          characteristics: entry.characteristics ?? [],
          activation: entry.activation ?? null,
        },
      ]
      const item: ActivatableItem = {
        name: entryName,
        description: entry.description ?? entry.summary ?? null,
        linkedModifiers,
      }
      const castingKinds = kindsFromCastingTime(entry.summary)
      const linkedKinds = castingKinds.length ? [] : kindsFromLinkedModifiers(linkedModifiers)
      const kinds = castingKinds.length
        ? castingKinds
        : linkedKinds.length
          ? linkedKinds
          : kindsFromText(item.description)
      if (!kinds.length && (isPowerGroup || hasSpecialAttack)) {
        kinds.push("action")
      }
      if (!kinds.length) continue

      seenPowerNames.add(normalizePickName(entryName))
      actions.push({
        id: `ability:${ability.id}:catalog:${entry.id}`,
        name: entryName,
        sourceLabel: ability.name,
        kinds,
        category: classifyActionCategory(item, { preferCombat: true }),
        limitedUses: null,
        classLevel: levelCap,
        description: entry.description ?? entry.summary ?? null,
        classId: ability.attached_to_type === "class" ? (ability.attached_to_id ?? classId) : classId,
        classResourceKey: resolveActionResourceKey(item),
        customAbilityId: ability.id,
        psionicAugments: resolvePsionicAugments({
          name: entryName,
          description: entry.description ?? entry.summary ?? null,
          psionic_augments: null,
        }),
        specialAttack: resolveSpecialAttack(item),
        castingTime: entry.summary?.match(/\b\d+\s+(?:bonus\s+)?action\b/i)?.[0] ?? null,
      })
    }
  }
}

function normalizePickName(value: string): string {
  return value.trim().toLowerCase()
}

function collectTalentAlertsFromFeatures(
  classDetails: CharacterClassDetail[],
): SheetActionTalentAlert[] {
  const alerts: SheetActionTalentAlert[] = []
  const seen = new Set<string>()

  const resolvePowerRiderSummary = (
    featureName: string,
    char: { alertSummary?: string; label?: string },
    levelCap: number,
  ): string => {
    if (/^grasping vines$/i.test(featureName)) {
      return levelCap >= 14
        ? "Grasp Emanation is 15 feet for creatures on the ground."
        : "Grasp Emanation is 10 feet for creatures on the ground (15 feet at Warden 14)."
    }
    return char.alertSummary?.trim() || char.label?.trim() || featureName
  }

  const considerFeature = (
    feature: ActivatableItem,
    sourceLabel: string,
    levelCap: number,
  ) => {
    if ((feature.level ?? 1) > levelCap) return
    for (const instance of feature.linkedModifiers ?? []) {
      for (const char of instance.characteristics ?? []) {
        if (char.type !== "power_rider") continue
        const key = `${feature.name}::${char.parentPowerNames.join("|")}`
        if (seen.has(key)) continue
        seen.add(key)
        alerts.push({
          name: feature.name,
          summary: resolvePowerRiderSummary(feature.name, char, levelCap),
          description: feature.description ?? null,
          sourceLabel,
          parentPowerNames: char.parentPowerNames,
          parentMenuOptionNames: char.parentMenuOptionNames,
        })
      }
    }
  }

  for (const entry of classDetails) {
    const level = entry.row.level ?? 1
    for (const feature of (entry.class?.features ?? []) as ActivatableItem[]) {
      considerFeature(feature, entry.class?.name ?? "Class", level)
    }
    if (entry.subclass) {
      for (const feature of (entry.subclass.features ?? []) as ActivatableItem[]) {
        considerFeature(feature, entry.subclass.name, level)
      }
    }
  }

  return alerts
}

function collectTalentAlertsFromCustomAbilities(
  abilities: CustomAbility[] | undefined,
  featureChoicePicks: Record<string, string[]> | undefined,
): SheetActionTalentAlert[] {
  if (!abilities?.length) return []
  const picked = new Set(
    Object.values(featureChoicePicks ?? {})
      .flat()
      .map(normalizePickName)
      .filter(Boolean),
  )
  const alerts: SheetActionTalentAlert[] = []
  const seen = new Set<string>()

  const considerOption = (
    option: {
      name: string
      description?: string | null
      linkedModifiers?: LinkedModifierInstance[]
    },
    sourceLabel: string,
    forceInclude: boolean,
  ) => {
    const isPicked =
      forceInclude ||
      picked.has(normalizePickName(option.name)) ||
      [...picked].some(
        (pick) =>
          normalizePickName(option.name).includes(pick) || pick.includes(normalizePickName(option.name)),
      )
    if (!isPicked) return
    for (const instance of option.linkedModifiers ?? []) {
      for (const char of instance.characteristics ?? []) {
        if (char.type !== "power_rider") continue
        const key = `${option.name}::${char.parentPowerNames.join("|")}`
        if (seen.has(key)) continue
        seen.add(key)
        alerts.push({
          name: option.name,
          summary: char.alertSummary?.trim() || char.label?.trim() || option.name,
          description: option.description ?? null,
          sourceLabel,
          parentPowerNames: char.parentPowerNames,
          parentMenuOptionNames: char.parentMenuOptionNames,
        })
      }
    }
  }

  for (const ability of abilities) {
    const sourceLabel = customAbilitySourceLabel(ability)
    for (const option of ability.choices?.options ?? []) {
      considerOption(option, sourceLabel, false)
    }
    for (const option of ability.specialization_choices?.options ?? []) {
      considerOption(option, sourceLabel, false)
    }
    const talentPicked =
      picked.size === 0 ||
      picked.has(normalizePickName(ability.name)) ||
      [...picked].some(
        (pick) =>
          normalizePickName(ability.name).includes(pick) ||
          pick.includes(normalizePickName(ability.name)),
      )
    if (ability.ability_role === "class_talent" && talentPicked) {
      for (const instance of ability.linked_modifiers ?? []) {
        for (const char of instance.characteristics ?? []) {
          if (char.type !== "power_rider") continue
          const key = `${ability.name}::${char.parentPowerNames.join("|")}`
          if (seen.has(key)) continue
          seen.add(key)
          alerts.push({
            name: ability.name,
            summary: char.alertSummary?.trim() || char.label?.trim() || ability.name,
            description: ability.description ?? null,
            sourceLabel,
            parentPowerNames: char.parentPowerNames,
            parentMenuOptionNames: char.parentMenuOptionNames,
          })
        }
      }
    }
  }

  return alerts
}

function attachTalentAlertsToActions(
  actions: SheetActionEntry[],
  alerts: SheetActionTalentAlert[],
): SheetActionEntry[] {
  if (!alerts.length) return actions
  return actions.map((action) => {
    const matched = alerts.filter((alert) => {
      const powerMatch = (alert.parentPowerNames ?? []).some((parent) => {
        const p = normalizePickName(parent)
        const n = normalizePickName(action.name)
        return n === p || n.includes(p) || p.includes(n)
      })
      if (!powerMatch) return false
      const menuFilters = (alert.parentMenuOptionNames ?? [])
        .map((name) => normalizePickName(name))
        .filter(Boolean)
      if (!menuFilters.length) return true
      const actionMenus = (action.menuOptions ?? []).map((option) => normalizePickName(option.name))
      return menuFilters.some((filter) =>
        actionMenus.some(
          (optionName) =>
            optionName === filter || optionName.includes(filter) || filter.includes(optionName),
        ),
      )
    })
    if (!matched.length) return action
    return {
      ...action,
      relatedTalentAlerts: matched.map(
        ({ name, summary, description, sourceLabel, parentMenuOptionNames }) => ({
          name,
          summary,
          description,
          sourceLabel,
          parentMenuOptionNames,
        }),
      ),
    }
  })
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
    const hitDieSides = entry.class?.hit_die ?? null
    pushFeatureActions(
      actions,
      entry.class?.features as Feature[] | undefined,
      entry.row.level,
      className,
      entry.row.class_id,
      entry.row.class_id,
      featureChoicePicks,
      hitDieSides,
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
        hitDieSides,
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

  const withRiders = attachTalentAlertsToActions(actions, [
    ...collectTalentAlertsFromFeatures(params.classDetails),
    ...collectTalentAlertsFromCustomAbilities(params.customAbilities, featureChoicePicks),
  ])

  const seen = new Set<string>()
  return withRiders.filter((action) => {
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

import { featureChoiceKey } from "@/lib/builder/choices"
import { chosenDamageTypesFromCharacteristics } from "@/lib/builder/modifier-player-choices"
import { withChosenOptionChrome } from "@/lib/character/chosen-option-label"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import { isBombFormulaAbility } from "@/lib/builder/aggregate-bomb-formulas"
import { isDisciplinePackageAbility } from "@/lib/builder/aggregate-psionic-talents"
import {
  expandAlchemistBombProfiles,
  isAlchemistBombName,
  isPrimeBombName,
  isShortRestActivityText,
  looksLikePrimeBombRiderText,
  looksLikeSelectableBombRider,
  resolveBombRiderAttackVariants,
  shouldSuppressStandaloneBombCard,
} from "@/lib/character/alchemist-bomb-sheet"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { isHitPointsResourceKey } from "@/lib/character/hit-point-spend"
import { resolveHitDiceHealCount } from "@/lib/character/resolve-feature-effect-heal"
import { DEFAULT_SHEET_ACTIONS } from "@/lib/character/default-actions"
import {
  hasManeuverSpendText,
  inferClassResourceSpendFromText,
  inferredSpendToLimitedUses,
} from "@/lib/character/infer-class-resource-spend"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import { resolveFixedValueAtLevel } from "@/lib/compendium/bonus-by-level"
import {
  descriptionBeforeChooseOneOptions,
  inferMenuOptionActionKind,
  parseChooseOneNamedOptions,
} from "@/lib/compendium/choose-one-named-options"
import { resolveFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import {
  collectReplacedFeatureNames,
  featureHasReplaceModifier,
  featureIsReplaced,
  resolveFirstUseNoAction,
} from "@/lib/character/replace-feature"
import { isWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import {
  resolveUsesConfig,
  type BonusDamageRiderEntry,
  type BonusDamageRidersCharacteristic,
  type CharacteristicModifier,
  type SpecialAttackCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { PsionicAugmentsConfig } from "@/lib/compendium/parse-psionic-augments"
import { resolvePsionicAugments } from "@/lib/compendium/resolve-psionic-augments"
import { resolveSpecialAttackAtLevel } from "@/lib/character/special-attack-empower"
import { resolveAttachedClassIcon } from "@/lib/compendium/class-icons-defaults"
import { resolveSpecialAttackIcon } from "@/lib/compendium/special-attack-icons-defaults"
import {
  collectActionUseBonuses,
  type SheetActionUseBonus,
} from "@/lib/character/action-use-bonuses"
import {
  collectCastSpellEffects,
  type SheetCastSpellChoice,
} from "@/lib/character/cast-spell-choice"
import {
  inferAllyBuffEffect,
  inferAllyHealEffect,
  inferDirectCompanionEffect,
  inferGrantInspirationEffect,
  shouldCollectTargetableEffect,
} from "@/lib/character/effect-target-policy"
import type { CustomAbility, Feat, Feature, FeatureActivation, FeatureEffect, Species, UsesConfig } from "@/lib/types"

export type ActionEconomyKind = "action" | "bonus" | "reaction"

/** Combat actions live on the Combat tab; utility actions on the Abilities & Skills tab. */
export type SheetActionCategory = "combat" | "utility"

export type SheetActionEntry = {
  id: string
  name: string
  sourceLabel: string
  kinds: ActionEconomyKind[]
  /**
   * Event that lets the player use this without paying an Action, Bonus Action, or Reaction
   * (e.g. "On a hit", "No action required"). Set only when there is no action-economy cost.
   */
  trigger?: string | null
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
  /** Ability role for custom abilities (e.g. psionic_power). */
  abilityRole?: string | null
  psionicAugments?: PsionicAugmentsConfig | null
  /** game-icons slug shown on the combat/utility card. */
  icon?: string | null
  /** Owning class/subclass icon used when the action has no more specific art. */
  sourceIcon?: string | null
  /** Structured attack/damage profile when this action is a special attack power. */
  specialAttack?: SpecialAttackCharacteristic | null
  /** All selectable profiles when one action supports multiple modes (Bomb Attack / Explode). */
  specialAttacks?: SpecialAttackCharacteristic[]
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
  /** Current HP spent when this action is used (bypass temp HP). */
  spendHitPoints?: number | null
  /** After spending HP, offer a refund if the triggering roll still fails. */
  refundHitPointsOnStillFailed?: boolean
  /** Hit die sides for this action's owning class (e.g. Draconic Vengeance damage). */
  hitDieSides?: number | null
  /** Heal, temp HP, and other ally-targetable effects applied when the action is used. */
  healEffects?: FeatureEffect[]
  /** Resolved roll bonuses (PB, ability mod, advantage) shown on the Use overlay. */
  useBonuses?: SheetActionUseBonus[]
  /** Cast a known spell (optionally filtered by casting time) instead of picking a target. */
  castSpellChoice?: SheetCastSpellChoice
  /**
   * When false, Use does not mark Action/Bonus/Reaction spent
   * (Reckless Attack and similar free declarations).
   */
  spendsEconomy?: boolean
  /** Magical Cunning: restore Pact Magic slots when this action is used. */
  restorePactSlotsOnUse?: "half_round_up" | "all"
  /** Arcane Recovery: restore expended slots by combined level (half class level, round up). */
  restoreSpellSlotsOnUse?: {
    mode: "combined_level_half_up"
    maxSlotLevel: number
  }
  /** When set, overrides category for Combat tab listing. */
  showOnCombatTab?: boolean
  /** When set, overrides category for Abilities tab listing. */
  showOnAbilitiesTab?: boolean
  /** When set, controls Short/Long Rest overlay listing. */
  showOnRestDialogues?: boolean
  /**
   * Always-on reminder (chosen resistance, Energy Mastery, etc.). Filed under Passive
   * and has no Use button.
   */
  reminderOnly?: boolean
  /** First use each turn does not mark Action / Bonus / Reaction spent. */
  firstUseNoAction?: boolean
  /** Divine Respite and similar: regain up to this many expended Hit Point Dice. */
  restoreHitDiceOnUse?: {
    amount: number
    restoreOn?: "short_rest" | "long_rest"
  }
  /** Dark Arcana: spend a spell slot to refill a class resource. */
  restoreResourceFromSpellSlotOnUse?: {
    resourceKey: string
    ability: "INT" | "WIS" | "CHA" | "STR" | "DEX" | "CON"
  }
  /** Traditional Expertise: expend a spell slot when this action is used. */
  spendSpellSlotOnUse?: {
    minSpellLevel: number
  }
  /** Drop-to-0 escape hatches: Use sets current HP to 1. */
  dropToOneHpOnUse?: boolean
  /** Sibling feature names resolved into `alsoActivate` after collect. */
  alsoActivateFeatureNames?: string[]
  /** Sibling features the player may fire after using this one (no extra action cost). */
  alsoActivate?: SheetAlsoActivateAction[]
  /** Persistent editable notes requested by player_note characteristics. */
  playerNotes?: SheetPlayerNote[]
  /** Mundane item linkers that can be changed by the player (Dead Space, etc.). */
  equipmentChoices?: SheetEquipmentChoice[]
}

export type SheetPlayerNote = {
  id: string
  prompt: string
  placeholder?: string
}

export type SheetEquipmentChoice = {
  id: string
  label: string
  options: string[]
  allowCustom: boolean
}

export type SheetAlsoActivateAction = {
  name: string
  spendHitDice?: number | null
  healEffects?: FeatureEffect[]
  classLevel?: number
  classId?: string | null
  hitDieSides?: number | null
}

export type SheetActionMenuOption = {
  name: string
  description?: string
  resourceCost?: number
  actionKind?: ActionEconomyKind
  hitDiceCost?: number | null
  unlocksAtLevel?: number | null
  /** Cost paid in dice rather than a tracked pool (e.g. "1d6 Sneak Attack die"). */
  costLabel?: string | null
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
  /** When set, only show this rider for these Bomb modes. */
  appliesToAttackVariants?: Array<"attack" | "primed" | "explode">
  /** When true, the dialog offers this rider as an optional add-on. */
  selectable?: boolean
  /** When selected, replace the parent action's HP spend with this amount. */
  spendHitPoints?: number
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
  "cast_spell",
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
  "failed_roll_trigger",
])

const COMBAT_TEXT_RE =
  /\b(?:attacks?|attacking|damage|weapons?|enem(?:y|ies)|foe|hostile|armou?r class|bloodied|initiative|smite|sneak attack|opportunity attack|hit points?|psi points?|psionic)\b/i

/** Resource keys that always place a spend action on the Combat tab. */
const COMBAT_CLASS_RESOURCE_KEYS = new Set<string>([
  // Keep in sync with ACTION_PANEL_CLASS_RESOURCE_IDS (avoid importing that module —
  // class-resource-display → modifier-catalog → feature-sheet-display → this file).
  "second_wind",
  "psi_points",
  "battle_dice",
  "risk_dice",
  "exploit_dice",
  "endurance_dice",
  "charnel_touch",
  "dances",
  "arcane_surge",
  "spell_uses",
  "remedy_dice",
  "interrupt",
  "focus_points",
])

/** Description phrasings that imply an action-economy cost when no structured activation exists. */
const ACTION_TEXT_PATTERNS: { re: RegExp; kind: ActionEconomyKind }[] = [
  { re: /\bas a bonus action\b/i, kind: "bonus" },
  { re: /\ba bonus action\b/i, kind: "bonus" },
  { re: /\bas a reaction\b/i, kind: "reaction" },
  { re: /\btake a reaction\b/i, kind: "reaction" },
  { re: /\ba reaction\b/i, kind: "reaction" },
  { re: /\bas an? (?:magic )?action\b/i, kind: "action" },
  { re: /\bas a magic action\b/i, kind: "action" },
]

const ACTION_OR_BONUS_RE =
  /(?:magic\s+)?action\s+or\s+(?:a\s+)?bonus\s+action|bonus\s+action\s+or\s+(?:an?\s+)?(?:magic\s+)?action/i
const ACTION_OR_REACTION_RE =
  /(?:magic\s+)?action\s+or\s+(?:a\s+)?reaction|reaction\s+or\s+(?:an?\s+)?(?:magic\s+)?action/i
const BONUS_OR_REACTION_RE =
  /bonus\s+action\s+or\s+(?:a\s+)?reaction|reaction\s+or\s+(?:a\s+)?bonus\s+action/i

/** "as an action or a bonus action" (and similar or-pairs) — spend one of the listed economies. */
export function flexibleEconomyKindsFromText(
  description?: string | null,
): ActionEconomyKind[] {
  if (!description) return []
  const text = descriptionBeforeChooseOneOptions(description)
  const kinds = new Set<ActionEconomyKind>()
  if (ACTION_OR_BONUS_RE.test(text)) {
    kinds.add("action")
    kinds.add("bonus")
  }
  if (ACTION_OR_REACTION_RE.test(text)) {
    kinds.add("action")
    kinds.add("reaction")
  }
  if (BONUS_OR_REACTION_RE.test(text)) {
    kinds.add("bonus")
    kinds.add("reaction")
  }
  return [...kinds]
}

function unionActionKinds(
  ...lists: Array<readonly ActionEconomyKind[] | undefined>
): ActionEconomyKind[] {
  const kinds: ActionEconomyKind[] = []
  for (const list of lists) {
    for (const kind of list ?? []) {
      if (!kinds.includes(kind)) kinds.push(kind)
    }
  }
  return kinds
}

function kindsFromCastingTime(castingTime: string | null | undefined): ActionEconomyKind[] {
  if (!castingTime) return []
  const text = castingTime.toLowerCase()
  if (/\bno\s+action\b/.test(text)) return []
  const kinds = new Set<ActionEconomyKind>(flexibleEconomyKindsFromText(text))
  if (/\bbonus\s+action\b/.test(text)) kinds.add("bonus")
  if (/\breaction\b/.test(text)) kinds.add("reaction")
  if (/\b(?:magic\s+)?action\b/.test(text) && (!/\bbonus\s+action\b/.test(text) || kinds.has("action"))) {
    kinds.add("action")
  }
  return [...kinds]
}

/** When a card lists more than one economy and actually spends one, the player picks which. */
export function selectableEconomyKinds(
  kinds: readonly ActionEconomyKind[],
  spendsEconomy?: boolean,
  trigger?: string | null,
): ActionEconomyKind[] {
  if (spendsEconomy === false || trigger) return []
  const unique = [...new Set(kinds)]
  return unique.length > 1 ? unique : []
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ")
}

/** "Your Sacrificial Strike improves. When you use this feature, you can choose to take 10…" */
const PARENT_IMPROVES_CHOICE_RE =
  /\byour\s+(.+?)\s+improves\b[\s\S]{0,160}\bwhen you use this feature\b[\s\S]{0,240}\byou can choose to take\s+(\d+)\b/i

export function inferOptionalParentPowerImprovement(item: ActivatableItem): {
  parentName: string
  spendHitPoints: number
  extraAmount?: number
} | null {
  const text = stripHtml(item.description ?? "")
  const match = PARENT_IMPROVES_CHOICE_RE.exec(text)
  if (!match) return null
  const parentName = match[1].replace(/\s+/g, " ").trim()
  const spendHitPoints = parseInt(match[2], 10)
  if (!parentName || !Number.isFinite(spendHitPoints) || spendHitPoints < 1) return null
  const extraMatch = text.match(/\bextra\s+(\d+)\b/i)
  const extraAmount = extraMatch ? parseInt(extraMatch[1], 10) : undefined
  return {
    parentName,
    spendHitPoints,
    extraAmount: extraAmount != null && Number.isFinite(extraAmount) ? extraAmount : undefined,
  }
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
      } else if (characteristic.type === "hit_dice_restore") {
        kinds.add("action")
      }
    }
  }
  return [...kinds]
}

function resolvePlayerNotes(item: ActivatableItem): SheetPlayerNote[] {
  const notes: SheetPlayerNote[] = []
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type !== "player_note" || characteristic.target !== "feature") continue
      notes.push({
        id: characteristic.id,
        prompt: characteristic.prompt || "Player notes",
        placeholder: characteristic.placeholder,
      })
    }
  }
  return notes
}

function resolveEquipmentChoices(item: ActivatableItem): SheetEquipmentChoice[] {
  const choices: SheetEquipmentChoice[] = []
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (
        characteristic.type !== "equipment_and_magic_items" ||
        characteristic.mode !== "create_mundane" ||
        (characteristic.choiceCount ?? 0) < 1
      ) {
        continue
      }
      choices.push({
        id: characteristic.id,
        label: characteristic.label || "Linked item",
        options: characteristic.itemOptions ?? [],
        allowCustom: characteristic.allowCustom === true,
      })
    }
  }
  return choices
}

function resolveItemLimitedUses(item: ActivatableItem): UsesConfig | null | undefined {
  const characteristics = (item.linkedModifiers ?? []).flatMap(
    (instance) => instance.characteristics ?? [],
  )
  return resolveUsesConfig(characteristics, item.limitedUses)
}

function classResourceKeysForClass(
  cls: CharacterClassDetail["class"] | null | undefined,
): string[] {
  if (!cls) return []
  return resolveClassResourcesForClass(cls).map((row) => row.id)
}

/** Trigger characteristics that declare their own class-resource spend (Stunning Strike, Quivering Palm). */
const TRIGGER_SPEND_CHARACTERISTIC_TYPES = new Set<CharacteristicModifier["type"]>([
  "on_hit_trigger",
  "failed_roll_trigger",
  "saving_throw_trigger",
  "d20_test_reaction",
])

/**
 * Build a spend config from a trigger characteristic so the sheet card charges the authored
 * amount (Quivering Palm's 4 Focus Points) instead of defaulting to 1.
 */
function limitedUsesFromTriggerSpend(item: ActivatableItem): UsesConfig | null {
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (!TRIGGER_SPEND_CHARACTERISTIC_TYPES.has(characteristic.type)) continue
      const spend = characteristic as {
        spendResourceKey?: string | null
        spendResourceAmount?: number | null
      }
      if (!spend.spendResourceKey) continue
      if (isHitPointsResourceKey(spend.spendResourceKey)) continue
      return {
        type: "class_resource",
        classResourceKey: spend.spendResourceKey,
        classResourceAmount: Math.max(1, spend.spendResourceAmount ?? 1),
      }
    }
  }
  return null
}

function resolveLimitedUsesWithInference(
  item: ActivatableItem,
  availableKeys: readonly string[],
  extraText?: string | null,
): UsesConfig | null | undefined {
  const existing = resolveItemLimitedUses(item)
  if (existing) return existing
  const fromTrigger = limitedUsesFromTriggerSpend(item)
  if (fromTrigger) return fromTrigger
  const spend = inferClassResourceSpendFromText(
    `${item.description ?? ""} ${extraText ?? ""}`,
    availableKeys,
  )
  return spend ? inferredSpendToLimitedUses(spend) : existing
}

function haystackForItem(item: ActivatableItem, extraText?: string | null): string {
  return `${item.description ?? ""} ${extraText ?? ""}`
}

function fallbackKindsForResourceSpend(
  kinds: ActionEconomyKind[],
  limitedUses: UsesConfig | null | undefined,
  text: string,
): { kinds: ActionEconomyKind[]; spendsEconomy: boolean | undefined } {
  if (kinds.length) return { kinds, spendsEconomy: undefined }
  if (limitedUses?.type === "class_resource" || hasManeuverSpendText(text)) {
    return { kinds: ["action"], spendsEconomy: false }
  }
  return { kinds, spendsEconomy: undefined }
}

function featureUnlocked(
  classDetails: CharacterClassDetail[],
  name: RegExp,
): boolean {
  for (const entry of classDetails) {
    const level = entry.row.level ?? 0
    for (const feature of [
      ...((entry.class?.features ?? []) as Feature[]),
      ...((entry.subclass?.features ?? []) as Feature[]),
    ]) {
      if (name.test(feature.name ?? "") && (feature.level ?? 1) <= level) return true
    }
  }
  return false
}

/**
 * Phrasings that mention an action economy only to rule it out ("a spell that doesn't require a
 * Reaction to cast"). Stripped before pattern matching so they don't invent an action cost.
 */
const NEGATED_ACTION_RE =
  /\b(?:(?:does|do|did)(?:n'?t| not)\s+(?:require|need|cost|use|take)|without\s+(?:using|expending|spending|taking))\s+(?:an?\s+)?(?:bonus\s+action|reaction|magic\s+action|action)\b/gi

/** Last-resort detection of an action-economy cost from the feature/trait prose. */
function kindsFromText(description: string | null | undefined): ActionEconomyKind[] {
  if (!description) return []
  const text = descriptionBeforeChooseOneOptions(description).replace(NEGATED_ACTION_RE, " ")
  const kinds = new Set<ActionEconomyKind>()
  for (const { re, kind } of ACTION_TEXT_PATTERNS) {
    if (re.test(text)) kinds.add(kind)
  }
  return [...kinds]
}

/**
 * Events that let a player elect to spend a resource without paying an Action, Bonus Action,
 * or Reaction (Font of Inspiration, Stroke of Luck, Hurl Through Hell). First match wins.
 */
const TRIGGER_TEXT_PATTERNS: { re: RegExp; label: string }[] = [
  {
    re: /\bwhen you reduce (?:an? |the )?(?:enemy|creature|hostile creature|target) to 0 hit points\b/i,
    label: "When you reduce a creature to 0 HP",
  },
  { re: /\breduced to 0 hit points\b/i, label: "When reduced to 0 HP" },
  { re: /\b(?:when|whenever) you roll initiative\b/i, label: "When you roll Initiative" },
  { re: /\b(?:when|whenever|if) you miss\b/i, label: "When you miss" },
  { re: /\b(?:when|whenever|if) you (?:hit|score a critical hit)\b/i, label: "On a hit" },
  { re: /\b(?:when|whenever|if) you deal sneak attack damage\b/i, label: "On a hit" },
  { re: /\b(?:when|whenever|if) you fail\b/i, label: "When you fail a roll" },
  { re: /\b(?:when|whenever|if) the attack (?:fail|miss)/i, label: "When you fail a roll" },
  {
    re: /\b(?:when|whenever) you make an? (?:ability check|saving throw|attack roll|d20 test)\b/i,
    label: "When you make a D20 Test",
  },
  { re: /\b(?:when|whenever) you cast a spell\b/i, label: "When you cast a spell" },
  { re: /\bno action required\b/i, label: "No action required" },
  { re: /\bwithout (?:using|expending|spending) an action\b/i, label: "No action required" },
]

/** Prose that declares an optional expenditure ("you can expend a spell slot"). */
const TRIGGERED_SPEND_TEXT_RE =
  /\b(?:expend|spend|forgo)\s+(?:a|an|one|two|three|four|five|your|up to|\d+)\b/i

/** Wiring that proves the trigger is an elective spend rather than an automatic rider. */
function hasTriggeredSpendSignal(item: ActivatableItem): boolean {
  const uses = item.limitedUses
  if (uses && uses.type !== "unlimited") return true
  if (item.activation?.spendClassResourceKey) return true
  for (const instance of item.linkedModifiers ?? []) {
    for (const effect of instance.activation?.effects ?? []) {
      if ((effect as { kind?: string }).kind === "class_resource") return true
    }
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "uses" || characteristic.type === "bonus_damage_riders") {
        return true
      }
      if (characteristic.type === "failed_roll_trigger") return true
      if (
        TRIGGER_SPEND_CHARACTERISTIC_TYPES.has(characteristic.type) &&
        (characteristic as { spendResourceKey?: string | null }).spendResourceKey
      ) {
        return true
      }
    }
  }
  if (parseChooseOneNamedOptions(item.description).length >= 2) return true
  return TRIGGERED_SPEND_TEXT_RE.test(stripHtml(item.description ?? ""))
}

function deathTriggerLabel(filter: "enemy" | "ally" | "any" | undefined): string {
  if (filter === "ally") return "When an ally or companion dies"
  if (filter === "enemy") return "When an enemy dies"
  return "When a creature dies"
}

/** Authored trigger flags/characteristics — enough to surface a card without a spend signal. */
function authoredTriggerLabel(item: ActivatableItem): string | null {
  if (item.activation?.onInitiative) return "When you roll Initiative"
  if (item.activation?.onDropToZeroHp) return "When reduced to 0 HP"
  if (item.activation?.onFailedSave) return "When you fail a save"
  for (const instance of item.linkedModifiers ?? []) {
    if (instance.activation?.onInitiative) return "When you roll Initiative"
    if (instance.activation?.onDropToZeroHp) return "When reduced to 0 HP"
    if (instance.activation?.onFailedSave) return "When you fail a save"
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "on_creature_death_trigger") {
        return deathTriggerLabel(characteristic.creatureFilter)
      }
    }
  }
  return null
}

function triggerLabelFromWiring(item: ActivatableItem): string | null {
  const authored = authoredTriggerLabel(item)
  if (authored) return authored
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "bonus_damage_riders" || characteristic.type === "on_hit_trigger") {
        return "On a hit"
      }
      if (characteristic.type === "failed_roll_trigger") {
        return characteristic.triggerOn === "success"
          ? "When you succeed on a roll"
          : "When you fail a roll"
      }
    }
  }
  return null
}

/**
 * Label for a feature that fires off an event (initiative, companion death, elective spend)
 * but costs no action economy. These need a sheet card so the trigger is visible, yet they
 * must not be filed under Action / Bonus Action / Reaction. Returns null when the feature
 * already has an action cost.
 */
export function resolveTriggeredActivationLabel(item: ActivatableItem): string | null {
  if (explicitActionKinds(item).length) return null
  const authored = authoredTriggerLabel(item)
  if (authored) return authored
  if (!hasTriggeredSpendSignal(item)) return null
  const fromWiring = triggerLabelFromWiring(item)
  if (fromWiring) return fromWiring
  const text = stripHtml(item.description ?? "")
  for (const { re, label } of TRIGGER_TEXT_PATTERNS) {
    if (re.test(text)) return label
  }
  if (parseChooseOneNamedOptions(item.description).length >= 2) return "Choose one"
  return null
}

/** Decide whether an action belongs on the Combat tab or the Abilities & Skills (utility) tab. */
function classifyActionCategory(
  item: ActivatableItem,
  opts?: { preferCombat?: boolean },
): SheetActionCategory {
  if (opts?.preferCombat) return "combat"
  if (/^potion mixologist$/i.test(item.name.trim())) return "combat"

  const haystack = `${item.name} ${stripHtml(item.description ?? "")}`
  if (isUtilityOnlyHaystack(haystack) || isShortRestActivityText(item.name, item.description)) {
    return "utility"
  }

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
  if (COMBAT_TEXT_RE.test(haystack)) return "combat"

  // A Reaction only exists inside the turn order, and a Bonus Action that burns a limited pool
  // is nearly always a fight resource (Bardic Inspiration, Nature's Veil, Dragon Wings) even when
  // its rules text never says "attack" or "damage".
  const kinds = explicitActionKinds(item)
  if (kinds.includes("reaction")) return "combat"
  if (kinds.includes("bonus") && spendsLimitedPool(item) && !isUtilityOnlyHaystack(haystack)) {
    return "combat"
  }
  return "utility"
}

/** Downtime / exploration wording that keeps a spend off the Combat tab. */
const UTILITY_ONLY_TEXT_RE =
  /\b(?:craft(?:ing|ed|s)?|brew(?:ing|ed)?|forge|forging|downtime|workshop|artisan|smith'?s tools|between adventures|over the course of|8 hours|during a (?:short|long) rest|while you travel|travel(?:ing)? pace)\b/i
const SPEND_MINUTES_ACTIVITY_RE = /\b(?:spend|take)\b(?:\s+\w+){0,6}\s+\d+\s+minutes?\b/i

function isUtilityOnlyHaystack(haystack: string): boolean {
  return UTILITY_ONLY_TEXT_RE.test(haystack) || SPEND_MINUTES_ACTIVITY_RE.test(haystack)
}

/** True when using the item draws down a finite pool (its own uses or a class resource). */
function spendsLimitedPool(item: ActivatableItem): boolean {
  const uses = item.limitedUses
  if (uses && uses.type !== "unlimited") return true
  if (item.activation?.spendClassResourceKey) return true
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "uses") return true
    }
  }
  return false
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

function isSelectableBombFormulaRiderFeature(feature: ActivatableItem): boolean {
  if (isAlchemistBombName(feature.name) || isPrimeBombName(feature.name)) return false
  return (feature.linkedModifiers ?? []).some((instance) =>
    (instance.characteristics ?? []).some(
      (char) =>
        char.type === "power_rider" &&
        Boolean(char.selectable) &&
        (char.parentPowerNames ?? []).some((parent) => isAlchemistBombName(parent)),
    ),
  )
}

function resolveSpecialAttacks(
  item: ActivatableItem,
  classLevel?: number,
): SpecialAttackCharacteristic[] {
  const attacks: SpecialAttackCharacteristic[] = []
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "special_attack") {
        let attack = characteristic as SpecialAttackCharacteristic
        // Earthshatter: 5 ft → 10 ft at Warden 14.
        if (/^earthshatter$/i.test(item.name) && (classLevel ?? 0) >= 14) {
          attack = {
            ...attack,
            areaLengthFeet: 10,
            rangeFeet: 10,
            label:
              attack.label?.replace(/5\s*ft/i, "10 ft") ??
              "Earthshatter — replace one Attack; 10-foot slam (Warden 14+)",
          }
        }
        const leveled = resolveSpecialAttackAtLevel(attack, classLevel ?? 1)
        attacks.push({
          ...leveled,
          icon: resolveSpecialAttackIcon({
            icon: leveled.icon,
            attackName: leveled.attackName ?? item.name,
            label: leveled.label ?? item.name,
            attackVariant: leveled.attackVariant,
          }),
        })
      }
    }
  }
  return expandAlchemistBombProfiles(attacks, classLevel ?? 1)
}

function resolveSpecialAttack(
  item: ActivatableItem,
  classLevel?: number,
): SpecialAttackCharacteristic | null {
  return resolveSpecialAttacks(item, classLevel)[0] ?? null
}

export function resolveSheetActionIcon(input: {
  name: string
  icon?: string | null
  specialAttack?: SpecialAttackCharacteristic | null
  specialAttacks?: SpecialAttackCharacteristic[]
  sourceIcon?: string | null
}): string | null {
  const explicit = input.icon?.trim()
  if (explicit) return explicit
  const attack = input.specialAttacks?.[0] ?? input.specialAttack ?? null
  const fromAttack = resolveSpecialAttackIcon({
    icon: attack?.icon,
    attackName: attack?.attackName ?? input.name,
    label: attack?.label ?? input.name,
    attackVariant: attack?.attackVariant,
  })
  if (fromAttack) return fromAttack
  return input.sourceIcon?.trim() || null
}

function describeRiderCost(rider: BonusDamageRiderEntry): string | null {
  const parts: string[] = []
  if (rider.costDice) parts.push(rider.costDice)
  if (rider.costResourceKey) {
    parts.push(
      `${Math.max(1, rider.costResourceAmount ?? 1)} ${rider.costResourceKey.replace(/_/g, " ")}`,
    )
  }
  return parts.length ? parts.join(" + ") : null
}

function describeRider(rider: BonusDamageRiderEntry): string | undefined {
  const parts: string[] = []
  if (rider.description) parts.push(rider.description)
  if (rider.saveAbility) {
    parts.push(
      rider.conditionOnFailedSave
        ? `${rider.saveAbility} save or ${rider.conditionOnFailedSave}`
        : `${rider.saveAbility} save`,
    )
  }
  return parts.length ? parts.join(" · ") : undefined
}

function withInferredOptionActionKind(option: SheetActionMenuOption): SheetActionMenuOption {
  if (option.actionKind) return option
  const inferred = inferMenuOptionActionKind(option.description ?? option.name)
  return inferred ? { ...option, actionKind: inferred } : option
}

function resolveMenuOptions(item: ActivatableItem): SheetActionMenuOption[] {
  const options: SheetActionMenuOption[] = []
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "resource_ability_menu") {
        for (const option of characteristic.options ?? []) {
          options.push(
            withInferredOptionActionKind({
              name: option.name,
              description: option.description,
              resourceCost: option.resourceCost,
              actionKind: option.actionKind,
              hitDiceCost: option.hitDiceCost ?? null,
              unlocksAtLevel: option.unlocksAtLevel ?? null,
            }),
          )
        }
        continue
      }
      // On-hit riders (Cunning Strike, Brutal Strike, Vex/Topple-style picks) are choices the
      // player makes when the attack lands, so they belong on the same picker as resource menus.
      if (characteristic.type === "bonus_damage_riders") {
        for (const rider of (characteristic as BonusDamageRidersCharacteristic).riders ?? []) {
          if (!rider.name) continue
          options.push({
            name: rider.name,
            description: describeRider(rider),
            resourceCost: rider.costResourceKey
              ? Math.max(1, rider.costResourceAmount ?? 1)
              : undefined,
            unlocksAtLevel: rider.unlocksAtLevel ?? null,
            costLabel: describeRiderCost(rider),
          })
        }
      }
    }
  }
  if (options.length) return options
  return parseChooseOneNamedOptions(item.description).map((option) => ({
    name: option.name,
    description: option.description,
    actionKind: option.actionKind,
  }))
}

function resolveHitDiceHealEffect(item: ActivatableItem): FeatureEffect | null {
  const fromActivation = (item.activation?.effects ?? []).find((effect) => effect.healMode === "hit_dice")
  if (fromActivation) return fromActivation
  for (const instance of item.linkedModifiers ?? []) {
    const linked = (instance.activation?.effects ?? []).find((effect) => effect.healMode === "hit_dice")
    if (linked) return linked
  }
  return null
}

function resolveSpendHitPoints(item: ActivatableItem): number | null {
  const fromActivation = item.activation?.spendHitPoints
  if (fromActivation != null && fromActivation > 0) return fromActivation
  for (const instance of item.linkedModifiers ?? []) {
    const linked = instance.activation?.spendHitPoints
    if (linked != null && linked > 0) return linked
    for (const characteristic of instance.characteristics ?? []) {
      const spend = characteristic as {
        spendResourceKey?: string | null
        spendResourceAmount?: number | null
      }
      if (isHitPointsResourceKey(spend.spendResourceKey) && (spend.spendResourceAmount ?? 0) > 0) {
        return Math.floor(spend.spendResourceAmount ?? 0)
      }
    }
  }
  return null
}

function resolveRefundHitPointsOnStillFailed(item: ActivatableItem): boolean {
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type !== "failed_roll_trigger") continue
      if (characteristic.refundResourceOnStillFailed && isHitPointsResourceKey(characteristic.spendResourceKey)) {
        return true
      }
    }
  }
  return false
}

function resolveSpendHitDice(item: ActivatableItem, classLevel?: number): number | null {
  const hitDiceHeal = resolveHitDiceHealEffect(item)
  if (hitDiceHeal) return resolveHitDiceHealCount(hitDiceHeal, classLevel ?? 1)
  const fromActivation = item.activation?.spendHitDice
  if (fromActivation != null && fromActivation > 0) return fromActivation
  for (const instance of item.linkedModifiers ?? []) {
    const linked = instance.activation?.spendHitDice
    if (linked != null && linked > 0) return linked
  }
  return null
}

function collectCastSpellEffectsFromItem(item: ActivatableItem): FeatureEffect[] {
  const effects = collectCastSpellEffects(item.activation?.effects)
  for (const instance of item.linkedModifiers ?? []) {
    effects.push(...collectCastSpellEffects(instance.activation?.effects))
  }
  return effects
}

function resolveCastSpellChoice(
  item: ActivatableItem,
  kinds: ActionEconomyKind[],
): SheetCastSpellChoice | undefined {
  const effect = collectCastSpellEffectsFromItem(item)[0]
  if (!effect) return undefined
  return {
    castingTime: effect.castSpellCastingTime ?? null,
    spellName: effect.castSpellName ?? null,
    withoutSlot: Boolean(effect.castSpellWithoutSlot),
    economyKind: kinds.includes("reaction")
      ? "reaction"
      : kinds.includes("bonus")
        ? "bonus"
        : kinds[0],
  }
}

function resolveHealEffects(item: ActivatableItem): FeatureEffect[] {
  const effects: FeatureEffect[] = []
  const seen = new Set<string>()
  const push = (list: FeatureEffect[] | undefined) => {
    for (const effect of list ?? []) {
      if (!shouldCollectTargetableEffect(effect)) continue
      const key = effect.id || `${effect.kind}:${effect.label ?? ""}:${effect.healMode ?? ""}`
      if (seen.has(key)) continue
      seen.add(key)
      effects.push(effect)
    }
  }
  push(item.activation?.effects)
  for (const instance of item.linkedModifiers ?? []) {
    push(instance.activation?.effects)
  }
  if (collectCastSpellEffectsFromItem(item).length) return effects
  if (!effects.length) {
    const inferredHeal = inferAllyHealEffect(item.name, item.description)
    if (inferredHeal) effects.push(inferredHeal)
    const inferredDirect = inferDirectCompanionEffect(item.name, item.description)
    if (inferredDirect) effects.push(inferredDirect)
    const inferredBuff = inferAllyBuffEffect(item.name, item.description)
    if (inferredBuff) effects.push(inferredBuff)
    const inferred = inferGrantInspirationEffect(item.name, item.description)
    if (inferred) effects.push(inferred)
  }
  return effects
}

function resolveUseBonuses(item: ActivatableItem): SheetActionUseBonus[] | undefined {
  const useBonuses = collectActionUseBonuses(item)
  return useBonuses.length ? useBonuses : undefined
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

/** Action-economy kinds a feature actually declares, ignoring the triggered-spend fallback. */
function explicitActionKinds(item: ActivatableItem): ActionEconomyKind[] {
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
  // Reckless Attack and similar free declarations (pre-enrichment DB rows).
  if (/^reckless attack$/i.test(item.name.trim())) return ["action"]
  if (/^potion mixologist$/i.test(item.name.trim())) return ["bonus"]
  return []
}

/** Derive action-economy kinds from structured activation, modifiers, or prose. */
export function inferActivatableActionKinds(item: ActivatableItem): ActionEconomyKind[] {
  const explicit = explicitActionKinds(item)
  // An authored activation is the last word on cost. Prose such as Rushed Incantation's
  // "a spell with a casting time of an action or a Bonus Action" describes what may be cast,
  // not what casting it costs, so it must not add a second economy column.
  const flexible = activationKinds(item.activation).length
    ? []
    : flexibleEconomyKindsFromText(item.description)
  const merged = unionActionKinds(explicit, flexible)
  if (merged.length) return merged
  if (inferDirectCompanionEffect(item.name, item.description)) return ["action"]
  // Triggered spends have no action-economy cost; "action" only keeps them inside the
  // existing action pipeline — the panel re-buckets them under Triggered.
  return resolveTriggeredActivationLabel(item) ? ["action"] : []
}

function resolveSpendsEconomy(item: ActivatableItem): boolean | undefined {
  if (item.activation?.noEconomyCost === true) return false
  if (/^reckless attack$/i.test(item.name.trim())) return false
  if (inferDirectCompanionEffect(item.name, item.description)) return false
  if (hasHitDiceRestore(item)) return false
  return undefined
}

function hasHitDiceRestore(item: ActivatableItem): boolean {
  return (item.linkedModifiers ?? []).some((instance) =>
    (instance.characteristics ?? []).some((characteristic) => characteristic.type === "hit_dice_restore"),
  )
}

function resolveDropToOneHpOnUse(item: ActivatableItem): boolean | undefined {
  if (item.activation?.onDropToZeroHp) return true
  if ((item.linkedModifiers ?? []).some((instance) => instance.activation?.onDropToZeroHp)) {
    return true
  }
  return undefined
}

/** "you can immediately use your Miraculous Healing (no action required)" */
const IMMEDIATELY_USE_FEATURE_RE =
  /\b(?:you can )?immediately use your ([A-Z][\w][\w' ]*?)(?:\s*\([^)]*\))?(?:\.|$)/i

function resolveAlsoActivateFeatureNames(item: ActivatableItem): string[] | undefined {
  const names: string[] = []
  const seen = new Set<string>()
  const push = (raw: string | null | undefined) => {
    const name = (raw ?? "").replace(/\s+/g, " ").trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) return
    seen.add(key)
    names.push(name)
  }
  for (const name of item.activation?.alsoActivateFeatureNames ?? []) push(name)
  for (const instance of item.linkedModifiers ?? []) {
    for (const name of instance.activation?.alsoActivateFeatureNames ?? []) push(name)
  }
  if (!names.length) {
    const match = IMMEDIATELY_USE_FEATURE_RE.exec(stripHtml(item.description ?? ""))
    if (match?.[1]) push(match[1])
  }
  return names.length ? names : undefined
}

function attachAlsoActivateActions(actions: SheetActionEntry[]): SheetActionEntry[] {
  return actions.map((action) => {
    const names = action.alsoActivateFeatureNames ?? []
    if (!names.length) return action
    const alsoActivate = names.flatMap((name) => {
      const sibling = actions.find(
        (other) => other.id !== action.id && other.name.toLowerCase() === name.toLowerCase(),
      )
      if (!sibling) return []
      return [
        {
          name: sibling.name,
          spendHitDice: sibling.spendHitDice,
          healEffects: sibling.healEffects,
          classLevel: sibling.classLevel,
          classId: sibling.classId,
          hitDieSides: sibling.hitDieSides,
        } satisfies SheetAlsoActivateAction,
      ]
    })
    return { ...action, alsoActivate: alsoActivate.length ? alsoActivate : undefined }
  })
}

function resolveHitDiceRestoreOnUse(
  item: ActivatableItem,
  classLevel: number,
): { amount: number; restoreOn?: "short_rest" | "long_rest" } | undefined {
  for (const instance of item.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type !== "hit_dice_restore") continue
      const amount =
        resolveFixedValueAtLevel(characteristic.amountByLevel, classLevel, characteristic.amount) ??
        characteristic.amount
      if (amount != null && amount > 0) {
        return {
          amount,
          restoreOn: characteristic.restoreOn === "long_rest" ? "long_rest" : "short_rest",
        }
      }
    }
  }
  return undefined
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
  healEffects?: FeatureEffect[]
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
    const allyEffects = shouldCollectTargetableEffect(effect) ? [effect] : undefined
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
        healEffects: allyEffects,
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

/** "Reactive Spell. … cast a spell …" → Reactive Spell when the effect has no label yet. */
function titledCastSpellBenefitName(description: string | null | undefined): string | null {
  const text = stripHtml(description ?? "")
  const match = text.match(
    /([A-Z][A-Za-z]+(?:[ \t]+[A-Z][A-Za-z]+){0,3})\.\s+[^.]*\bcast a spell\b/i,
  )
  const name = match?.[1]?.replace(/\s+/g, " ").trim()
  return name && name.length <= 40 ? name : null
}

function resolveCastSpellActionTitle(feature: ActivatableItem): string | null {
  const effect = collectCastSpellEffectsFromItem(feature)[0]
  if (!effect) return null
  return effect.label?.trim() || titledCastSpellBenefitName(feature.description)
}

function resolveSheetActionName(feature: ActivatableItem): string {
  if (/^healer$/i.test(feature.name.trim())) return "Battle Medic"
  return resolveCastSpellActionTitle(feature) ?? feature.name
}

function resolveSheetActionSourceLabel(feature: ActivatableItem, sourceLabel: string): string {
  const title = resolveCastSpellActionTitle(feature)
  if (title && title !== feature.name && sourceLabel === "Feat") return feature.name
  return sourceLabel
}

function pushActivatableItemActions(
  actions: SheetActionEntry[],
  feature: ActivatableItem,
  levelCap: number,
  sourceLabel: string,
  idPrefix: string,
  classId: string | null,
  hitDieSides?: number | null,
  availableResourceKeys: readonly string[] = [],
  sourceIcon?: string | null,
) {
  if ((feature.level ?? 1) > levelCap) return
  const display = resolveFeatureSheetDisplay(feature as unknown as Feature)
  const movementExpansions = collectMovementOptionExpansions(feature)
  const suppressParent =
    suppressParentForMovementExpansions(feature, movementExpansions) ||
    shouldSuppressStandaloneBombCard(feature.name, resolveSpecialAttacks(feature, levelCap)) ||
    isSelectableBombFormulaRiderFeature(feature) ||
    (Boolean(inferOptionalParentPowerImprovement(feature)) && !featureHasReplaceModifier(feature))
  const limitedUses = resolveLimitedUsesWithInference(feature, availableResourceKeys)
  const itemWithUses: ActivatableItem = { ...feature, limitedUses }

  if (!suppressParent) {
    const inferredKinds = inferActivatableActionKinds(feature)
    const fallback = fallbackKindsForResourceSpend(
      inferredKinds,
      limitedUses,
      haystackForItem(feature),
    )
    const kinds = fallback.kinds
    const trigger = resolveTriggeredActivationLabel(itemWithUses)
    if (kinds.length) {
      const inferredCategory = inferActivatableActionCategory(itemWithUses)
      const category: SheetActionCategory =
        display.combatActions && !display.abilitiesActions
          ? "combat"
          : display.abilitiesActions && !display.combatActions
            ? "utility"
            : inferredCategory
      if (
        display.restDialogues ||
        (category === "combat" && display.combatActions) ||
        (category === "utility" && display.abilitiesActions)
      ) {
        const menuOptions = resolveMenuOptions(feature)
        const healEffects = resolveHealEffects(feature)
        const playerNotes = resolvePlayerNotes(feature)
        const equipmentChoices = resolveEquipmentChoices(feature)
        const specialAttacks = resolveSpecialAttacks(feature, levelCap)
        const castSpellChoice = resolveCastSpellChoice(feature, kinds)
        actions.push({
          id: `${idPrefix}:${feature.level ?? 1}:${feature.name}`,
          name: resolveSheetActionName(feature),
          sourceLabel: resolveSheetActionSourceLabel(feature, sourceLabel),
          kinds,
          trigger,
          category,
          showOnCombatTab: display.combatActions,
          showOnAbilitiesTab: display.abilitiesActions,
          showOnRestDialogues: display.restDialogues,
          firstUseNoAction: resolveFirstUseNoAction(feature.activation, levelCap),
          limitedUses,
          classLevel: levelCap,
          description: feature.description ?? null,
          classId,
          classResourceKey: resolveActionResourceKey(itemWithUses),
          specialAttack: specialAttacks[0] ?? null,
          specialAttacks,
          menuOptions: menuOptions.length ? menuOptions : undefined,
          spendHitDice: resolveSpendHitDice(feature, levelCap),
          spendHitPoints: resolveSpendHitPoints(feature),
          refundHitPointsOnStillFailed: resolveRefundHitPointsOnStillFailed(feature),
          hitDieSides: hitDieSides ?? null,
          healEffects: healEffects.length ? healEffects : undefined,
          useBonuses: resolveUseBonuses(itemWithUses),
          castSpellChoice,
          spendsEconomy: trigger
            ? false
            : (fallback.spendsEconomy ?? resolveSpendsEconomy(feature)),
          restoreHitDiceOnUse: resolveHitDiceRestoreOnUse(feature, levelCap),
          dropToOneHpOnUse: resolveDropToOneHpOnUse(feature),
          alsoActivateFeatureNames: resolveAlsoActivateFeatureNames(feature),
          playerNotes: playerNotes.length ? playerNotes : undefined,
          equipmentChoices: equipmentChoices.length ? equipmentChoices : undefined,
          sourceIcon,
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
      showOnCombatTab: display.combatActions,
      showOnAbilitiesTab: display.abilitiesActions,
      showOnRestDialogues: display.restDialogues,
      limitedUses,
      classLevel: levelCap,
      description: expansion.description,
      classId,
      classResourceKey: resolveActionResourceKey(itemWithUses),
      spendHitDice: resolveSpendHitDice(feature, levelCap),
      spendHitPoints: resolveSpendHitPoints(feature),
      refundHitPointsOnStillFailed: resolveRefundHitPointsOnStillFailed(feature),
      hitDieSides: hitDieSides ?? null,
      healEffects: expansion.healEffects,
      sourceIcon,
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
  availableResourceKeys: readonly string[] = [],
  sourceIcon?: string | null,
) {
  if (!classId || !featureChoicePicks) return
  if (!feature.isChoice || !feature.choices?.options?.length) return
  // Weapon Mastery is an on-hit property while wielding — shown on equipped weapon cards,
  // not as free-floating action cards for every known weapon type (Nick's "Bonus Action"
  // wording otherwise false-positives via kindsFromText).
  if (isWeaponMasteryFeature(feature)) return
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
      availableResourceKeys,
      sourceIcon,
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
  availableResourceKeys: readonly string[] = [],
  sourceIcon?: string | null,
) {
  const replacedNames = collectReplacedFeatureNames(features ?? [], levelCap)
  for (const feature of features ?? []) {
    if (featureIsReplaced(feature, replacedNames)) continue
    pushActivatableItemActions(
      actions,
      feature,
      levelCap,
      sourceLabel,
      idPrefix,
      classId,
      hitDieSides,
      availableResourceKeys,
      sourceIcon,
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
      availableResourceKeys,
      sourceIcon,
    )
  }
}

function customAbilityHaystack(ability: CustomAbility): string {
  return `${ability.description ?? ""} ${ability.execution ?? ""} ${ability.casting_time ?? ""}`
}

function isCustomAbilityAction(ability: CustomAbility): boolean {
  if (ability.ability_role === "talent_pool") return false
  if (ability.ability_role === "bomb_formula" || isBombFormulaAbility(ability)) return false
  const haystack = customAbilityHaystack(ability)
  const hasSpend = hasManeuverSpendText(haystack)
  if (ability.ability_role === "discipline") {
    if (hasSpend || ability.execution || ability.casting_time) return true
    if (isDisciplinePackageAbility(ability)) return false
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
  if (hasSpend) return true
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

function resourceKeysForAbility(
  ability: CustomAbility,
  classDetails: CharacterClassDetail[],
  fallbackKeys: readonly string[],
): string[] {
  const ownerId =
    ability.attached_to_type === "class" ? (ability.attached_to_id ?? null) : null
  const owner = ownerId
    ? classDetails.find((entry) => entry.row.class_id === ownerId)
    : null
  if (owner?.class) return classResourceKeysForClass(owner.class)
  return [...fallbackKeys]
}

function sourceIconForAbility(
  ability: CustomAbility,
  classDetails: CharacterClassDetail[],
  classId: string | null,
): string | null {
  const ownerId =
    ability.attached_to_type === "class" ? (ability.attached_to_id ?? classId) : classId
  if (!ownerId) return null
  const owner = classDetails.find((entry) => entry.row.class_id === ownerId)
  return owner ? resolveAttachedClassIcon(owner.class) : null
}

function pushCustomAbilityActions(
  actions: SheetActionEntry[],
  abilities: CustomAbility[] | undefined,
  levelCap: number,
  classId: string | null,
  classDetails: CharacterClassDetail[] = [],
  fallbackResourceKeys: readonly string[] = [],
) {
  const seenPowerNames = new Set<string>()

  for (const ability of abilities ?? []) {
    if (!isCustomAbilityAction(ability)) continue
    if (ability.level_requirement != null && ability.level_requirement > levelCap) continue

    const availableKeys = resourceKeysForAbility(ability, classDetails, fallbackResourceKeys)
    const haystack = customAbilityHaystack(ability)
    const limitedUses = resolveLimitedUsesWithInference(
      {
        name: ability.name,
        description: ability.description,
        limitedUses: ability.uses,
        linkedModifiers: ability.linked_modifiers ?? undefined,
      },
      availableKeys,
      `${ability.execution ?? ""} ${ability.casting_time ?? ""}`,
    )
    const item: ActivatableItem = {
      name: ability.name,
      description: ability.description,
      limitedUses,
      linkedModifiers: ability.linked_modifiers ?? undefined,
    }

    const castingKinds = kindsFromCastingTime(ability.casting_time ?? ability.execution)
    const linkedKinds = castingKinds.length ? [] : kindsFromLinkedModifiers(item.linkedModifiers)
    const textKinds =
      castingKinds.length || linkedKinds.length ? [] : kindsFromText(item.description)
    const inferredKinds = castingKinds.length
      ? castingKinds
      : linkedKinds.length
        ? linkedKinds
        : textKinds
    const fallback = fallbackKindsForResourceSpend(inferredKinds, limitedUses, haystack)
    const kinds = unionActionKinds(
      fallback.kinds,
      flexibleEconomyKindsFromText(`${ability.casting_time ?? ""} ${ability.description ?? ""}`),
    )
    const trigger = resolveTriggeredActivationLabel({
      ...item,
      description: `${ability.description ?? ""} ${ability.execution ?? ""} ${ability.casting_time ?? ""}`,
    })

    if (!kinds.length && ability.ability_role === "psionic_power") {
      kinds.push("action")
    }
    if (!kinds.length && ability.ability_role === "alchemist_bomb") {
      kinds.push("action")
    }
    if (!kinds.length) continue
    if (
      (ability.ability_role === "alchemist_bomb" || isAlchemistBombName(ability.name)) &&
      actions.some((action) => isAlchemistBombName(action.name))
    ) {
      continue
    }

    seenPowerNames.add(normalizePickName(ability.name))
    const healEffects = resolveHealEffects(item)
    const ownerClassId =
      ability.attached_to_type === "class" ? (ability.attached_to_id ?? classId) : classId
    actions.push({
      id: `ability:${ability.id}`,
      name: ability.name,
      sourceLabel: customAbilitySourceLabel(ability),
      kinds,
      trigger,
      category: classifyActionCategory(item, {
        preferCombat: preferCombatForAbility(ability, item),
      }),
      limitedUses,
      classLevel: levelCap,
      description: ability.description ?? null,
      classId: ownerClassId,
      classResourceKey: resolveActionResourceKey(item),
      customAbilityId: ability.id,
      abilityRole: ability.ability_role ?? null,
      icon: ability.icon,
      sourceIcon: sourceIconForAbility(ability, classDetails, classId),
      psionicAugments: resolvePsionicAugments(ability),
      specialAttack: resolveSpecialAttack(item, levelCap),
      specialAttacks: resolveSpecialAttacks(item, levelCap),
      castingTime: ability.casting_time ?? ability.execution ?? null,
      range: ability.range ?? null,
      components: ability.components ?? null,
      duration: ability.duration ?? null,
      concentration: ability.concentration,
      healEffects: healEffects.length ? healEffects : undefined,
      useBonuses: resolveUseBonuses(item),
      spendsEconomy: trigger ? false : fallback.spendsEconomy,
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
      const powerText = `${entry.description ?? ""} ${entry.summary ?? ""}`
      const powerKeys = resourceKeysForAbility(ability, classDetails, fallbackResourceKeys)
      const limitedUses = resolveLimitedUsesWithInference(item, powerKeys, entry.summary)
      const itemWithUses: ActivatableItem = { ...item, limitedUses }
      const castingKinds = kindsFromCastingTime(entry.summary)
      const linkedKinds = castingKinds.length ? [] : kindsFromLinkedModifiers(linkedModifiers)
      const inferredKinds = castingKinds.length
        ? castingKinds
        : linkedKinds.length
          ? linkedKinds
          : kindsFromText(item.description)
      const fallback = fallbackKindsForResourceSpend(inferredKinds, limitedUses, powerText)
      const kinds = [...fallback.kinds]
      const trigger = resolveTriggeredActivationLabel(itemWithUses)
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
        trigger,
        category: classifyActionCategory(itemWithUses, { preferCombat: true }),
        limitedUses,
        classLevel: levelCap,
        description: entry.description ?? entry.summary ?? null,
        classId: ability.attached_to_type === "class" ? (ability.attached_to_id ?? classId) : classId,
        classResourceKey: resolveActionResourceKey(itemWithUses),
        customAbilityId: ability.id,
        icon: ability.icon,
        sourceIcon: sourceIconForAbility(ability, classDetails, classId),
        psionicAugments: resolvePsionicAugments({
          name: entryName,
          description: entry.description ?? entry.summary ?? null,
          psionic_augments: null,
        }),
        specialAttack: resolveSpecialAttack(item, levelCap),
        specialAttacks: resolveSpecialAttacks(item, levelCap),
        useBonuses: resolveUseBonuses(itemWithUses),
        castingTime: entry.summary?.match(/\b\d+\s+(?:bonus\s+)?action\b/i)?.[0] ?? null,
        spendsEconomy: trigger ? false : fallback.spendsEconomy,
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
        const summary = resolvePowerRiderSummary(feature.name, char, levelCap)
        alerts.push({
          name: feature.name,
          summary,
          description: feature.description ?? null,
          sourceLabel,
          parentPowerNames: char.parentPowerNames,
          parentMenuOptionNames: char.parentMenuOptionNames,
          appliesToAttackVariants: resolveBombRiderAttackVariants({
            name: feature.name,
            description: feature.description,
            summary,
            appliesToAttackVariants: char.appliesToAttackVariants,
          }),
          selectable: looksLikeSelectableBombRider({
            selectable: char.selectable,
            name: feature.name,
            description: feature.description,
            summary,
          }),
          spendHitPoints:
            typeof char.spendHitPoints === "number" && char.spendHitPoints > 0
              ? char.spendHitPoints
              : inferOptionalParentPowerImprovement(feature)?.spendHitPoints,
        })
      }
    }
    const inferredImprove = featureHasReplaceModifier(feature)
      ? null
      : inferOptionalParentPowerImprovement(feature)
    if (inferredImprove && !seen.has(`${feature.name}::${inferredImprove.parentName}`)) {
      const extra =
        inferredImprove.extraAmount != null
          ? `; the target takes an extra ${inferredImprove.extraAmount} Radiant`
          : ""
      alerts.push({
        name: feature.name,
        summary: `Choose to take ${inferredImprove.spendHitPoints} Radiant${extra}.`,
        description: feature.description ?? null,
        sourceLabel,
        parentPowerNames: [inferredImprove.parentName],
        selectable: true,
        spendHitPoints: inferredImprove.spendHitPoints,
      })
      seen.add(`${feature.name}::${inferredImprove.parentName}`)
    }
    if (isPrimeBombName(feature.name)) return
    if (seen.has(`${feature.name}::Bomb|Bombs`)) return
    if (shouldSuppressStandaloneBombCard(feature.name, resolveSpecialAttacks(feature, levelCap))) {
      const key = `${feature.name}::Bomb|Bombs`
      seen.add(key)
      alerts.push({
        name: feature.name,
        summary: looksLikePrimeBombRiderText(feature.name, feature.description)
          ? "Add this rider when you prime a Bomb."
          : "Add this formula to a regular (non-primed) Bomb attack.",
        description: feature.description ?? null,
        sourceLabel,
        parentPowerNames: ["Bomb", "Bombs"],
        appliesToAttackVariants: resolveBombRiderAttackVariants({
          name: feature.name,
          description: feature.description,
          formulaRider: true,
        }),
        selectable: true,
      })
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
        const summary = char.alertSummary?.trim() || char.label?.trim() || option.name
        alerts.push({
          name: option.name,
          summary,
          description: option.description ?? null,
          sourceLabel,
          parentPowerNames: char.parentPowerNames,
          parentMenuOptionNames: char.parentMenuOptionNames,
          appliesToAttackVariants: resolveBombRiderAttackVariants({
            name: option.name,
            description: option.description,
            summary,
            appliesToAttackVariants: char.appliesToAttackVariants,
          }),
          selectable: looksLikeSelectableBombRider({
            selectable: char.selectable,
            name: option.name,
            description: option.description,
            summary,
          }),
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
          let summary = char.alertSummary?.trim() || char.label?.trim() || ability.name
          if (/^empowered strike$/i.test(ability.name)) {
            const knownPowers = abilities.filter(
              (row) =>
                row.ability_role === "psionic_power" &&
                /^(?:elemental blast|telekinetic force)$/i.test(row.name),
            )
            if (knownPowers.length) {
              const lines = knownPowers.map((power) => {
                const augments = resolvePsionicAugments(power)?.augments ?? []
                const names = augments.map((entry) => entry.name).filter(Boolean)
                return names.length
                  ? `${power.name}: ${names.join(", ")}`
                  : `${power.name} (see power card for augments)`
              })
              summary = `${summary}\nKnown: ${lines.join(" · ")}`
            } else {
              summary = `${summary}\nNo Elemental Blast / Telekinetic Force known yet.`
            }
          }
          alerts.push({
            name: ability.name,
            summary,
            description: ability.description ?? null,
            sourceLabel,
            parentPowerNames: char.parentPowerNames,
            parentMenuOptionNames: char.parentMenuOptionNames,
            appliesToAttackVariants: resolveBombRiderAttackVariants({
              name: ability.name,
              description: ability.description,
              summary,
              appliesToAttackVariants: char.appliesToAttackVariants,
            }),
            selectable: looksLikeSelectableBombRider({
              selectable: char.selectable,
              name: ability.name,
              description: ability.description,
              summary,
            }),
          })
        }
      }
    }
    if (!isBombFormulaAbility(ability) || isAlchemistBombName(ability.name) || isPrimeBombName(ability.name)) {
      continue
    }
    const nested = ability.choices?.options ?? []
    const formulaRows =
      nested.length > 0
        ? nested.filter((option) => {
            const name = normalizePickName(option.name)
            return (
              picked.has(name) ||
              [...picked].some((pick) => name.includes(pick) || pick.includes(name))
            )
          })
        : talentPicked
          ? [{ name: ability.name, description: ability.description ?? null }]
          : []
    for (const row of formulaRows) {
      const key = `${row.name}::Bomb|Bombs`
      if (seen.has(key)) continue
      seen.add(key)
      alerts.push({
        name: row.name,
        summary: looksLikePrimeBombRiderText(row.name, row.description)
          ? "Add this rider when you prime a Bomb."
          : "Add this formula to a regular (non-primed) Bomb attack.",
        description: row.description ?? null,
        sourceLabel,
        parentPowerNames: ["Bomb", "Bombs"],
        appliesToAttackVariants: resolveBombRiderAttackVariants({
          name: row.name,
          description: row.description,
          formulaRider: true,
        }),
        selectable: true,
      })
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
        ({
          name,
          summary,
          description,
          sourceLabel,
          parentMenuOptionNames,
          appliesToAttackVariants,
          selectable,
          spendHitPoints,
        }) => ({
          name,
          summary,
          description,
          sourceLabel,
          parentMenuOptionNames,
          appliesToAttackVariants,
          selectable,
          spendHitPoints,
        }),
      ),
    }
  })
}

function flattenItemCharacteristics(
  item: { linkedModifiers?: LinkedModifierInstance[] | null },
): CharacteristicModifier[] {
  return (item.linkedModifiers ?? []).flatMap((instance) => instance.characteristics ?? [])
}

function featHasDamageTypeChoice(feat: Feat): boolean {
  return flattenItemCharacteristics(feat).some(
    (characteristic) =>
      (characteristic.type === "damage_resistance" || characteristic.type === "damage_immunity") &&
      (characteristic.choiceCount ?? 0) > 0,
  )
}

function pushFeatPassiveReminder(
  actions: SheetActionEntry[],
  feat: Feat,
  levelCap: number,
  sourceIcon: string | null,
  modifierPlayerPicks?: Record<string, string[]>,
) {
  if (!featHasDamageTypeChoice(feat)) return
  const chosenTypes = chosenDamageTypesFromCharacteristics(
    flattenItemCharacteristics(feat),
    modifierPlayerPicks,
  )
  const name = withChosenOptionChrome(feat.name, chosenTypes)
  actions.push({
    id: `feat-${feat.id}:1:${feat.name}:passive`,
    name,
    sourceLabel: "Feat",
    kinds: ["action"],
    trigger: chosenTypes.length ? chosenTypes.join(", ") : "Always on",
    category: "combat",
    reminderOnly: true,
    spendsEconomy: false,
    showOnCombatTab: true,
    showOnAbilitiesTab: false,
    showOnRestDialogues: false,
    limitedUses: null,
    classLevel: levelCap,
    description: feat.description ?? null,
    classId: null,
    sourceIcon,
    icon: sourceIcon,
  })
}

export function collectSheetActions(params: {
  classDetails: CharacterClassDetail[]
  species: Species | null
  backgroundFeature?: ActivatableItem | null
  customAbilities?: CustomAbility[]
  feats?: Feat[]
  featureChoicePicks?: Record<string, string[]>
  modifierPlayerPicks?: Record<string, string[]>
}): SheetActionEntry[] {
  const actions: SheetActionEntry[] = []
  const featureChoicePicks = params.featureChoicePicks

  for (const entry of params.classDetails) {
    const className = entry.class?.name ?? "Class"
    const hitDieSides = entry.class?.hit_die ?? null
    const resourceKeys = classResourceKeysForClass(entry.class)
    const classIcon = resolveAttachedClassIcon(entry.class)
    pushFeatureActions(
      actions,
      entry.class?.features as Feature[] | undefined,
      entry.row.level,
      className,
      entry.row.class_id,
      entry.row.class_id,
      featureChoicePicks,
      hitDieSides,
      resourceKeys,
      classIcon,
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
        resourceKeys,
        resolveAttachedClassIcon(entry.class, entry.subclass),
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

  if (params.feats?.length) {
    const seenFeatKeys = new Set<string>()
    for (const feat of params.feats) {
      const key = `${feat.name}:${feat.id}`.toLowerCase()
      if (seenFeatKeys.has(key)) continue
      seenFeatKeys.add(key)
      const featIcon = getCompendiumItemIcon("feats", feat)
      const before = actions.length
      pushFeatureActions(
        actions,
        [
          {
            name: feat.name,
            description: feat.description ?? null,
            level: 1,
            linkedModifiers: feat.linkedModifiers ?? undefined,
          },
        ],
        Math.max(totalLevel, 1),
        "Feat",
        `feat-${feat.id}`,
        null,
        undefined,
        undefined,
        [],
        featIcon,
      )
      if (actions.length === before) {
        pushFeatPassiveReminder(
          actions,
          feat,
          Math.max(totalLevel, 1),
          featIcon,
          params.modifierPlayerPicks,
        )
      }
    }
  }

  if (params.customAbilities?.length) {
    const soleClassId =
      params.classDetails.length === 1 ? params.classDetails[0]?.row.class_id ?? null : null
    const allResourceKeys = params.classDetails.flatMap((entry) =>
      classResourceKeysForClass(entry.class),
    )
    pushCustomAbilityActions(
      actions,
      params.customAbilities,
      Math.max(totalLevel, 1),
      soleClassId,
      params.classDetails,
      allResourceKeys,
    )
  }

  const withRiders = attachTalentAlertsToActions(actions, [
    ...collectTalentAlertsFromFeatures(params.classDetails),
    ...collectTalentAlertsFromCustomAbilities(params.customAbilities, featureChoicePicks),
  ])

  const restorePactSlotsOnUse: NonNullable<SheetActionEntry["restorePactSlotsOnUse"]> =
    featureUnlocked(params.classDetails, /^eldritch master$/i) ? "all" : "half_round_up"

  const seen = new Set<string>()
  return attachAlsoActivateActions(withRiders)
    .map((action) => {
      action = { ...action, icon: resolveSheetActionIcon(action) }
      if (/^magical cunning$/i.test(action.name)) {
        return { ...action, restorePactSlotsOnUse }
      }
      if (/^arcane recovery$/i.test(action.name)) {
        return {
          ...action,
          restoreSpellSlotsOnUse: { mode: "combined_level_half_up" as const, maxSlotLevel: 5 },
        }
      }
      if (/^dark arcana$/i.test(action.name)) {
        return {
          ...action,
          restoreResourceFromSpellSlotOnUse: {
            resourceKey: "charnel_touch",
            ability: "INT" as const,
          },
        }
      }
      if (/^traditional expertise$/i.test(action.name)) {
        return { ...action, spendSpellSlotOnUse: { minSpellLevel: 1 } }
      }
      return action
    })
    .filter((action) => {
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

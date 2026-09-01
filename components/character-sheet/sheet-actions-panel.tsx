"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, Dices, GripVertical, X } from "lucide-react"
import { GameIcon } from "@/components/game-icon-picker"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import {
  PsionicAugmentPicker,
  resolveAbilityPsionicAugments,
} from "@/components/character-sheet/psionic-augment-picker"
import { useSheetRollContext } from "@/components/character-sheet/sheet-roll-context"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import {
  ACTION_KIND_LABELS,
  selectableEconomyKinds,
  type ActionEconomyKind,
  type SheetActionEntry,
  type SheetActionMenuOption,
  type SheetActionTalentAlert,
} from "@/lib/character/sheet-actions"
import { formatSheetActionUseBonusLines } from "@/lib/character/action-use-bonuses"
import {
  isResourceDieBonusConfig,
  rollResourceDieUseBonuses,
  bonusFromResourceDieOption,
} from "@/lib/character/resource-die-use"
import { grantsExtraWeaponAttack } from "@/lib/character/weapon-attack-actions"
import { talentAlertAppliesToVariant } from "@/lib/character/alchemist-bomb-sheet"
import {
  getSheetToggleDefinition,
  guardianTacticsToggleIdForOption,
  sheetToggleIdActivatedByAction,
} from "@/lib/compendium/sheet-toggle-registry"
import { weaponMorphToggleIdForOption } from "@/lib/character/weapon-morph"
import type { IllusionTokenKind } from "@/lib/character/illusion-tokens"
import {
  SHEET_ACTION_CARD,
  SHEET_ACTION_USAGE_DOT,
} from "@/lib/character/sheet-status-colors"
import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import {
  formatSpecialAttackDamageTypes,
  specialAttackChoosesDamageType,
} from "@/lib/compendium/special-attack-damage-type"
import { cn } from "@/lib/utils"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import { resolveActionUsesTrackingKey } from "@/lib/character/action-uses-key"
import type { CharacterCompanionState } from "@/lib/character/companion-stat-block"
import {
  filterSpellsForCastChoice,
  spellLevelLabel,
  type SheetCastSpellChoice,
} from "@/lib/character/cast-spell-choice"
import {
  collectTargetableEffects,
  type PartyEffectTarget,
} from "@/lib/character/effect-target-policy"
import type { Spell } from "@/lib/types"
import { applyAllyEffectLocally } from "@/lib/character/apply-ally-effect"
import { applyPartyHealEffect } from "@/lib/character/apply-party-heal"
import { applyResourceToResourceRestore } from "@/lib/character/resource-conversion"
import {
  formatEmpowerEffect,
  resolveOverloadedCharge,
  resolveSpecialAttackEmpower,
} from "@/lib/character/special-attack-empower"
import { defaultSheetPlayState } from "@/lib/character/sheet-play-state"
import {
  resolveFeatureEffectHeal,
  resolveHitDiceHealCount,
  type HealResolveContext,
} from "@/lib/character/resolve-feature-effect-heal"
import {
  allyCandidateDisplayLabel,
  type PartyAllyCandidate,
} from "@/lib/character/party-ally-candidates"
import type { FeatureEffect, UsesConfig } from "@/lib/types"
import {
  formatPsionicAugmentSelectionSummary,
  totalPsionicAugmentCost,
  type PsionicAugmentSelection,
} from "@/lib/compendium/parse-psionic-augments"
import type { SpecialAttackCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { formatD20RollSummary, rollD20WithMode } from "@/lib/dice/d20-roll"
import { formatDamageRollResult, rollDamageWithMode } from "@/lib/dice/damage-roll"
import { resolveRollMode } from "@/lib/character/resolve-roll-mode"
import {
  DEFAULT_COMBAT_ACTION_GROUP_ORDER,
  defaultActionGroupColumn,
  loadActionGroupColumns,
  loadActionGroupOrder,
  moveActionGroup,
  orderActionGroups,
  saveActionGroupColumns,
  saveActionGroupOrder,
  type ActionGroupColumnMap,
  type ActionGroupId,
} from "@/lib/character/action-group-layout"

type SheetActionsPanelProps = {
  actions: SheetActionEntry[]
  usedByActionId: Record<string, number>
  onUsedChange: (next: Record<string, number>) => void
  resolveContext: ResolveUsesContext
  resourceEntries?: ResourceTrackerEntry[]
  usedResourcesById?: Record<string, number>
  onResourceUsedChange?: (next: Record<string, number>) => void
  incapacitated?: boolean
  psiLimit?: number | null
  /** Remaining Hit Dice for the preferred class (or total). */
  hitDiceRemaining?: number
  /** Spend Hit Dice when an action/menu option requires them. Returns false if unaffordable. */
  onSpendHitDice?: (amount: number, preferClassId?: string | null) => boolean
  /** Spend current HP (bypasses Temporary Hit Points). */
  onSpendHitPoints?: (amount: number) => void
  /** Refund HP if a failed-roll trigger still fails after the bonus. */
  onRefundHitPoints?: (amount: number) => void
  /** Activate a sheet toggle when a menu option is used (e.g. Guardian Tactics Block). */
  onActivateSheetToggle?: (toggleId: string, note?: string) => void
  /** Spawn a Projected Self / Imaginary Ally play-state token. */
  onSpawnIllusionToken?: (kind: IllusionTokenKind) => void
  /** Grant a Flesh Warp Mutation Die (Perfected / Muscular from selected augments). */
  onGrantMutationDie?: (opts: {
    autoApplyStrength: boolean
    perfected: boolean
    targetLabel: string
  }) => void
  /** Mark Action / Bonus Action / Reaction as spent for this turn. */
  onMarkEconomy?: (kind: ActionEconomyKind) => void
  /** Open character id — used when applying self heals / ally picks. */
  characterId?: string | null
  /** Apply heal / temp HP to the open sheet's local play state. */
  onApplySelfHeal?: (amount: number, kind: "heal" | "temp_hp") => void
  /** Drop-to-0 features set current HP to this value (usually 1). */
  onSetCurrentHp?: (next: number) => void
  onApplySelfInspiration?: () => void
  onApplySelfConditions?: (add: string[], remove: string[]) => void
  onAddDurationReminder?: (label: string) => void
  onApplyCompanionState?: (key: string, patch: Partial<CharacterCompanionState>) => void
  /** Extra temp HP from Perfected Enhancement when granting via a psionic power. */
  perfectedEnhancementBonus?: number
  /** +INT added to psionic discipline power damage (Empowered Psionics). */
  empoweredPsionicsBonus?: number
  /** Using a damaging power marks damage dealt this turn (Rampage Die). */
  onMarkDamageDealt?: () => void
  /** Bank heal/THP amounts into Balance of Power after a psionic ability. */
  onBankBalanceOfPower?: (amount: number) => void
  /** Party allies + companions available as effect targets. */
  allyCandidates?: PartyAllyCandidate[]
  /** Known / prepared spells for features that let the player pick one to cast. */
  knownSpells?: Spell[]
  /** Open the spell overlay to cast through a feature (Reactive Spell, etc.). */
  onCastSpellChoice?: (spell: Spell, choice: SheetCastSpellChoice) => void
  healContext?: HealResolveContext | null
  /** Force a single card column (e.g. narrow combat right rail). */
  singleColumn?: boolean
  /** Magical Cunning restores Pact Magic slots when used. */
  onRestorePactSlots?: (mode: "half_round_up" | "all") => void
  /** Arcane Recovery restores expended slots by combined level. */
  onRestoreSpellSlotsByCombinedLevel?: (classLevel: number, maxSlotLevel: number) => void
  /** Divine Respite and similar: regain expended Hit Point Dice. */
  onRestoreHitDice?: (amount: number, classId?: string | null) => number
  /** Dark Arcana: spend a slot to refill a class resource. */
  onRestoreResourceFromSpellSlot?: (spec: {
    resourceKey: string
    classId?: string | null
    ability: "INT" | "WIS" | "CHA" | "STR" | "DEX" | "CON"
  }) => string | null
  /** Traditional Expertise: expend a spell slot for Advantage on a Wisdom check. */
  onSpendSpellSlot?: (minSpellLevel: number) => string | null
  playerNoteValues?: Record<string, string[]>
  onPlayerNoteChange?: (key: string, value: string) => void
  onEquipmentChoiceChange?: (key: string, value: string) => void
  /** One Primed Bomb per Attack action; Extra Attack still allows extra regular bombs. */
  primedBombUsedThisTurn?: boolean
  onPrimedBombUsed?: () => void
  firstUseNoActionUsedById?: Record<string, boolean>
  onFirstUseNoActionUsed?: (actionId: string) => void
  /**
   * Which buckets to show. Combat layout puts extra-attack grants and passive (no-economy)
   * entries under weapons (`weapon-attacks`) and action/bonus/reaction in the actions column
   * (`economy`). `triggered` is an alias for the Passive heading used by older callers.
   */
  sections?: "all" | "economy" | "triggered" | "weapon-attacks"
  /**
   * `stack` keeps groups in one column. `responsive-grid` uses 1 column until `xl`, then 2 —
   * each group stays one cell wide at every breakpoint.
   */
  groupLayout?: "stack" | "responsive-grid"
  /** Persists drag order per character. Distinct scopes (combat vs utility) do not share order. */
  layoutScope?: string
  /** Optional first group (equipped weapons) included in the same reorderable grid. */
  prependGroup?: { id: ActionGroupId; node: ReactNode } | null
}

function actionPlayerNoteKey(action: SheetActionEntry, noteId: string): string {
  return `player-note:${action.id}:${noteId}`
}

function actionEquipmentChoiceKey(action: SheetActionEntry, choiceId: string): string {
  return `player-equipment:${action.id}:${choiceId}`
}

const ACTION_DETAIL_TAB_TRIGGER_CLASS =
  "w-full rounded-lg border border-transparent px-2 py-2 text-xs font-semibold"

function attackProfileActionLabel(profile: SpecialAttackCharacteristic): string {
  return profile.attackVariant === "explode"
    ? "Explode"
    : profile.attackVariant === "primed"
      ? "Primed"
      : profile.attackVariant === "attack"
        ? "Attack"
        : profile.label || profile.attackName || "Use"
}

function ActionSelectableRiders({
  riders,
  selectedRiderNames,
  onToggle,
}: {
  riders: SheetActionTalentAlert[]
  selectedRiderNames: string[]
  onToggle: (name: string) => void
}) {
  if (!riders.length) return null
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Add riders
      </p>
      {riders.map((alert) => {
        const checked = selectedRiderNames.includes(alert.name)
        return (
          <label
            key={`${alert.name}:${alert.summary}`}
            className="flex cursor-pointer items-start gap-2"
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={checked}
              onChange={() => onToggle(alert.name)}
            />
            <span className="min-w-0 space-y-1">
              <span className="block text-xs font-semibold text-foreground">{alert.name}</span>
              <span className="block text-xs text-foreground/90 leading-relaxed">
                {alert.summary}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

function ActionInfoTalentAlerts({ alerts }: { alerts: SheetActionTalentAlert[] }) {
  if (!alerts.length) return null
  return (
    <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
        Related talents
      </p>
      {alerts.map((alert) => (
        <div key={`${alert.name}:${alert.summary}`} className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold text-foreground">{alert.name}</p>
            <p className="text-xs text-foreground/90 leading-relaxed">{alert.summary}</p>
            {alert.parentMenuOptionNames?.length ? (
              <p className="text-[10px] text-muted-foreground">
                Applies to: {alert.parentMenuOptionNames.join(", ")}
              </p>
            ) : null}
            {alert.sourceLabel ? (
              <p className="text-[10px] text-muted-foreground">{alert.sourceLabel}</p>
            ) : null}
            {alert.description ? (
              <RichTextContent
                html={alert.description}
                className="text-xs text-foreground/80 leading-relaxed [&_p]:mb-1 [&_p:last-child]:mb-0"
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function resolveActionMax(
  uses: UsesConfig | null | undefined,
  classLevel: number,
  ctx: ResolveUsesContext,
): number | null {
  if (!uses || uses.type === "unlimited") return null
  return resolveUsesAtLevel(uses, classLevel, ctx)
}

/** A spendable counter backing an action — either a shared class resource or the action's own uses. */
type ActionUsage = {
  max: number
  used: number
  setUsed: (next: number) => void
  resourceName?: string
  resourceId?: string
}

/** Compact cost for the action card title row (replaces publisher/source labels). */
function formatSheetActionCostMeta(
  entry: SheetActionEntry,
  usage: ActionUsage | null,
): string | null {
  const hitDice = entry.spendHitDice ?? 0
  const hitPoints = entry.spendHitPoints ?? 0
  if (hitPoints > 0 && hitDice > 0) {
    return `${hitPoints} HP · ${hitDice} Hit Die${hitDice === 1 ? "" : "ce"}`
  }
  if (hitPoints > 0) {
    return `${hitPoints} HP`
  }
  if (hitDice > 0) {
    return `${hitDice} Hit Die${hitDice === 1 ? "" : "ce"}`
  }
  if (!entry.classResourceKey) return null

  const resourceName =
    usage?.resourceName?.trim() || entry.classResourceKey.replace(/_/g, " ")
  const amount = Math.max(1, entry.limitedUses?.classResourceAmount ?? 1)
  const mode = entry.limitedUses?.classResourceCostMode

  if (mode === "up_to_proficiency_bonus") {
    const mult = amount > 1 ? `${amount} × ` : ""
    return `up to ${mult}PB ${resourceName}`
  }
  if (mode === "up_to_ability_modifier") {
    const ability = entry.limitedUses?.classResourceCostAbility ?? "ability"
    const mult = amount > 1 ? `${amount} × ` : ""
    return `up to ${mult}${ability} mod ${resourceName}`
  }
  return `${amount} ${resourceName}`
}

function dieSides(dieType: string): number {
  const match = dieType.match(/^d(\d+)$/i)
  return match ? parseInt(match[1], 10) : 6
}

function attackModifierFromContext(ctx: ResolveUsesContext): number {
  const mods = ctx.abilityModifiers ?? {}
  const int = mods.INT ?? 0
  const wis = mods.WIS ?? 0
  const cha = mods.CHA ?? 0
  return Math.max(int, wis, cha)
}

function abilityModifierFromContext(
  ctx: ResolveUsesContext,
  ability: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA",
): number {
  return ctx.abilityModifiers?.[ability] ?? 0
}

function specialAttackModifier(
  attack: SpecialAttackCharacteristic,
  ctx: ResolveUsesContext,
): number {
  if (attack.properties.some((property) => /finesse/i.test(property))) {
    return Math.max(
      abilityModifierFromContext(ctx, "STR"),
      abilityModifierFromContext(ctx, "DEX"),
    )
  }
  return attackModifierFromContext(ctx)
}

function specialAttackSaveModifier(
  attack: SpecialAttackCharacteristic,
  ctx: ResolveUsesContext,
): number {
  let modifier =
    attack.saveDCAbilityChoice === "higher_str_dex"
      ? Math.max(
          abilityModifierFromContext(ctx, "STR"),
          abilityModifierFromContext(ctx, "DEX"),
        )
      : attack.saveDCAbilityChoice
        ? abilityModifierFromContext(ctx, attack.saveDCAbilityChoice)
        : specialAttackModifier(attack, ctx)
  if (attack.alternateSaveDCAbility) {
    modifier = Math.max(
      modifier,
      abilityModifierFromContext(ctx, attack.alternateSaveDCAbility),
    )
  }
  return modifier
}

function specialAttackDamageModifier(
  attack: SpecialAttackCharacteristic,
  ctx: ResolveUsesContext,
): number {
  const configured = attack.damageAbilityModifier
  if (!configured) return 0
  const modifier =
    configured === "attack"
      ? specialAttackModifier(attack, ctx)
      : abilityModifierFromContext(ctx, configured)
  return Math.max(attack.damageAbilityMinimum ?? Number.NEGATIVE_INFINITY, modifier)
}

function formatSignedModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`
}

function specialAttackRangeLabel(attack: SpecialAttackCharacteristic): string | null {
  const parts: string[] = []
  if (attack.rangeFeet != null && attack.rangeFeet > 0) {
    parts.push(`${attack.rangeFeet} ft.`)
  }
  if (attack.areaLengthFeet != null && attack.areaShape) {
    const shape = attack.areaShape.replace(/_/g, " ")
    if (attack.areaWidthFeet) {
      parts.push(`${attack.areaLengthFeet}×${attack.areaWidthFeet} ft. ${shape}`)
    } else {
      parts.push(`${attack.areaLengthFeet}-ft. ${shape}`)
    }
  }
  return parts.length ? parts.join(" · ") : null
}

function specialAttackDamageLabel(
  attack: SpecialAttackCharacteristic,
  ctx: ResolveUsesContext,
): string | null {
  if (attack.useWeaponDamage) return "Weapon damage"
  if (!(attack.damageDiceCount > 0)) return null
  const sides = dieSides(attack.damageDieType)
  const modifier = specialAttackDamageModifier(attack, ctx)
  const type = formatSpecialAttackDamageTypes(attack.damageTypes, attack.chooseDamageType)
  return `${attack.damageDiceCount}d${sides}${
    modifier ? ` ${formatSignedModifier(modifier)}` : ""
  }${type ? ` ${type}` : ""}`
}

function specialAttackProfileLabel(attack: SpecialAttackCharacteristic): string | null {
  if (attack.attackProfile === "ranged") return "Ranged"
  if (attack.attackProfile === "melee") return "Melee"
  if (attack.attackProfile === "force_save") return "Save"
  if (attack.attackProfile === "emanation") return "Emanation"
  return null
}

function healContextForAction(
  base: HealResolveContext | null | undefined,
  action: SheetActionEntry,
): HealResolveContext | null {
  if (!base) return null
  return {
    ...base,
    classLevel: action.classLevel ?? base.classLevel ?? base.characterLevel,
    hitDieSides: action.hitDieSides ?? base.hitDieSides ?? null,
  }
}

function isRedundantDropToOneHeal(effect: FeatureEffect): boolean {
  if (effect.kind !== "heal_self") return false
  const mode = effect.healMode ?? (effect.healAmount != null ? "fixed" : null)
  if (mode !== "fixed") return false
  return (effect.healFixed ?? effect.healAmount) === 1
}

function alsoActivateHitDiceNeeded(
  also: NonNullable<SheetActionEntry["alsoActivate"]>[number],
): number {
  if (also.spendHitDice != null && also.spendHitDice > 0) return also.spendHitDice
  const effect = also.healEffects?.find((row) => row.healMode === "hit_dice")
  if (!effect) return 0
  return resolveHitDiceHealCount(effect, also.classLevel ?? 1)
}

function hitDiceHealLabel(entry: SheetActionEntry): string | null {
  const effect = entry.healEffects?.find((row) => row.healMode === "hit_dice")
  if (!effect) return null
  const count = resolveHitDiceHealCount(effect, entry.classLevel ?? 1)
  const sides = entry.hitDieSides != null && entry.hitDieSides > 0 ? entry.hitDieSides : 8
  const ability = effect.healAbility ?? "CON"
  return `${count}d${sides} + ${ability}`
}

function ActionStatTile({
  caption,
  value,
}: {
  caption: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/10 px-2 py-1.5 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{caption}</p>
      <p className="text-sm font-black tabular-nums leading-tight text-foreground">{value}</p>
    </div>
  )
}

function UseDots({
  usage,
  label,
  tone = "default",
}: {
  usage: ActionUsage
  label: string
  tone?: keyof typeof SHEET_ACTION_USAGE_DOT
}) {
  const { max, used, setUsed } = usage
  const dotStyle = SHEET_ACTION_USAGE_DOT[tone]
  const toggle = (slotIndex: number) => {
    setUsed(slotIndex < used ? slotIndex : slotIndex + 1)
  }
  return (
    <div
      className="flex gap-1 shrink-0 flex-wrap justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      {Array.from({ length: max }, (_, index) => {
        const isUsed = index < used
        return (
          <button
            key={index}
            type="button"
            onClick={() => toggle(index)}
            className={`h-3.5 w-3.5 rounded border ${
              isUsed ? dotStyle.spent : dotStyle.available
            }`}
            aria-label={`${label} use ${index + 1}${isUsed ? " spent" : " available"}`}
          />
        )
      })}
    </div>
  )
}

function ActionRollStep({
  action,
  specialAttack,
  attackMod,
  saveModifier,
  proficiencyBonus,
  damageModifier,
  damageModifierNote = null,
  bonusDice = null,
  radiusBonusFeet = 0,
  psiSpent,
  hitDiceSpent,
  hitPointsSpent,
  augmentSummary,
  onClose,
}: {
  action: SheetActionEntry
  specialAttack: SpecialAttackCharacteristic
  attackMod: number
  saveModifier: number
  proficiencyBonus: number
  damageModifier: number
  damageModifierNote?: string | null
  /** Extra damage dice bought with a resource (e.g. Prime Bomb Reagents). */
  bonusDice?: { count: number; sides: number; label: string } | null
  radiusBonusFeet?: number
  psiSpent: number
  hitDiceSpent: number
  hitPointsSpent: number
  augmentSummary: string | null
  onClose: () => void
}) {
  const history = useSheetRollHistory()
  const rollCtx = useSheetRollContext()
  const [attackSummary, setAttackSummary] = useState<string | null>(null)
  const [damageRollText, setDamageRollText] = useState<string | null>(null)
  const choosesDamageType = specialAttackChoosesDamageType(specialAttack)
  const [selectedDamageType, setSelectedDamageType] = useState(
    specialAttack.damageTypes[0] ?? "",
  )
  const activeDamageType = choosesDamageType
    ? selectedDamageType
    : formatSpecialAttackDamageTypes(specialAttack.damageTypes, false)

  const isAttackRoll =
    specialAttack.attackProfile === "melee" || specialAttack.attackProfile === "ranged"
  const saveAbility = specialAttack.saveAbility?.trim() || null
  const saveDc =
    (specialAttack.saveDCBase ?? 8) + proficiencyBonus + saveModifier
  const effectiveRadius =
    specialAttack.areaLengthFeet != null
      ? specialAttack.areaLengthFeet + Math.max(0, radiusBonusFeet)
      : null

  const sides = dieSides(specialAttack.damageDieType)
  const extraDice = bonusDice && bonusDice.count > 0 ? bonusDice : null
  const damageExpression = `${specialAttack.damageDiceCount}d${sides}${
    extraDice ? ` + ${extraDice.count}d${extraDice.sides}` : ""
  }${damageModifier ? ` ${damageModifier >= 0 ? "+" : ""}${damageModifier}` : ""}${
    activeDamageType ? ` ${activeDamageType}` : ""
  }`

  const rollAttack = () => {
    const resolved = resolveRollMode({
      context: { kind: "attack" },
      activeConditions: rollCtx.activeConditions,
      exhaustionLevel: rollCtx.exhaustionLevel,
      manualOverride: "normal",
      classFeatures: rollCtx.classFeatures,
      limitationContext: {
        activeConditions: rollCtx.activeConditions,
        activeSheetToggles: rollCtx.activeSheetToggles,
        equippedArmor: rollCtx.equippedArmor,
        equippedShield: rollCtx.equippedShield,
        currentHp: rollCtx.featureEffectContext?.currentHp ?? rollCtx.currentHp,
      },
    })
    const rolled = rollD20WithMode(resolved.mode, attackMod + proficiencyBonus)
    const summary = formatD20RollSummary(rolled, attackMod + proficiencyBonus)
    setAttackSummary(summary)
    history?.logRoll({
      kind: "d20",
      label: `${action.name} attack`,
      summary,
      natural: rolled.natural,
      naturals: rolled.naturals,
    })
  }

  const rollDamage = () => {
    const result = rollDamageWithMode(
      {
        dice: [
          {
            count: specialAttack.damageDiceCount,
            sides,
          },
          ...(extraDice ? [{ count: extraDice.count, sides: extraDice.sides }] : []),
        ],
        modifier: damageModifier,
        flat: 0,
      },
      "normal",
    )
    const rollText = formatDamageRollResult(result.rolls, result.modifier, result.total)
    const summary = `${rollText}${activeDamageType ? ` ${activeDamageType}` : ""}`
    setDamageRollText(rollText)
    history?.logRoll({
      kind: "damage",
      label: `${action.name} damage`,
      summary,
    })
  }

  useEffect(() => {
    if (isAttackRoll) rollAttack()
    if (specialAttack.damageDiceCount > 0) rollDamage()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roll once when the step opens
  }, [])

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1">
        <p className="text-sm font-semibold text-foreground">Using {action.name}</p>
        {psiSpent > 0 ? (
          <p className="text-xs text-muted-foreground">Spent {psiSpent} psi points</p>
        ) : null}
        {hitDiceSpent > 0 ? (
          <p className="text-xs text-muted-foreground">
            Spent {hitDiceSpent} Hit Dice
          </p>
        ) : null}
        {hitPointsSpent > 0 ? (
          <p className="text-xs text-muted-foreground">
            Took {hitPointsSpent} HP (bypasses Temp HP)
          </p>
        ) : null}
        {augmentSummary ? (
          <p className="text-xs text-muted-foreground">{augmentSummary}</p>
        ) : null}
        {extraDice ? (
          <p className="text-xs font-semibold text-primary">{extraDice.label}</p>
        ) : null}
        {effectiveRadius != null && specialAttack.areaShape ? (
          <p className="text-xs font-semibold text-primary">
            {effectiveRadius}-foot-radius {specialAttack.areaShape}
          </p>
        ) : null}
      </div>

      {isAttackRoll ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Attack roll
          </p>
          <p className="text-lg font-black tabular-nums text-foreground">
            {attackSummary ?? "—"}
          </p>
          <button
            type="button"
            onClick={rollAttack}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40"
          >
            <Dices className="h-3.5 w-3.5" />
            Reroll attack
          </button>
        </div>
      ) : saveAbility ? (
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Save DC
          </p>
          <p className="text-lg font-black tabular-nums text-foreground">
            DC {saveDc} {saveAbility}
            {specialAttack.saveHalfDamage ? " (half on success)" : ""}
          </p>
        </div>
      ) : null}

      {specialAttack.damageDiceCount > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Damage ({damageExpression})
          </p>
          {choosesDamageType ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Damage type">
              {specialAttack.damageTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedDamageType(type)}
                  className={cn(
                    "rounded-lg border-2 px-3 py-1.5 text-xs font-semibold",
                    selectedDamageType === type
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          ) : null}
          {damageModifierNote ? (
            <p className="text-[11px] font-medium text-primary">{damageModifierNote}</p>
          ) : null}
          <p className="text-lg font-black tabular-nums text-foreground">
            {damageRollText
              ? `${damageRollText}${activeDamageType ? ` ${activeDamageType}` : ""}`
              : "—"}
          </p>
          <button
            type="button"
            onClick={rollDamage}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40"
          >
            <Dices className="h-3.5 w-3.5" />
            Reroll damage
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
      >
        Done
      </button>
    </div>
  )
}

function ActionDetailOverlay({
  action,
  usage,
  psiLimit,
  availablePsiPoints,
  psiResourceId,
  onSpendPsi,
  hitDiceRemaining,
  onSpendHitDice,
  onSpendHitPoints,
  onRefundHitPoints,
  onActivateSheetToggle,
  onSpawnIllusionToken,
  onGrantMutationDie,
  onMarkEconomy,
  incapacitated,
  resolveContext,
  onClose,
  characterId,
  onApplySelfHeal,
  onSetCurrentHp,
  onApplySelfInspiration,
  onApplySelfConditions,
  onAddDurationReminder,
  onApplyCompanionState,
  perfectedEnhancementBonus = 0,
  empoweredPsionicsBonus = 0,
  onMarkDamageDealt,
  onBankBalanceOfPower,
  onRestoreUseByResource,
  resolveResourcePool,
  allyCandidates = [],
  healContext = null,
  playerNoteValues = {},
  onPlayerNoteChange,
  onEquipmentChoiceChange,
  onRestorePactSlots,
  onRestoreSpellSlotsByCombinedLevel,
  onRestoreHitDice,
  onRestoreResourceFromSpellSlot,
  onSpendSpellSlot,
  primedBombUsedThisTurn = false,
  onPrimedBombUsed,
  firstUseNoActionUsedById = {},
  onFirstUseNoActionUsed,
  initialEconomyKind = null,
  knownSpells = [],
  onCastSpellChoice,
}: {
  action: SheetActionEntry
  usage: ActionUsage | null
  psiLimit?: number | null
  availablePsiPoints: number
  psiResourceId: string | null
  onSpendPsi: (points: number) => void
  hitDiceRemaining: number
  onSpendHitDice?: (amount: number, preferClassId?: string | null) => boolean
  onSpendHitPoints?: (amount: number) => void
  onRefundHitPoints?: (amount: number) => void
  /** Activate a sheet toggle when a menu option is used (e.g. Guardian Tactics Block). */
  onActivateSheetToggle?: (toggleId: string, note?: string) => void
  onSpawnIllusionToken?: (kind: IllusionTokenKind) => void
  onGrantMutationDie?: (opts: {
    autoApplyStrength: boolean
    perfected: boolean
    targetLabel: string
  }) => void
  onMarkEconomy?: (kind: ActionEconomyKind) => void
  incapacitated: boolean
  resolveContext: ResolveUsesContext
  onClose: () => void
  characterId?: string | null
  onApplySelfHeal?: (amount: number, kind: "heal" | "temp_hp") => void
  onSetCurrentHp?: (next: number) => void
  onApplySelfInspiration?: () => void
  onApplySelfConditions?: (add: string[], remove: string[]) => void
  onAddDurationReminder?: (label: string) => void
  onApplyCompanionState?: (key: string, patch: Partial<CharacterCompanionState>) => void
  perfectedEnhancementBonus?: number
  empoweredPsionicsBonus?: number
  onMarkDamageDealt?: () => void
  onBankBalanceOfPower?: (amount: number) => void
  onRestoreUseByResource?: () => string | null
  /** Look up an arbitrary class resource pool so an attack can be empowered by spending it. */
  resolveResourcePool?: (resourceKey: string, classId?: string | null) => ActionUsage | null
  allyCandidates?: PartyAllyCandidate[]
  healContext?: HealResolveContext | null
  playerNoteValues?: Record<string, string[]>
  onPlayerNoteChange?: (key: string, value: string) => void
  onEquipmentChoiceChange?: (key: string, value: string) => void
  onRestorePactSlots?: (mode: "half_round_up" | "all") => void
  onRestoreSpellSlotsByCombinedLevel?: (classLevel: number, maxSlotLevel: number) => void
  onRestoreHitDice?: (amount: number, classId?: string | null) => number
  onRestoreResourceFromSpellSlot?: (spec: {
    resourceKey: string
    classId?: string | null
    ability: "INT" | "WIS" | "CHA" | "STR" | "DEX" | "CON"
  }) => string | null
  onSpendSpellSlot?: (minSpellLevel: number) => string | null
  primedBombUsedThisTurn?: boolean
  onPrimedBombUsed?: () => void
  firstUseNoActionUsedById?: Record<string, boolean>
  onFirstUseNoActionUsed?: (actionId: string) => void
  initialEconomyKind?: ActionEconomyKind | null
  knownSpells?: Spell[]
  onCastSpellChoice?: (spell: Spell, choice: SheetCastSpellChoice) => void
}) {
  const [augmentSelections, setAugmentSelections] = useState<PsionicAugmentSelection[]>([])
  const [step, setStep] = useState<"detail" | "roll" | "target" | "spell" | "style">("detail")
  const [selectedActivationNames, setSelectedActivationNames] = useState<string[]>([])
  const [useFeedback, setUseFeedback] = useState<string | null>(null)
  const [parentUsedThisOpen, setParentUsedThisOpen] = useState(false)
  const [lastSpentHitPoints, setLastSpentHitPoints] = useState(0)
  const [resourceSpendAmount, setResourceSpendAmount] = useState(1)
  const [empowerSpend, setEmpowerSpend] = useState(0)
  const [overloadedChargeActive, setOverloadedChargeActive] = useState(false)
  const [selectedRiderNames, setSelectedRiderNames] = useState<string[]>([])
  const attackProfiles =
    action.specialAttacks?.length ? action.specialAttacks : action.specialAttack ? [action.specialAttack] : []
  const [selectedAttackProfileId, setSelectedAttackProfileId] = useState<string | null>(
    attackProfiles[0]?.id ?? null,
  )
  const [pendingHealEffects, setPendingHealEffects] = useState<FeatureEffect[]>([])
  const [applyingHeal, setApplyingHeal] = useState(false)
  const menuOptions = (action.menuOptions ?? []).filter(
    (option) => option.unlocksAtLevel == null || option.unlocksAtLevel <= action.classLevel,
  )
  const [selectedMenuOption, setSelectedMenuOption] = useState<string | null>(
    menuOptions[0]?.name ?? null,
  )
  const economyChoices = selectableEconomyKinds(
    action.kinds,
    action.spendsEconomy,
    action.trigger,
  )
  const [selectedEconomyKind, setSelectedEconomyKind] = useState<ActionEconomyKind>(
    initialEconomyKind && action.kinds.includes(initialEconomyKind)
      ? initialEconomyKind
      : (action.kinds[0] ?? "action"),
  )
  const overlayScrollRef = useRef<HTMLDivElement>(null)
  const history = useSheetRollHistory()
  const rollCtx = useSheetRollContext()
  const useActionTabs = attackProfiles.length > 1
  const [detailTab, setDetailTab] = useState(
    attackProfiles[0] ? `profile:${attackProfiles[0].id}` : "description",
  )

  const psionicAugments =
    action.psionicAugments ??
    (action.customAbilityId
      ? resolveAbilityPsionicAugments({
          name: action.name,
          description: action.description ?? null,
          psionic_augments: action.psionicAugments,
        })
      : null)

  const specialAttack =
    attackProfiles.find((profile) => profile.id === selectedAttackProfileId) ??
    attackProfiles[0] ??
    null
  const allTalentAlerts = action.relatedTalentAlerts ?? []
  const visibleTalentAlerts = allTalentAlerts.filter((alert) =>
    talentAlertAppliesToVariant(alert.appliesToAttackVariants, specialAttack?.attackVariant),
  )
  const selectableRiders = visibleTalentAlerts.filter((alert) => alert.selectable)
  const infoTalentAlerts = visibleTalentAlerts.filter((alert) => !alert.selectable)
  const staticInfoTalentAlerts = allTalentAlerts.filter(
    (alert) => !alert.selectable && !alert.appliesToAttackVariants?.length,
  )
  const variantInfoTalentAlerts = visibleTalentAlerts.filter(
    (alert) => !alert.selectable && Boolean(alert.appliesToAttackVariants?.length),
  )
  const psiCost = psionicAugments
    ? totalPsionicAugmentCost(psionicAugments, augmentSelections)
    : 0
  const augmentSummary =
    psionicAugments && augmentSelections.length
      ? formatPsionicAugmentSelectionSummary(psionicAugments, augmentSelections)
      : null

  const rollBonusParams = {
    proficiencyBonus: resolveContext.proficiencyBonus ?? 0,
    abilityMods: resolveContext.abilityModifiers,
    characterLevel: action.classLevel,
    classResourceDieSides: rollCtx.featureEffectContext?.classResourceDieSides,
  }
  const useBonusLines = formatSheetActionUseBonusLines(action.useBonuses, rollBonusParams)
  const requiredToggleId = action.requiresSheetToggle?.trim() || null
  const requiredToggleActive =
    !requiredToggleId || Boolean(rollCtx.activeSheetToggles?.has(requiredToggleId))
  const requiredToggleLabel = requiredToggleId
    ? getSheetToggleDefinition(requiredToggleId)?.label ?? requiredToggleId.replace(/_/g, " ")
    : null
  const selectedOption = menuOptions.find((option) => option.name === selectedMenuOption)
  const showEconomyPicker = economyChoices.length > 1 && menuOptions.length === 0
  const hitDiceCost =
    selectedOption?.hitDiceCost ??
    action.spendHitDice ??
    (menuOptions.length === 0 ? null : menuOptions[0]?.hitDiceCost ?? null)
  const hitDiceNeeded = hitDiceCost != null && hitDiceCost > 0 ? hitDiceCost : 0
  const riderHitPoints = selectableRiders
    .filter((alert) => selectedRiderNames.includes(alert.name) && (alert.spendHitPoints ?? 0) > 0)
    .reduce((max, alert) => Math.max(max, alert.spendHitPoints ?? 0), 0)
  const hitPointsNeeded =
    riderHitPoints > 0
      ? riderHitPoints
      : action.spendHitPoints != null && action.spendHitPoints > 0
        ? action.spendHitPoints
        : 0

  const resourceCostMode = action.limitedUses?.classResourceCostMode ?? "fixed"
  const configuredResourceCost = Math.max(1, action.limitedUses?.classResourceAmount ?? 1)
  const resourceSpendCap =
    resourceCostMode === "up_to_proficiency_bonus"
      ? Math.max(1, (resolveContext.proficiencyBonus ?? 2) * configuredResourceCost)
      : resourceCostMode === "up_to_ability_modifier"
        ? Math.max(
            1,
            resolveContext.abilityModifiers?.[
              action.limitedUses?.classResourceCostAbility ?? "CHA"
            ] ?? 0,
          ) * configuredResourceCost
        : configuredResourceCost
  // Menu options own their exact cost. A negative cost is a refund operation such as
  // distilling an Alchemist potion back into its original Reagents.
  const selectedResourceCost = selectedOption?.resourceCost
  const resourceSpend =
    selectedResourceCost != null
      ? selectedResourceCost
      : resourceCostMode === "fixed"
        ? configuredResourceCost
        : Math.max(1, Math.min(resourceSpendAmount, resourceSpendCap))
  const chargeExhausted =
    usage != null && resourceSpend > 0 && usage.max - usage.used < resourceSpend

  const empower = resolveSpecialAttackEmpower(specialAttack, action.classLevel)
  // The rider spends its own pool (Reagents, for a Bomb), which is usually not the pool the action
  // itself draws on, so it is resolved separately from `usage`.
  const empowerPool = empower
    ? (resolveResourcePool?.(empower.resourceKey, action.classId) ?? null)
    : null
  const baseEmpowerMax = Math.min(
    empower?.maxSpend ?? 0,
    empowerPool
      ? Math.max(
          0,
          empowerPool.max -
            empowerPool.used -
            (empowerPool.resourceId === usage?.resourceId ? resourceSpend : 0),
        )
      : 0,
  )
  const overloadedChargeKnown = Boolean(
    empower &&
      action.relatedTalentAlerts?.some((alert) => /^overloaded charge$/i.test(alert.name)),
  )
  const overloadedCharge = resolveOverloadedCharge(
    resolveContext.proficiencyBonus ?? 2,
    empowerPool ? empowerPool.max - empowerPool.used : 0,
  )
  const overloadedChargeCost = overloadedCharge.resourceCost
  const overloadedChargeSpend = overloadedCharge.effectiveSpend
  const overloadedChargeAffordable =
    overloadedChargeKnown && empowerPool != null && overloadedCharge.canAfford
  const empowerApplied =
    overloadedChargeActive && overloadedChargeAffordable
      ? overloadedChargeSpend
      : Math.max(0, Math.min(empowerSpend, baseEmpowerMax))
  const empowerResourceCost =
    overloadedChargeActive && overloadedChargeAffordable ? overloadedChargeCost : empowerApplied

  const canAffordPsi = psiCost <= availablePsiPoints && (psiLimit == null || psiCost <= psiLimit)
  const canAffordHitDice = hitDiceNeeded <= 0 || hitDiceNeeded <= hitDiceRemaining
  const primedModeSelected = specialAttack?.attackVariant === "primed"
  const primedBlocked = primedModeSelected && primedBombUsedThisTurn
  const canUse =
    !incapacitated &&
    requiredToggleActive &&
    !chargeExhausted &&
    canAffordPsi &&
    canAffordHitDice &&
    (psiCost === 0 || Boolean(psiResourceId)) &&
    (hitDiceNeeded === 0 || Boolean(onSpendHitDice)) &&
    (!overloadedChargeActive || overloadedChargeAffordable) &&
    (menuOptions.length === 0 || Boolean(selectedMenuOption)) &&
    !primedBlocked

  const optionUseAffordable = (option: SheetActionMenuOption) => {
    const optionHd = option.hitDiceCost != null && option.hitDiceCost > 0 ? option.hitDiceCost : 0
    const optionResource =
      option.resourceCost != null
        ? option.resourceCost
        : resourceCostMode === "fixed"
          ? configuredResourceCost
          : Math.max(1, Math.min(resourceSpendAmount, resourceSpendCap))
    const optionExhausted =
      usage != null && optionResource > 0 && usage.max - usage.used < optionResource
    return (
      !incapacitated &&
      !optionExhausted &&
      canAffordPsi &&
      (optionHd <= 0 || optionHd <= hitDiceRemaining) &&
      (psiCost === 0 || Boolean(psiResourceId)) &&
      (optionHd === 0 || Boolean(onSpendHitDice)) &&
      (!overloadedChargeActive || overloadedChargeAffordable) &&
      !primedBlocked
    )
  }

  const buttonCostLabel = (option?: SheetActionMenuOption) => {
    const optionHd =
      option?.hitDiceCost != null && option.hitDiceCost > 0
        ? option.hitDiceCost
        : !option && hitDiceNeeded > 0
          ? hitDiceNeeded
          : 0
    const optionResource =
      option?.resourceCost != null
        ? option.resourceCost
        : !option
          ? resourceSpend
          : resourceCostMode === "fixed"
            ? configuredResourceCost
            : Math.max(1, Math.min(resourceSpendAmount, resourceSpendCap))
    const extras: string[] = []
    if (option?.actionKind) extras.push(ACTION_KIND_LABELS[option.actionKind])
    else if (showEconomyPicker) extras.push(ACTION_KIND_LABELS[selectedEconomyKind])
    if (usage && action.classResourceKey) {
      if (optionResource < 0) extras.push(`refund ${Math.abs(optionResource)} ${usage.resourceName ?? "resource"}`)
      else if (optionResource > 0) extras.push(`${optionResource} ${usage.resourceName ?? "resource"}`)
    }
    if (empower && empowerApplied > 0) {
      extras.push(`+${empowerResourceCost} ${empowerPool?.resourceName ?? "resource"}`)
    }
    if (optionHd > 0) extras.push(`${optionHd} HD`)
    if (!option && hitPointsNeeded > 0) extras.push(`${hitPointsNeeded} HP`)
    if (psiCost > 0) extras.push(`${psiCost} psi`)
    return extras.length ? ` (${extras.join(", ")})` : ""
  }

  useEffect(() => {
    setAugmentSelections([])
    setStep("detail")
    setSelectedActivationNames([])
    setUseFeedback(null)
    setParentUsedThisOpen(false)
    setLastSpentHitPoints(0)
    setResourceSpendAmount(1)
    setEmpowerSpend(attackProfiles[0]?.attackVariant === "primed" ? 1 : 0)
    setOverloadedChargeActive(false)
    setSelectedRiderNames([])
    setSelectedAttackProfileId(attackProfiles[0]?.id ?? null)
    setSelectedMenuOption(menuOptions[0]?.name ?? null)
    setDetailTab(attackProfiles[0] ? `profile:${attackProfiles[0].id}` : "description")
    setSelectedEconomyKind(
      initialEconomyKind && action.kinds.includes(initialEconomyKind)
        ? initialEconomyKind
        : (action.kinds[0] ?? "action"),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when the opened action changes
  }, [action.id])

  const handleUse = (optionName?: string | null, activationNames?: string[]) => {
    const option =
      (optionName != null && optionName !== ""
        ? menuOptions.find((entry) => entry.name === optionName)
        : selectedOption) ?? undefined
    const useHitDiceCost =
      option?.hitDiceCost ??
      action.spendHitDice ??
      (menuOptions.length === 0 ? null : option?.hitDiceCost ?? null)
    const useHitDiceNeeded = useHitDiceCost != null && useHitDiceCost > 0 ? useHitDiceCost : 0
    const useResourceSpend =
      option?.resourceCost != null
        ? option.resourceCost
        : resourceCostMode === "fixed"
          ? configuredResourceCost
          : Math.max(1, Math.min(resourceSpendAmount, resourceSpendCap))
    const useChargeExhausted =
      usage != null && useResourceSpend > 0 && usage.max - usage.used < useResourceSpend
    const useCanAffordHitDice = useHitDiceNeeded <= 0 || useHitDiceNeeded <= hitDiceRemaining
    const useCanUse =
      !incapacitated &&
      requiredToggleActive &&
      !useChargeExhausted &&
      canAffordPsi &&
      useCanAffordHitDice &&
      (psiCost === 0 || Boolean(psiResourceId)) &&
      (useHitDiceNeeded === 0 || Boolean(onSpendHitDice)) &&
      (!overloadedChargeActive || overloadedChargeAffordable) &&
      (menuOptions.length === 0 || Boolean(option)) &&
      !primedBlocked
    if (!useCanUse) return

    const pickedStyles = activationNames ?? selectedActivationNames
    const stylePicks = action.activationPicks
    if (stylePicks?.options.length && pickedStyles.length < stylePicks.chooseCount) {
      setStep("style")
      return
    }

    if (action.castSpellChoice && onCastSpellChoice) {
      const choice = action.castSpellChoice
      const matches = filterSpellsForCastChoice(knownSpells, choice)
      if (choice.spellName) {
        const named = matches[0]
        if (!named) {
          setUseFeedback(`You do not have ${choice.spellName} prepared.`)
          return
        }
        onCastSpellChoice(named, choice)
        onClose()
        return
      }
      setStep("spell")
      return
    }

    if (useHitDiceNeeded > 0 && onSpendHitDice) {
      const ok = onSpendHitDice(useHitDiceNeeded, action.classId)
      if (!ok) {
        setUseFeedback("Not enough Hit Dice")
        return
      }
    }
    if (hitPointsNeeded > 0 && onSpendHitPoints) {
      onSpendHitPoints(hitPointsNeeded)
      setLastSpentHitPoints(hitPointsNeeded)
    }
    let spentSlotMessage: string | null = null
    if (action.spendSpellSlotOnUse && onSpendSpellSlot) {
      spentSlotMessage = onSpendSpellSlot(action.spendSpellSlotOnUse.minSpellLevel)
      if (!spentSlotMessage) {
        setUseFeedback("No spell slot available")
        return
      }
    }

    const spendViaAugments = psiCost > 0
    const sharesEmpowerPool =
      empowerPool != null && usage != null && empowerPool.resourceId === usage.resourceId
    if (usage && !spendViaAugments) {
      usage.setUsed(usage.used + useResourceSpend + (sharesEmpowerPool ? empowerResourceCost : 0))
    }
    setParentUsedThisOpen(true)
    if (empowerPool && empowerResourceCost > 0 && !sharesEmpowerPool) {
      empowerPool.setUsed(empowerPool.used + empowerResourceCost)
    }
    if (spendViaAugments) {
      onSpendPsi(psiCost)
    }

    const parts: string[] = []
    if (action.dropToOneHpOnUse && onSetCurrentHp) {
      onSetCurrentHp(1)
      parts.push("Dropped to 1 HP")
    }
    if (hitPointsNeeded > 0) {
      parts.push(`Took ${hitPointsNeeded} HP`)
    }
    if (action.restorePactSlotsOnUse && onRestorePactSlots) {
      onRestorePactSlots(action.restorePactSlotsOnUse)
      parts.push(
        action.restorePactSlotsOnUse === "all"
          ? "Restored all Pact Magic slots"
          : "Restored half of Pact Magic slots (rounded up)",
      )
    }
    if (action.restoreSpellSlotsOnUse && onRestoreSpellSlotsByCombinedLevel) {
      onRestoreSpellSlotsByCombinedLevel(
        action.classLevel,
        action.restoreSpellSlotsOnUse.maxSlotLevel,
      )
      parts.push(
        `Recovered spell slots totaling half Wizard level (max ${action.restoreSpellSlotsOnUse.maxSlotLevel}th)`,
      )
    }
    if (action.restoreHitDiceOnUse && onRestoreHitDice) {
      const recovered = onRestoreHitDice(action.restoreHitDiceOnUse.amount, action.classId)
      parts.push(
        recovered > 0
          ? `Regained ${recovered} Hit Point Dice (up to ${action.restoreHitDiceOnUse.amount})`
          : "No expended Hit Point Dice to regain",
      )
    }
    if (action.restoreResourceFromSpellSlotOnUse && onRestoreResourceFromSpellSlot) {
      const restored = onRestoreResourceFromSpellSlot({
        resourceKey: action.restoreResourceFromSpellSlotOnUse.resourceKey,
        classId: action.classId,
        ability: action.restoreResourceFromSpellSlotOnUse.ability,
      })
      parts.push(restored ?? "No expended spell slot to convert")
    }
    if (spentSlotMessage) {
      parts.push(spentSlotMessage)
    }
    if (empower && empowerApplied > 0) {
      parts.push(
        overloadedChargeActive
          ? `Overloaded Charge: spent ${empowerResourceCost} ${empowerPool?.resourceName ?? empower.resourceKey.replace(/_/g, " ")} for ${formatEmpowerEffect(empower, empowerApplied)}`
          : `Spent ${empowerResourceCost} ${empowerPool?.resourceName ?? empower.resourceKey.replace(/_/g, " ")} · ${formatEmpowerEffect(empower, empowerApplied)}`,
      )
    }
    if (primedModeSelected) {
      onPrimedBombUsed?.()
    }
    const appliedRiders = selectableRiders.filter((alert) => selectedRiderNames.includes(alert.name))
    if (appliedRiders.length) {
      parts.push(`Riders: ${appliedRiders.map((alert) => alert.name).join(", ")}`)
    }
    if (option) {
      parts.push(
        option.costLabel
          ? `${option.name} (${option.costLabel})`
          : option.name,
      )
      if (useResourceSpend < 0) {
        parts.push(`Recovered ${Math.abs(useResourceSpend)} ${usage?.resourceName ?? "resource"}`)
      }
    }

    const optionDieBonus =
      option && isResourceDieBonusConfig(option.bonusConfig)
        ? bonusFromResourceDieOption({
            name: option.name,
            description: option.description,
            bonusConfig: option.bonusConfig,
          })
        : null
    const dieBonuses = optionDieBonus ? [optionDieBonus] : action.useBonuses
    const rolledDie = rollResourceDieUseBonuses(dieBonuses, {
      proficiencyBonus:
        rollCtx.featureEffectContext?.proficiencyBonus ?? resolveContext.proficiencyBonus ?? 0,
      abilityMods: rollCtx.featureEffectContext?.abilityMods ?? {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      characterLevel: rollCtx.featureEffectContext?.characterLevel ?? action.classLevel,
      classResourceDieSides: rollCtx.featureEffectContext?.classResourceDieSides,
    })
    for (const rolled of rolledDie) {
      parts.push(rolled.line)
      history?.logRoll({
        kind: "manual",
        label: action.name,
        summary: `${action.name}: ${rolled.summary}`,
        natural: rolled.natural,
      })
    }

    const morphToggleId = option
      ? weaponMorphToggleIdForOption(option.name)
      : null
    const toggleId =
      morphToggleId ??
      (option ? guardianTacticsToggleIdForOption(option.name) : null) ??
      sheetToggleIdActivatedByAction(action)
    if (toggleId && onActivateSheetToggle) {
      const styleNote = pickedStyles.length ? pickedStyles.join(" + ") : undefined
      onActivateSheetToggle(toggleId, styleNote)
      parts.push(toggleId === "__end_weapon_morph__" ? "Morph ended" : "Toggle on")
      for (const styleName of pickedStyles) {
        const styleToggle = stylePicks?.options.find((option) => option.name === styleName)
          ?.sheetToggleId
        if (styleToggle && styleToggle !== toggleId) {
          onActivateSheetToggle(styleToggle)
        }
      }
      if (styleNote) parts.push(styleNote)
    }

    const actionName = action.name.trim().toLowerCase()
    if (actionName === "projected self" && onSpawnIllusionToken) {
      onSpawnIllusionToken("projected_self")
      if (onActivateSheetToggle) onActivateSheetToggle("projected_self_active")
      parts.push("Illusion token")
    }
    if (actionName === "imaginary ally" && onSpawnIllusionToken) {
      onSpawnIllusionToken("imaginary_ally")
      parts.push("Illusion token")
    }
    if (actionName === "swollen muscles" && onActivateSheetToggle) {
      onActivateSheetToggle("swollen_muscles_active")
      parts.push("Toggle on")
    }
    if (actionName === "flesh warp" && onGrantMutationDie) {
      const selectedAugmentNames = (psionicAugments?.augments ?? [])
        .filter((augment) =>
          augmentSelections.some((selection) => selection.augmentId === augment.id),
        )
        .map((augment) => augment.name)
      const autoApplyStrength = selectedAugmentNames.some((name) => /muscular/i.test(name))
      const perfected = selectedAugmentNames.some((name) => /perfected/i.test(name))
      onGrantMutationDie({
        autoApplyStrength,
        perfected,
        targetLabel: "Self",
      })
      parts.push(perfected ? "Mutation Die (Perfected)" : "Mutation Die")
    }

    const firstUseFree =
      Boolean(action.firstUseNoAction) && !firstUseNoActionUsedById[action.id]
    if (firstUseFree) {
      onFirstUseNoActionUsed?.(action.id)
      parts.push("First use this turn (no action)")
    } else if (onMarkEconomy) {
      if (option?.actionKind) {
        onMarkEconomy(option.actionKind)
      } else if (action.spendsEconomy !== false) {
        const economyKinds = economyChoices.length ? [selectedEconomyKind] : action.kinds
        for (const kind of economyKinds) {
          onMarkEconomy(kind)
        }
      }
    }
    if ((specialAttack?.damageDiceCount ?? 0) > 0 && onMarkDamageDealt) {
      onMarkDamageDealt()
    }
    if (useHitDiceNeeded > 0) parts.push(`Spent ${useHitDiceNeeded} Hit Dice`)
    if (psiCost > 0) parts.push(`Spent ${psiCost} psi`)
    if (augmentSummary) parts.push(augmentSummary)
    if (usage && !spendViaAugments && useResourceSpend > 0) {
      parts.push(`Spent ${useResourceSpend} ${usage.resourceName ?? "resource"}`)
    }

    const actionHealCtx = healContextForAction(healContext, action)
    const targetable = collectTargetableEffects(
      action.dropToOneHpOnUse
        ? action.healEffects?.filter((effect) => !isRedundantDropToOneHeal(effect))
        : action.healEffects,
    )
    const needsAllyPick = targetable.some((entry) => entry.policy === "choose_ally")
    if (needsAllyPick && actionHealCtx) {
      setPendingHealEffects(targetable.map((entry) => entry.effect))
      setUseFeedback(parts.join(" · ") || null)
      setStep("target")
      return
    }

    if (targetable.length && actionHealCtx && characterId && onApplySelfHeal) {
      const healParts = [...parts]
      const isPsionicPower = action.abilityRole === "psionic_power"
      let banked = 0
      for (const { effect } of targetable) {
        const resolved = resolveFeatureEffectHeal(effect, actionHealCtx)
        let amount = resolved.amount
        if (amount <= 0) continue
        const kind = effect.kind === "grant_temp_hp" ? "temp_hp" : "heal"
        if (
          kind === "temp_hp" &&
          isPsionicPower &&
          perfectedEnhancementBonus > 0
        ) {
          amount += perfectedEnhancementBonus
          healParts.push(`Perfected Enhancement (+${perfectedEnhancementBonus} PB)`)
        }
        onApplySelfHeal(amount, kind)
        if (isPsionicPower) banked += amount
        healParts.push(
          kind === "temp_hp"
            ? `+${amount} temp HP`
            : resolved.summary
              ? `Healed ${resolved.summary}`
              : `Healed ${amount} HP`,
        )
      }
      if (banked > 0 && onBankBalanceOfPower) onBankBalanceOfPower(banked)
      setUseFeedback(healParts.join(" · ") || "Used!")
      if (specialAttack && (specialAttack.damageDiceCount > 0 || specialAttack.attackProfile)) {
        setStep("roll")
        return
      }
      setStep("detail")
      return
    }

    if (specialAttack && (specialAttack.damageDiceCount > 0 || specialAttack.attackProfile)) {
      setStep("roll")
      return
    }

    setUseFeedback(parts.join(" · ") || "Used!")
    setStep("detail")
  }

  const handleAlsoActivate = (
    also: NonNullable<SheetActionEntry["alsoActivate"]>[number],
  ) => {
    if (incapacitated) return
    const hdNeeded = alsoActivateHitDiceNeeded(also)
    if (hdNeeded > 0 && !onSpendHitDice) return
    if (hdNeeded > hitDiceRemaining) {
      setUseFeedback(`Not enough Hit Dice (need ${hdNeeded})`)
      return
    }

    const parts: string[] = []
    if (!parentUsedThisOpen) {
      if (chargeExhausted) return
      if (usage) usage.setUsed(usage.used + 1)
      if (action.dropToOneHpOnUse && onSetCurrentHp) {
        onSetCurrentHp(1)
        parts.push("Dropped to 1 HP")
      }
      setParentUsedThisOpen(true)
    }

    if (hdNeeded > 0 && onSpendHitDice) {
      const ok = onSpendHitDice(hdNeeded, also.classId ?? action.classId)
      if (!ok) {
        setUseFeedback("Not enough Hit Dice")
        return
      }
      parts.push(`Spent ${hdNeeded} Hit Dice`)
    }

    const alsoCtx = healContext
      ? {
          ...healContext,
          classLevel: also.classLevel ?? action.classLevel ?? healContext.classLevel,
          hitDieSides: also.hitDieSides ?? action.hitDieSides ?? healContext.hitDieSides ?? null,
        }
      : null
    if (also.healEffects?.length && alsoCtx && onApplySelfHeal) {
      for (const effect of also.healEffects) {
        const resolved = resolveFeatureEffectHeal(effect, alsoCtx)
        if (resolved.amount <= 0) continue
        const kind = effect.kind === "grant_temp_hp" ? "temp_hp" : "heal"
        onApplySelfHeal(resolved.amount, kind)
        parts.push(
          kind === "temp_hp"
            ? `+${resolved.amount} temp HP`
            : resolved.summary
              ? `${also.name}: ${resolved.summary}`
              : `${also.name}: healed ${resolved.amount} HP`,
        )
      }
    } else {
      parts.push(`Used ${also.name}`)
    }
    setUseFeedback(parts.join(" · ") || `Used ${also.name}`)
  }

  const handlePickTarget = async (target: PartyEffectTarget) => {
    const actionHealCtx = healContextForAction(healContext, action)
    if (!actionHealCtx || !pendingHealEffects.length) return
    setApplyingHeal(true)
    try {
      const parts: string[] = useFeedback ? [useFeedback] : []
      let banked = 0
      let perfectedApplied = false
      const candidate = allyCandidates.find((row) =>
        row.kind === "companion" && target.kind === "companion"
          ? row.characterId === target.characterId && row.companionKey === target.companionKey
          : row.kind === "character" &&
            target.kind === "character" &&
            row.characterId === target.characterId,
      )
      const isLocalTarget = target.characterId === characterId

      for (const effect of pendingHealEffects) {
        let effectForApply = effect
        if (
          effect.kind === "grant_temp_hp" &&
          action.abilityRole === "psionic_power" &&
          perfectedEnhancementBonus > 0 &&
          !perfectedApplied
        ) {
          effectForApply = {
            ...effect,
            healFlatBonus: (effect.healFlatBonus ?? 0) + perfectedEnhancementBonus,
          }
          perfectedApplied = true
          parts.push(`Perfected Enhancement (+${perfectedEnhancementBonus} PB)`)
        }

        if (isLocalTarget) {
          const play =
            target.kind === "character"
              ? {
                  ...defaultSheetPlayState(),
                  currentHp: candidate?.currentHp ?? null,
                  tempHp: candidate?.tempHp ?? 0,
                  activeConditions: candidate?.activeConditions ?? [],
                  hasInspiration: candidate?.hasInspiration ?? false,
                }
              : null
          const companion =
            target.kind === "companion"
              ? {
                  key: target.companionKey,
                  currentHp: candidate?.currentHp ?? null,
                  tempHp: candidate?.tempHp ?? null,
                  activeConditions: candidate?.activeConditions ?? [],
                }
              : null
          const result = applyAllyEffectLocally({
            effect: effectForApply,
            target,
            healContext: actionHealCtx,
            play,
            companion,
            maxHp: candidate?.maxHp ?? null,
          })
          if (!result) continue
          if (result.kind === "heal" || result.kind === "temp_hp") {
            if (target.kind === "character" && result.amount > 0 && onApplySelfHeal) {
              onApplySelfHeal(result.amount, result.kind)
            }
            if (action.abilityRole === "psionic_power") banked += result.amount
          }
          if (target.kind === "character") {
            if (result.playPatch?.hasInspiration) onApplySelfInspiration?.()
            const add = effectForApply.effectConditionTypes ?? []
            const remove = effectForApply.removeConditions ?? []
            if (add.length || remove.length) onApplySelfConditions?.(add, remove)
            const reminder = result.playPatch?.durationReminders?.at(-1)
            if (reminder) onAddDurationReminder?.(reminder.label)
          } else if (result.companionPatch) {
            onApplyCompanionState?.(target.companionKey, result.companionPatch)
          }
          parts.push(`${result.summary} → ${result.targetLabel}`)
          continue
        }

        const result = await applyPartyHealEffect({
          effect: effectForApply,
          target,
          healContext: actionHealCtx,
          selfCharacterId: characterId,
        })
        if (!result) continue
        if (action.abilityRole === "psionic_power" && result.amount > 0) banked += result.amount
        parts.push(`${result.summary} → ${result.targetLabel}`)
      }
      if (banked > 0 && onBankBalanceOfPower) onBankBalanceOfPower(banked)
      setUseFeedback(parts.join(" · ") || "Used!")
      setStep("detail")
      setPendingHealEffects([])
    } catch (error) {
      setUseFeedback(error instanceof Error ? error.message : "Could not apply effect.")
    } finally {
      setApplyingHeal(false)
    }
  }

  const conMod = resolveContext.abilityModifiers?.CON ?? 0
  const vengeanceDamageMod =
    hitDiceNeeded > 0 && specialAttack && /vengeance/i.test(action.name) ? conMod : 0
  const empoweredPsionicsDamageMod =
    action.abilityRole === "psionic_power" && (specialAttack?.damageDiceCount ?? 0) > 0
      ? empoweredPsionicsBonus
      : 0
  const selectedAttackModifier = specialAttack
    ? specialAttackModifier(specialAttack, resolveContext)
    : attackModifierFromContext(resolveContext)
  const selectedSaveModifier = specialAttack
    ? specialAttackSaveModifier(specialAttack, resolveContext)
    : selectedAttackModifier
  const selectedDamageModifier = specialAttack
    ? specialAttackDamageModifier(specialAttack, resolveContext)
    : 0
  const radiusBonusFeet =
    empower?.radiusFeetPerResource && empowerApplied > 0
      ? empower.radiusFeetPerResource * empowerApplied
      : 0

  const selectAttackProfile = (profile: SpecialAttackCharacteristic) => {
    setSelectedAttackProfileId(profile.id)
    setEmpowerSpend(profile.attackVariant === "primed" ? 1 : 0)
    setOverloadedChargeActive(false)
    setSelectedRiderNames([])
  }

  const handleDetailTabChange = (value: string) => {
    setDetailTab(value)
    if (value.startsWith("profile:")) {
      const profile = attackProfiles.find((entry) => `profile:${entry.id}` === value)
      if (profile) selectAttackProfile(profile)
    }
    overlayScrollRef.current?.scrollTo({ top: 0 })
  }

  const toggleRider = (name: string) => {
    setSelectedRiderNames((current) =>
      current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name],
    )
  }

  const overlayIcon = action.icon?.trim() || specialAttack?.icon?.trim() || ""

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        ref={overlayScrollRef}
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-2 border-border rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-[1] space-y-3 border-b border-border bg-card/95 p-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
                {overlayIcon ? (
                  <GameIcon name={overlayIcon} className="h-5 w-5 shrink-0 text-primary" />
                ) : null}
                {action.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {action.sourceLabel}
                {" · "}
              {action.trigger
                ? action.trigger
                : showEconomyPicker
                  ? economyChoices.map((kind) => ACTION_KIND_LABELS[kind]).join(" or ")
                  : action.kinds.map((kind) => ACTION_KIND_LABELS[kind]).join(", ")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {useActionTabs && step === "detail" ? (
            <div
              role="tablist"
              aria-label={`${action.name} details`}
              className={cn(
                "grid gap-1",
                attackProfiles.length >= 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={detailTab === "description"}
                onClick={() => handleDetailTabChange("description")}
                className={cn(
                  ACTION_DETAIL_TAB_TRIGGER_CLASS,
                  detailTab === "description"
                    ? "border-border bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                Description
              </button>
              {attackProfiles.map((profile) => {
                const tabValue = `profile:${profile.id}`
                const selected = detailTab === tabValue
                return (
                  <button
                    key={profile.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => handleDetailTabChange(tabValue)}
                    className={cn(
                      ACTION_DETAIL_TAB_TRIGGER_CLASS,
                      "inline-flex items-center justify-center gap-1.5",
                      selected
                        ? "border-border bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50",
                      profile.attackVariant === "primed" && primedBombUsedThisTurn && "opacity-60",
                    )}
                  >
                    {profile.icon ? (
                      <GameIcon name={profile.icon} className="h-3.5 w-3.5 shrink-0" />
                    ) : null}
                    {attackProfileActionLabel(profile)}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        {step === "roll" && specialAttack ? (
          <ActionRollStep
            action={action}
            specialAttack={specialAttack}
            attackMod={selectedAttackModifier}
            saveModifier={selectedSaveModifier}
            proficiencyBonus={resolveContext.proficiencyBonus ?? 0}
            damageModifier={
              selectedDamageModifier + vengeanceDamageMod + empoweredPsionicsDamageMod
            }
            damageModifierNote={
              specialAttack.damageAbilityModifier === "INT"
                ? `Intelligent Explosions (+${selectedDamageModifier} INT, minimum +1)`
                : empoweredPsionicsDamageMod > 0
                ? `Empowered Psionics (+${empoweredPsionicsDamageMod} INT)`
                : null
            }
            bonusDice={
              empower && empowerApplied > 0 && empower.dicePerResource > 0
                ? {
                    count: empower.dicePerResource * empowerApplied,
                    sides: empower.dieSides,
                    label: `${empowerApplied} ${empowerPool?.resourceName ?? empower.resourceKey.replace(/_/g, " ")} · ${formatEmpowerEffect(empower, empowerApplied)}`,
                  }
                : null
            }
            radiusBonusFeet={radiusBonusFeet}
            psiSpent={psiCost}
            hitDiceSpent={hitDiceNeeded}
            hitPointsSpent={hitPointsNeeded}
            augmentSummary={augmentSummary}
            onClose={onClose}
          />
        ) : step === "spell" && action.castSpellChoice ? (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose a spell with a casting time of one action.
            </p>
            {filterSpellsForCastChoice(knownSpells, action.castSpellChoice).length === 0 ? (
              <p className="text-sm text-destructive">
                No one-action spells are prepared. Add a 1-action spell on this sheet first.
              </p>
            ) : (
              <div className="grid gap-2">
                {filterSpellsForCastChoice(knownSpells, action.castSpellChoice).map((spell) => (
                  <button
                    key={spell.id}
                    type="button"
                    onClick={() => {
                      onCastSpellChoice?.(spell, action.castSpellChoice!)
                      onClose()
                    }}
                    className="rounded-xl border-2 border-border px-3 py-2 text-left text-sm hover:border-primary/50"
                  >
                    <div className="font-semibold">{spell.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {spellLevelLabel(spell.level)}
                      {spell.casting_time ? ` · ${spell.casting_time}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : step === "style" && action.activationPicks ? (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              {action.activationPicks.title}
              {action.activationPicks.chooseCount > 1
                ? ` (${selectedActivationNames.length}/${action.activationPicks.chooseCount})`
                : ""}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {action.activationPicks.options.map((option) => {
                const selected = selectedActivationNames.includes(option.name)
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => {
                      if (action.activationPicks!.chooseCount <= 1) {
                        setSelectedActivationNames([option.name])
                        handleUse(undefined, [option.name])
                        return
                      }
                      setSelectedActivationNames((prev) => {
                        if (prev.includes(option.name)) {
                          return prev.filter((name) => name !== option.name)
                        }
                        if (prev.length >= action.activationPicks!.chooseCount) return prev
                        return [...prev, option.name]
                      })
                    }}
                    className={`rounded-xl border-2 px-3 py-2 text-left text-sm hover:border-primary/50 ${
                      selected ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <div className="font-semibold">{option.name}</div>
                    {option.description ? (
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-3">
                        {option.description}
                      </div>
                    ) : null}
                  </button>
                )
              })}
            </div>
            {action.activationPicks.chooseCount > 1 ? (
              <button
                type="button"
                disabled={selectedActivationNames.length < action.activationPicks.chooseCount}
                onClick={() => handleUse(undefined, selectedActivationNames)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Continue
              </button>
            ) : null}
          </div>
        ) : step === "target" ? (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Choose who receives this effect.</p>
            {allyCandidates.length === 0 ? (
              <p className="text-sm text-destructive">
                No allies found. Your companions appear here even without a party; add a party on
                the Characters page to include other characters.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {allyCandidates.map((candidate) => {
                  const key =
                    candidate.kind === "companion"
                      ? `${candidate.characterId}:${candidate.companionKey}`
                      : candidate.characterId
                  const hpLabel =
                    candidate.currentHp != null
                      ? `HP ${candidate.currentHp}${candidate.maxHp != null ? `/${candidate.maxHp}` : ""}`
                      : candidate.kind === "companion"
                        ? "Companion"
                        : "Ally"
                  const tempLabel =
                    candidate.tempHp != null && candidate.tempHp > 0 ? ` · +${candidate.tempHp} temp` : ""
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={applyingHeal}
                      onClick={() => void handlePickTarget(candidate)}
                      className="rounded-xl border-2 border-border px-3 py-2 text-left text-sm hover:border-primary/50 disabled:opacity-50"
                    >
                      <div className="font-semibold">
                        {allyCandidateDisplayLabel(candidate, characterId)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {hpLabel}
                        {tempLabel}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            {useFeedback ? <p className="text-xs text-muted-foreground">{useFeedback}</p> : null}
          </div>
        ) : (
          <>
            {useActionTabs ? (
              detailTab === "description" ? (
                <div className="space-y-3 p-4">
                  <ActionInfoTalentAlerts alerts={staticInfoTalentAlerts} />
                  {(action.castingTime || action.range || action.duration) ? (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      {action.castingTime ? (
                        <>
                          <dt className="text-muted-foreground">Casting Time</dt>
                          <dd className="text-foreground">{action.castingTime}</dd>
                        </>
                      ) : null}
                      {action.range ? (
                        <>
                          <dt className="text-muted-foreground">Range</dt>
                          <dd className="text-foreground">{action.range}</dd>
                        </>
                      ) : null}
                      {action.components?.length ? (
                        <>
                          <dt className="text-muted-foreground">Components</dt>
                          <dd className="text-foreground">{action.components.join(", ")}</dd>
                        </>
                      ) : null}
                      {action.duration ? (
                        <>
                          <dt className="text-muted-foreground">Duration</dt>
                          <dd className="text-foreground">
                            {action.duration}
                            {action.concentration ? " (Concentration)" : ""}
                          </dd>
                        </>
                      ) : null}
                    </dl>
                  ) : null}
                  <RichTextContent
                    html={action.description}
                    className="text-sm text-foreground/90 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
                  />
                  {action.equipmentChoices?.map((choice) => {
                    const key = actionEquipmentChoiceKey(action, choice.id)
                    const listId = `${key}:options`
                    return (
                      <label key={key} className="block space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {choice.label}
                        </span>
                        <input
                          key={`${key}:${playerNoteValues[key]?.[0] ?? ""}`}
                          type="text"
                          list={choice.options.length ? listId : undefined}
                          defaultValue={playerNoteValues[key]?.[0] ?? ""}
                          onBlur={(event) =>
                            onEquipmentChoiceChange?.(key, event.target.value.trim())
                          }
                          placeholder={
                            choice.allowCustom
                              ? "Choose an item or enter another name…"
                              : "Choose an item…"
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                        {choice.options.length ? (
                          <datalist id={listId}>
                            {choice.options.map((option) => (
                              <option key={option} value={option} />
                            ))}
                          </datalist>
                        ) : null}
                        <span className="block text-[11px] text-muted-foreground">
                          Change this after completing the relinking rest or ritual described above.
                        </span>
                      </label>
                    )
                  })}
                  {action.playerNotes?.map((note) => {
                    const key = actionPlayerNoteKey(action, note.id)
                    return (
                      <label key={key} className="block space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {note.prompt}
                        </span>
                        <textarea
                          key={`${key}:${playerNoteValues[key]?.[0] ?? ""}`}
                          defaultValue={playerNoteValues[key]?.[0] ?? ""}
                          onBlur={(event) => onPlayerNoteChange?.(key, event.target.value)}
                          rows={3}
                          placeholder={note.placeholder}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                      </label>
                    )
                  })}
                  <p className="text-xs text-muted-foreground">
                    Choose a mode above to use this feature.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                    {specialAttack?.attackVariant !== "explode" &&
                    attackProfiles.some((entry) => entry.attackVariant === "primed") ? (
                      <p className="text-[11px] text-muted-foreground">
                        Extra Attack lets you throw more regular bombs; only one can be Primed per
                        Attack action.
                        {primedBombUsedThisTurn ? " Primed already used this turn." : ""}
                      </p>
                    ) : null}
                    {usage ? (
                      <p className="text-xs font-semibold text-foreground">
                        {usage.resourceName ? `${usage.resourceName}: ` : "Uses: "}
                        <span className="tabular-nums">
                          {usage.max - usage.used} / {usage.max} remaining
                        </span>
                      </p>
                    ) : null}
                    {hitDiceNeeded > 0 ||
                    menuOptions.some((option) => (option.hitDiceCost ?? 0) > 0) ? (
                      <p className="text-xs text-muted-foreground">
                        Hit Dice available:{" "}
                        <span className="tabular-nums font-semibold text-foreground">
                          {hitDiceRemaining}
                        </span>
                      </p>
                    ) : null}
                    {menuOptions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Choose option
                        </p>
                        <div className="grid gap-2">
                          {menuOptions.map((option) => {
                            const selected = option.name === selectedMenuOption
                            const cost = option.hitDiceCost ?? 0
                            const affordable = cost <= 0 || cost <= hitDiceRemaining
                            return (
                              <button
                                key={option.name}
                                type="button"
                                disabled={!affordable}
                                onClick={() => setSelectedMenuOption(option.name)}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                                  selected
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/40",
                                  !affordable && "opacity-50",
                                )}
                              >
                                <span className="font-semibold text-foreground">{option.name}</span>
                                {cost > 0 ? (
                                  <span className="ml-2 text-muted-foreground">{cost} Hit Dice</span>
                                ) : option.costLabel ? (
                                  <span className="ml-2 text-muted-foreground">{option.costLabel}</span>
                                ) : null}
                                {option.description ? (
                                  <RichTextContent
                                    html={option.description}
                                    className="mt-1 text-xs text-muted-foreground leading-relaxed [&_p]:mb-0"
                                    fallback=""
                                  />
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                    {psionicAugments ? (
                      <PsionicAugmentPicker
                        config={psionicAugments}
                        psiLimit={psiLimit}
                        availablePsiPoints={availablePsiPoints}
                        selections={augmentSelections}
                        onChange={setAugmentSelections}
                      />
                    ) : null}
                    <ActionSelectableRiders
                      riders={selectableRiders}
                      selectedRiderNames={selectedRiderNames}
                      onToggle={toggleRider}
                    />
                    <ActionInfoTalentAlerts alerts={variantInfoTalentAlerts} />
                </div>
              )
            ) : (
            <div className="p-4 space-y-3">
              {attackProfiles.length > 1 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Attack mode
                  </p>
                  <div className={cn("grid gap-2", attackProfiles.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
                    {attackProfiles.map((profile) => {
                      const selected = profile.id === specialAttack?.id
                      const primedLocked =
                        profile.attackVariant === "primed" && primedBombUsedThisTurn
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => selectAttackProfile(profile)}
                          className={cn(
                            "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                            selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border hover:border-primary/40",
                            primedLocked && "opacity-60",
                          )}
                        >
                          {profile.icon ? (
                            <GameIcon name={profile.icon} className="h-3.5 w-3.5 shrink-0" />
                          ) : null}
                          {attackProfileActionLabel(profile)}
                        </button>
                      )
                    })}
                  </div>
                  {attackProfiles.some((profile) => profile.attackVariant === "primed") ? (
                    <p className="text-[11px] text-muted-foreground">
                      Extra Attack lets you throw more regular bombs; only one can be Primed per
                      Attack action.
                      {primedBombUsedThisTurn ? " Primed already used this turn." : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {usage ? (
                <p className="text-xs font-semibold text-foreground">
                  {usage.resourceName ? `${usage.resourceName}: ` : "Uses: "}
                  <span className="tabular-nums">
                    {usage.max - usage.used} / {usage.max} remaining
                  </span>
                </p>
              ) : null}
              {hitDiceNeeded > 0 ||
              menuOptions.some((option) => (option.hitDiceCost ?? 0) > 0) ? (
                <p className="text-xs text-muted-foreground">
                  Hit Dice available:{" "}
                  <span className="tabular-nums font-semibold text-foreground">
                    {hitDiceRemaining}
                  </span>
                </p>
              ) : null}
              {menuOptions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Choose option
                  </p>
                  <div className="grid gap-2">
                    {menuOptions.map((option) => {
                      const selected = option.name === selectedMenuOption
                      const cost = option.hitDiceCost ?? 0
                      const affordable = cost <= 0 || cost <= hitDiceRemaining
                      return (
                        <button
                          key={option.name}
                          type="button"
                          disabled={!affordable}
                          onClick={() => setSelectedMenuOption(option.name)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                            selected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/40",
                            !affordable && "opacity-50",
                          )}
                        >
                          <span className="font-semibold text-foreground">{option.name}</span>
                          {cost > 0 ? (
                            <span className="ml-2 text-muted-foreground">{cost} Hit Dice</span>
                          ) : option.costLabel ? (
                            <span className="ml-2 text-muted-foreground">{option.costLabel}</span>
                          ) : null}
                          {option.description ? (
                            <RichTextContent
                              html={option.description}
                              className="mt-1 text-xs text-muted-foreground leading-relaxed [&_p]:mb-0"
                              fallback=""
                            />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {(action.castingTime || action.range || action.duration) && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {action.castingTime ? (
                    <>
                      <dt className="text-muted-foreground">Casting Time</dt>
                      <dd className="text-foreground">{action.castingTime}</dd>
                    </>
                  ) : null}
                  {action.range ? (
                    <>
                      <dt className="text-muted-foreground">Range</dt>
                      <dd className="text-foreground">{action.range}</dd>
                    </>
                  ) : null}
                  {action.components?.length ? (
                    <>
                      <dt className="text-muted-foreground">Components</dt>
                      <dd className="text-foreground">{action.components.join(", ")}</dd>
                    </>
                  ) : null}
                  {action.duration ? (
                    <>
                      <dt className="text-muted-foreground">Duration</dt>
                      <dd className="text-foreground">
                        {action.duration}
                        {action.concentration ? " (Concentration)" : ""}
                      </dd>
                    </>
                  ) : null}
                </dl>
              )}
              {psionicAugments ? (
                <PsionicAugmentPicker
                  config={psionicAugments}
                  psiLimit={psiLimit}
                  availablePsiPoints={availablePsiPoints}
                  selections={augmentSelections}
                  onChange={setAugmentSelections}
                />
              ) : null}
              <ActionSelectableRiders
                riders={selectableRiders}
                selectedRiderNames={selectedRiderNames}
                onToggle={toggleRider}
              />
              <ActionInfoTalentAlerts alerts={infoTalentAlerts} />
              <RichTextContent
                html={action.description}
                className="text-sm text-foreground/90 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
              />
              {action.equipmentChoices?.map((choice) => {
                const key = actionEquipmentChoiceKey(action, choice.id)
                const listId = `${key}:options`
                return (
                  <label key={key} className="block space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {choice.label}
                    </span>
                    <input
                      key={`${key}:${playerNoteValues[key]?.[0] ?? ""}`}
                      type="text"
                      list={choice.options.length ? listId : undefined}
                      defaultValue={playerNoteValues[key]?.[0] ?? ""}
                      onBlur={(event) => onEquipmentChoiceChange?.(key, event.target.value.trim())}
                      placeholder={
                        choice.allowCustom ? "Choose an item or enter another name…" : "Choose an item…"
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                    {choice.options.length ? (
                      <datalist id={listId}>
                        {choice.options.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    ) : null}
                    <span className="block text-[11px] text-muted-foreground">
                      Change this after completing the relinking rest or ritual described above.
                    </span>
                  </label>
                )
              })}
              {action.playerNotes?.map((note) => {
                const key = actionPlayerNoteKey(action, note.id)
                return (
                  <label key={key} className="block space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {note.prompt}
                    </span>
                    <textarea
                      key={`${key}:${playerNoteValues[key]?.[0] ?? ""}`}
                      defaultValue={playerNoteValues[key]?.[0] ?? ""}
                      onBlur={(event) => onPlayerNoteChange?.(key, event.target.value)}
                      rows={3}
                      placeholder={note.placeholder}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                )
              })}
            </div>
            )}

            {!action.reminderOnly && (!useActionTabs || detailTab !== "description") ? (
            <div className="sticky bottom-0 space-y-2 border-t border-border bg-card/95 p-4 backdrop-blur-sm">
              {useBonusLines.length ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    Bonus
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {useBonusLines.map((line) => (
                      <li key={line} className="text-sm font-semibold text-foreground">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {usage &&
              action.classResourceKey &&
              selectedResourceCost == null &&
              resourceCostMode !== "fixed" ? (
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-foreground">
                  Resource spend
                  <input
                    type="number"
                    min={1}
                    max={Math.min(resourceSpendCap, usage.max - usage.used)}
                    value={resourceSpendAmount}
                    onChange={(event) =>
                      setResourceSpendAmount(
                        Math.max(
                          1,
                          Math.min(
                            resourceSpendCap,
                            usage.max - usage.used,
                            Number(event.target.value),
                          ),
                        ),
                      )
                    }
                    className="h-8 w-20 rounded border border-border bg-background px-2 text-center"
                  />
                </label>
              ) : null}
              {empower && empowerPool ? (
                <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                      Empower with {empowerPool.resourceName ?? empower.resourceKey.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] tabular-nums text-muted-foreground">
                      {empowerPool.max - empowerPool.used} left · normal max {empower.maxSpend} per use
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: empower.maxSpend + 1 }, (_, spend) => (
                      <button
                        key={spend}
                        type="button"
                        disabled={spend > baseEmpowerMax || overloadedChargeActive}
                        onClick={() => {
                          setOverloadedChargeActive(false)
                          setEmpowerSpend(spend)
                        }}
                        className={cn(
                          "min-w-9 rounded-lg border px-2 py-1 text-xs font-semibold tabular-nums transition-colors",
                          spend === empowerApplied
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border hover:border-primary/40",
                          (spend > baseEmpowerMax || overloadedChargeActive) && "opacity-40",
                        )}
                      >
                        {spend}
                      </button>
                    ))}
                  </div>
                  {overloadedChargeKnown ? (
                    <button
                      type="button"
                      disabled={!overloadedChargeAffordable}
                      onClick={() => setOverloadedChargeActive((active) => !active)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                        overloadedChargeActive
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      Overloaded Charge: spend {overloadedChargeCost} for +{overloadedChargeSpend}d
                      {empower.dieSides}
                    </button>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatEmpowerEffect(empower, empowerApplied)}
                  </p>
                </div>
              ) : null}
              {useFeedback ? (
                <p className="rounded-lg bg-primary/10 px-3 py-2 text-center text-xs font-semibold text-primary">
                  {useFeedback}
                </p>
              ) : null}
              {lastSpentHitPoints > 0 &&
              action.refundHitPointsOnStillFailed &&
              onRefundHitPoints ? (
                <button
                  type="button"
                  onClick={() => {
                    onRefundHitPoints(lastSpentHitPoints)
                    setLastSpentHitPoints(0)
                    setUseFeedback("Refunded HP — the test still failed")
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                >
                  Still failed — refund {lastSpentHitPoints} HP
                </button>
              ) : null}
              {usage?.used && action.limitedUses?.restoreByResource && onRestoreUseByResource ? (
                <button
                  type="button"
                  onClick={() => {
                    const feedback = onRestoreUseByResource()
                    setUseFeedback(feedback)
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                >
                  Spend {action.limitedUses.restoreByResource.resourceAmount ?? 1}{" "}
                  {action.limitedUses.restoreByResource.resourceKey.replace(/_/g, " ")} to restore{" "}
                  {action.limitedUses.restoreByResource.restores} use
                </button>
              ) : null}
              {incapacitated ? (
                <p className="text-xs text-destructive">Incapacitated — you cannot use this now.</p>
              ) : !requiredToggleActive ? (
                <p className="text-xs text-muted-foreground">
                  {requiredToggleLabel
                    ? `Requires ${requiredToggleLabel} (use the enabling action first).`
                    : "Requires an active stance."}
                </p>
              ) : chargeExhausted ? (
                <p className="text-xs text-muted-foreground">No uses remaining.</p>
              ) : !canAffordHitDice ? (
                <p className="text-xs text-muted-foreground">
                  Not enough Hit Dice (need {hitDiceNeeded}).
                </p>
              ) : !canAffordPsi ? (
                <p className="text-xs text-muted-foreground">
                  Not enough psi points
                  {psiLimit != null ? ` (limit ${psiLimit})` : ""}.
                </p>
              ) : null}
              {showEconomyPicker ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Use as
                  </p>
                  <div
                    className={cn(
                      "grid gap-2",
                      economyChoices.length >= 3 ? "grid-cols-3" : "grid-cols-2",
                    )}
                  >
                    {economyChoices.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setSelectedEconomyKind(kind)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                          selectedEconomyKind === kind
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        {ACTION_KIND_LABELS[kind]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {menuOptions.length > 0 ? (
                <div className="grid gap-2">
                  {menuOptions.map((option) => (
                    <button
                      key={`use-${option.name}`}
                      type="button"
                      disabled={!optionUseAffordable(option)}
                      onClick={() => handleUse(option.name)}
                      className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Use {option.name}
                      {buttonCostLabel(option)}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canUse}
                  onClick={() => handleUse()}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {action.castSpellChoice && !action.castSpellChoice.spellName
                    ? "Choose a spell"
                    : `Use ${action.name}`}
                  {useActionTabs && specialAttack
                    ? ` — ${attackProfileActionLabel(specialAttack)}`
                    : ""}
                  {buttonCostLabel()}
                </button>
              )}
              {(action.alsoActivate ?? []).map((also) => {
                const alsoHd = alsoActivateHitDiceNeeded(also)
                const canAlso =
                  !incapacitated &&
                  (parentUsedThisOpen || !chargeExhausted) &&
                  (alsoHd <= 0 || (Boolean(onSpendHitDice) && alsoHd <= hitDiceRemaining))
                return (
                  <button
                    key={`also-${also.name}`}
                    type="button"
                    disabled={!canAlso}
                    onClick={() => handleAlsoActivate(also)}
                    className="w-full rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Also use {also.name}
                    {alsoHd > 0 ? ` (${alsoHd} HD)` : ""}
                  </button>
                )
              })}
            </div>
            ) : null}
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

export function SheetActionsPanel({
  actions,
  usedByActionId,
  onUsedChange,
  resolveContext,
  resourceEntries = [],
  usedResourcesById = {},
  onResourceUsedChange,
  incapacitated = false,
  psiLimit = null,
  hitDiceRemaining = 0,
  onSpendHitDice,
  onSpendHitPoints,
  onRefundHitPoints,
  onActivateSheetToggle,
  onSpawnIllusionToken,
  onGrantMutationDie,
  onMarkEconomy,
  characterId = null,
  onApplySelfHeal,
  onSetCurrentHp,
  onApplySelfInspiration,
  onApplySelfConditions,
  onAddDurationReminder,
  onApplyCompanionState,
  perfectedEnhancementBonus = 0,
  empoweredPsionicsBonus = 0,
  onMarkDamageDealt,
  onBankBalanceOfPower,
  allyCandidates = [],
  knownSpells = [],
  onCastSpellChoice,
  healContext = null,
  singleColumn = true,
  playerNoteValues = {},
  onPlayerNoteChange,
  onEquipmentChoiceChange,
  onRestorePactSlots,
  onRestoreSpellSlotsByCombinedLevel,
  onRestoreHitDice,
  onRestoreResourceFromSpellSlot,
  onSpendSpellSlot,
  primedBombUsedThisTurn = false,
  onPrimedBombUsed,
  firstUseNoActionUsedById = {},
  onFirstUseNoActionUsed,
  sections = "all",
  groupLayout = "stack",
  layoutScope = "default",
  prependGroup = null,
}: SheetActionsPanelProps) {
  const rollCtx = useSheetRollContext()
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [openEconomyKind, setOpenEconomyKind] = useState<ActionEconomyKind | null>(null)
  const [groupOrder, setGroupOrder] = useState<string[]>([])
  const [groupColumns, setGroupColumns] = useState<ActionGroupColumnMap>({})
  const [desktopGroupDragEnabled, setDesktopGroupDragEnabled] = useState(false)
  const dragGroupIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!characterId) {
      setGroupOrder([])
      setGroupColumns({})
      return
    }
    setGroupOrder(loadActionGroupOrder(characterId, layoutScope))
    setGroupColumns(loadActionGroupColumns(characterId, layoutScope))
  }, [characterId, layoutScope])

  useEffect(() => {
    if (!characterId || !groupOrder.length) return
    saveActionGroupOrder(characterId, layoutScope, groupOrder)
  }, [characterId, layoutScope, groupOrder])

  useEffect(() => {
    if (!characterId || !Object.keys(groupColumns).length) return
    saveActionGroupColumns(characterId, layoutScope, groupColumns)
  }, [characterId, layoutScope, groupColumns])

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)")
    const update = () => setDesktopGroupDragEnabled(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const resourceById = useMemo(
    () => new Map(resourceEntries.map((entry) => [entry.id, entry])),
    [resourceEntries],
  )

  const sharedUseMaxByKey = useMemo(() => {
    const map = new Map<string, number>()
    for (const action of actions) {
      const share = action.limitedUses?.useShareKey?.trim()
      if (!share) continue
      const max = resolveActionMax(action.limitedUses, action.classLevel, resolveContext)
      if (max == null || max <= 0) continue
      map.set(share, Math.max(map.get(share) ?? 0, max))
    }
    return map
  }, [actions, resolveContext])

  const psiResource = useMemo(() => {
    return (
      resourceEntries.find(
        (row) =>
          row.id.endsWith("_psi_points") ||
          row.id === "psi_points" ||
          /^psi points$/i.test(row.name),
      ) ?? null
    )
  }, [resourceEntries])

  const availablePsiPoints = useMemo(() => {
    if (!psiResource) return 0
    const max = resolveUsesAtLevel(psiResource.uses, psiResource.classLevel, resolveContext) ?? 0
    const used = usedResourcesById[psiResource.id] ?? 0
    return Math.max(0, max - used)
  }, [psiResource, usedResourcesById, resolveContext])

  if (!actions.length && !prependGroup?.node) {
    return null
  }

  /** Resolve any class resource pool as a spendable counter, by key. */
  const resolveResourcePool = (
    resourceKey: string,
    classId?: string | null,
  ): ActionUsage | null => {
    if (!onResourceUsedChange) return null
    // Keyed by class so a multiclass character's same-named pools stay distinct; the unprefixed
    // search is only a fallback for actions that carry no class (e.g. standalone abilities).
    const resource = classId
      ? resourceById.get(`${classId}_${resourceKey}`)
      : resourceEntries.find(
          (entry) => entry.id === resourceKey || entry.id.endsWith(`_${resourceKey}`),
        )
    if (!resource) return null
    const max = resolveUsesAtLevel(resource.uses, resource.classLevel, resolveContext)
    if (max == null || max <= 0) return null
    return {
      max,
      used: usedResourcesById[resource.id] ?? 0,
      resourceName: resource.name,
      resourceId: resource.id,
      setUsed: (next) =>
        onResourceUsedChange({
          ...usedResourcesById,
          [resource.id]: Math.min(max, Math.max(0, next)),
        }),
    }
  }

  /** Resolve the spendable counter backing an action, if any. */
  const usageFor = (action: SheetActionEntry): ActionUsage | null => {
    if (action.classResourceKey && action.classId && onResourceUsedChange) {
      const pool = resolveResourcePool(action.classResourceKey, action.classId)
      if (pool) return pool
    }
    const share = action.limitedUses?.useShareKey?.trim()
    const max =
      share && sharedUseMaxByKey.has(share)
        ? sharedUseMaxByKey.get(share)!
        : resolveActionMax(action.limitedUses, action.classLevel, resolveContext)
    if (max != null && max > 0) {
      const trackingId = resolveActionUsesTrackingKey(action)
      return {
        max,
        used: usedByActionId[trackingId] ?? 0,
        setUsed: (next) =>
          onUsedChange({ ...usedByActionId, [trackingId]: Math.min(max, Math.max(0, next)) }),
      }
    }
    return null
  }

  const spendPsi = (points: number) => {
    if (!psiResource || !onResourceUsedChange || points <= 0) return
    const max = resolveUsesAtLevel(psiResource.uses, psiResource.classLevel, resolveContext) ?? 0
    const used = usedResourcesById[psiResource.id] ?? 0
    onResourceUsedChange({
      ...usedResourcesById,
      [psiResource.id]: Math.min(max, used + points),
    })
  }

  const restoreActionUseByResource = (
    action: SheetActionEntry,
    usage: ActionUsage | null,
  ): string | null => {
    const conversion = action.limitedUses?.restoreByResource
    if (!conversion || !usage || !onResourceUsedChange) return "Restore unavailable"
    const source =
      (action.classId
        ? resourceById.get(`${action.classId}_${conversion.resourceKey}`)
        : null) ??
      resourceEntries.find(
        (entry) =>
          entry.id === conversion.resourceKey ||
          entry.id.endsWith(`_${conversion.resourceKey}`),
      )
    if (!source) return `${conversion.resourceKey.replace(/_/g, " ")} resource not found`
    const sourceMax =
      resolveUsesAtLevel(source.uses, source.classLevel, resolveContext) ?? 0
    const sourceUsed = usedResourcesById[source.id] ?? 0
    const sourceAmount = Math.max(1, conversion.resourceAmount ?? 1)
    const result = applyResourceToResourceRestore({
      sourceUsed,
      sourceMax,
      sourceAmount,
      targetUsed: usage.used,
      targetMax: usage.max,
      restores: conversion.restores,
    })
    if (!result.applied) {
      return usage.used <= 0 ? "No spent uses to restore" : "Not enough resource remaining"
    }

    onResourceUsedChange({
      ...usedResourcesById,
      [source.id]: result.nextSourceUsed,
    })
    usage.setUsed(result.nextTargetUsed)
    return `Restored ${Math.min(usage.used, Math.max(1, conversion.restores))} use`
  }

  // Only the split combat layout has a weapon column to move extra-attack grants into.
  const splitWeaponAttacks = sections === "economy" || sections === "weapon-attacks"
  const grouped: Record<ActionEconomyKind, SheetActionEntry[]> = {
    action: [],
    bonus: [],
    reaction: [],
  }
  // Triggered entries cost no action economy, so they get their own bucket rather than being
  // filed under Action / Bonus Action / Reaction.
  const triggeredEntries: SheetActionEntry[] = []
  const weaponAttackEntries: SheetActionEntry[] = []
  for (const entry of actions) {
    if (entry.trigger) {
      if (!triggeredEntries.some((existing) => existing.id === entry.id)) {
        triggeredEntries.push(entry)
      }
      continue
    }
    if (splitWeaponAttacks && grantsExtraWeaponAttack(entry)) {
      if (!weaponAttackEntries.some((existing) => existing.id === entry.id)) {
        weaponAttackEntries.push(entry)
      }
      continue
    }
    for (const kind of entry.kinds) {
      if (!grouped[kind].some((existing) => existing.id === entry.id)) {
        grouped[kind].push(entry)
      }
    }
  }

  const openAction = openActionId
    ? actions.find((entry) => entry.id === openActionId) ?? null
    : null

  const renderEntryCard = (entry: SheetActionEntry, keyPrefix: string) => {
    const usage = usageFor(entry)
    const usesClassResource = Boolean(entry.classResourceKey)
    const interactive = !incapacitated
    const attackProfiles = entry.specialAttacks?.length
      ? entry.specialAttacks
      : entry.specialAttack
        ? [entry.specialAttack]
        : []
    const primaryAttack = attackProfiles[0] ?? null
    const isSpecialAttack = Boolean(
      primaryAttack &&
        (primaryAttack.damageDiceCount > 0 ||
          primaryAttack.attackProfile ||
          primaryAttack.saveAbility),
    )
    const proficiencyBonus = resolveContext.proficiencyBonus ?? 0
    const attackMod = primaryAttack
      ? specialAttackModifier(primaryAttack, resolveContext)
      : 0
    const saveProfile =
      attackProfiles.find((profile) => profile.saveAbility?.trim()) ??
      (primaryAttack?.attackProfile === "force_save" || primaryAttack?.attackProfile === "emanation"
        ? primaryAttack
        : null)
    const saveMod = saveProfile ? specialAttackSaveModifier(saveProfile, resolveContext) : 0
    const isAttackRoll = attackProfiles.some(
      (profile) => profile.attackProfile === "melee" || profile.attackProfile === "ranged",
    )
    const saveAbility = saveProfile?.saveAbility?.trim() || null
    const saveDc = saveProfile
      ? (saveProfile.saveDCBase ?? 8) + proficiencyBonus + saveMod
      : 0
    const damageLabel = primaryAttack
      ? specialAttackDamageLabel(primaryAttack, resolveContext)
      : null
    const rangeLabel = primaryAttack ? specialAttackRangeLabel(primaryAttack) : null
    const extraModeLabels = attackProfiles
      .slice(1)
      .map((profile) =>
        profile.attackVariant
          ? profile.attackVariant.replace(/^\w/, (ch) => ch.toUpperCase())
          : specialAttackProfileLabel(profile),
      )
      .filter((label): label is string => Boolean(label))
    const hdHealLabel = hitDiceHealLabel(entry)
    const useBonusPreview = formatSheetActionUseBonusLines(entry.useBonuses, {
      proficiencyBonus: resolveContext.proficiencyBonus,
      abilityMods: resolveContext.abilityModifiers,
      characterLevel: entry.classLevel,
      classResourceDieSides: rollCtx.featureEffectContext?.classResourceDieSides,
    }).join(" · ")
    const costMeta = formatSheetActionCostMeta(entry, usage)
    const subtitleMeta = [
      entry.trigger,
      costMeta,
      isSpecialAttack ? specialAttackProfileLabel(primaryAttack!) : null,
      hdHealLabel,
      !isSpecialAttack && !hdHealLabel && entry.menuOptions?.length
        ? `${entry.menuOptions.length} options`
        : null,
    ]
      .filter(Boolean)
      .join(" · ")
    const showOwnUses = Boolean(usage && !usesClassResource)

    return (
      <div
        key={`${keyPrefix}-${entry.id}`}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={
          interactive
            ? () => {
                setOpenEconomyKind(
                  keyPrefix === "action" || keyPrefix === "bonus" || keyPrefix === "reaction"
                    ? keyPrefix
                    : null,
                )
                setOpenActionId(entry.id)
              }
            : undefined
        }
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setOpenEconomyKind(
                    keyPrefix === "action" || keyPrefix === "bonus" || keyPrefix === "reaction"
                      ? keyPrefix
                      : null,
                  )
                  setOpenActionId(entry.id)
                }
              }
            : undefined
        }
        className={cn(
          "relative flex min-w-0 flex-col gap-1 rounded border px-2.5 py-1.5",
          usesClassResource ? SHEET_ACTION_CARD.classResource : SHEET_ACTION_CARD.default,
          interactive &&
            (usesClassResource
              ? cn("cursor-pointer transition-colors", SHEET_ACTION_CARD.classResourceHover)
              : cn("cursor-pointer transition-colors", SHEET_ACTION_CARD.defaultHover)),
          incapacitated ? "opacity-50" : "",
        )}
      >
        <div className="flex items-stretch justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-1.5">
              {entry.icon ? (
                <span
                  className="rounded text-primary"
                  title={
                    entry.relatedTalentAlerts?.length
                      ? entry.relatedTalentAlerts
                          .map((alert) => `${alert.name}: ${alert.summary}`)
                          .join(" · ")
                      : undefined
                  }
                >
                  <GameIcon name={entry.icon} className="h-5 w-5 shrink-0" />
                </span>
              ) : entry.relatedTalentAlerts?.length ? (
                <span
                  className="rounded text-amber-600 dark:text-amber-400"
                  title={entry.relatedTalentAlerts
                    .map((alert) => `${alert.name}: ${alert.summary}`)
                    .join(" · ")}
                >
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                </span>
              ) : null}
              <p className="text-xs font-semibold text-foreground">{entry.name}</p>
            </div>

            {subtitleMeta || showOwnUses ? (
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 text-[10px] leading-snug text-muted-foreground">
                  {[
                    subtitleMeta,
                    usage && showOwnUses ? `${usage.max - usage.used} / ${usage.max}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {usage && showOwnUses ? (
                  <UseDots usage={usage} label={entry.name} tone="default" />
                ) : null}
              </div>
            ) : null}
            {useBonusPreview ? (
              <p className="text-[10px] font-semibold text-primary">{useBonusPreview}</p>
            ) : null}

            {isSpecialAttack ? (
              <>
                {damageLabel || rangeLabel ? (
                  <p className="text-[10px] text-foreground">
                    {damageLabel ? <span className="font-medium">{damageLabel}</span> : null}
                    {rangeLabel ? (
                      <span className="text-muted-foreground">
                        {damageLabel ? <span className="mx-1">·</span> : null}
                        {rangeLabel}
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {primaryAttack!.properties.length > 0 || extraModeLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {primaryAttack!.properties.map((property) => (
                      <span
                        key={property}
                        className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                      >
                        {property}
                      </span>
                    ))}
                    {extraModeLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="flex w-[5.5rem] shrink-0 flex-col items-stretch gap-1 self-start">
            {isSpecialAttack && isAttackRoll ? (
              <ActionStatTile
                caption="To Hit"
                value={formatSignedModifier(attackMod + proficiencyBonus)}
              />
            ) : null}
            {isSpecialAttack && saveAbility ? (
              <ActionStatTile caption={`${saveAbility} DC`} value={String(saveDc)} />
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  const gridClass = cn(
    "grid gap-2",
    singleColumn ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  )

  const showEconomy = sections === "all" || sections === "economy"
  const showTriggered =
    sections === "all" || sections === "triggered" || sections === "weapon-attacks"
  const showWeaponAttacks = sections === "weapon-attacks"
  const hasEconomyEntries =
    showEconomy &&
    (Object.keys(grouped) as ActionEconomyKind[]).some((kind) => grouped[kind].length > 0)
  const hasTriggeredEntries = showTriggered && triggeredEntries.length > 0
  const hasWeaponAttackEntries = showWeaponAttacks && weaponAttackEntries.length > 0
  const hasPrependGroup = Boolean(prependGroup?.node)
  if (
    !hasEconomyEntries &&
    !hasTriggeredEntries &&
    !hasWeaponAttackEntries &&
    !hasPrependGroup &&
    !(incapacitated && showEconomy)
  ) {
    return null
  }

  type RenderableActionGroup = {
    id: ActionGroupId
    label: string
    body: ReactNode
  }

  const actionGroups: RenderableActionGroup[] = []
  if (prependGroup?.node) {
    actionGroups.push({
      id: prependGroup.id,
      label: "Weapon Attacks",
      body: prependGroup.node,
    })
  }
  if (showEconomy) {
    for (const kind of Object.keys(grouped) as ActionEconomyKind[]) {
      const entries = grouped[kind]
      if (!entries.length) continue
      actionGroups.push({
        id: kind,
        label: ACTION_KIND_LABELS[kind],
        body: <div className={gridClass}>{entries.map((entry) => renderEntryCard(entry, kind))}</div>,
      })
    }
  }
  if (hasWeaponAttackEntries) {
    actionGroups.push({
      id: "weapon-attack",
      label: "Extra Attacks",
      body: (
        <div className={gridClass}>
          {weaponAttackEntries.map((entry) => renderEntryCard(entry, "weapon-attack"))}
        </div>
      ),
    })
  }
  if (hasTriggeredEntries) {
    actionGroups.push({
      id: "triggered",
      label: "Passive",
      body: (
        <div className={gridClass}>
          {triggeredEntries.map((entry) => renderEntryCard(entry, "triggered"))}
        </div>
      ),
    })
  }

  const visibleGroups = orderActionGroups(
    actionGroups,
    groupOrder,
    (group) => group.id,
    DEFAULT_COMBAT_ACTION_GROUP_ORDER,
  )
  const visibleGroupIds = visibleGroups.map((group) => group.id)

  const columnForGroup = (id: string): 0 | 1 =>
    groupColumns[id] ?? defaultActionGroupColumn(id)
  const groupsByColumn = [
    visibleGroups.filter((group) => columnForGroup(group.id) === 0),
    visibleGroups.filter((group) => columnForGroup(group.id) === 1),
  ] as const
  const canDragGroups = groupLayout === "responsive-grid" && desktopGroupDragEnabled

  const dropGroup = (column: 0 | 1, targetId?: string) => {
    const fromId = dragGroupIdRef.current
    dragGroupIdRef.current = null
    if (!fromId) return
    setGroupColumns((previous) => ({ ...previous, [fromId]: column }))
    if (targetId && fromId !== targetId) {
      setGroupOrder(moveActionGroup(visibleGroupIds, groupOrder, fromId, targetId))
    }
  }

  return (
    <div className="space-y-3">
      {incapacitated && showEconomy ? (
        <p className="text-xs text-destructive font-medium">
          Incapacitated — you cannot take actions, bonus actions, or reactions.
        </p>
      ) : null}
      <div className={groupLayout === "responsive-grid" ? "space-y-3 xl:hidden" : "space-y-3"}>
        {visibleGroups.map((group) => (
          <div key={group.id} className="min-w-0">
            <div className="mb-1.5 flex items-center gap-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
            </div>
            {group.body}
          </div>
        ))}
      </div>
      {groupLayout === "responsive-grid" ? (
        <div className="hidden min-w-0 grid-cols-2 items-start gap-3 xl:grid">
          {groupsByColumn.map((groups, columnIndex) => {
            const column = columnIndex as 0 | 1
            return (
              <div
                key={column}
                className="min-h-16 min-w-0 space-y-3 rounded-lg transition-colors"
                onDragOver={(event) => {
                  if (canDragGroups) event.preventDefault()
                }}
                onDrop={(event) => {
                  if (!canDragGroups) return
                  event.preventDefault()
                  dropGroup(column)
                }}
              >
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="min-w-0"
                    onDragOver={(event) => {
                      if (canDragGroups) event.preventDefault()
                    }}
                    onDrop={(event) => {
                      if (!canDragGroups) return
                      event.preventDefault()
                      event.stopPropagation()
                      dropGroup(column, group.id)
                    }}
                  >
                    <div
                      className={cn(
                        "mb-1.5 flex items-center gap-1",
                        canDragGroups && "cursor-grab active:cursor-grabbing",
                      )}
                      draggable={canDragGroups}
                      onDragStart={(event) => {
                        if (!canDragGroups) {
                          event.preventDefault()
                          return
                        }
                        dragGroupIdRef.current = group.id
                        event.dataTransfer.effectAllowed = "move"
                        event.dataTransfer.setData("text/plain", group.id)
                      }}
                    >
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                    </div>
                    {group.body}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ) : null}

      <AnimatePresence>
        {openAction ? (
          <ActionDetailOverlay
            key="action-detail"
            action={openAction}
            usage={usageFor(openAction)}
            psiLimit={psiLimit}
            availablePsiPoints={availablePsiPoints}
            psiResourceId={psiResource?.id ?? null}
            onSpendPsi={spendPsi}
            hitDiceRemaining={hitDiceRemaining}
            onSpendHitDice={onSpendHitDice}
            onSpendHitPoints={onSpendHitPoints}
            onRefundHitPoints={onRefundHitPoints}
            onActivateSheetToggle={onActivateSheetToggle}
            onSpawnIllusionToken={onSpawnIllusionToken}
            onGrantMutationDie={onGrantMutationDie}
            onMarkEconomy={onMarkEconomy}
            incapacitated={incapacitated}
            resolveContext={resolveContext}
            onClose={() => {
              setOpenActionId(null)
              setOpenEconomyKind(null)
            }}
            initialEconomyKind={openEconomyKind}
            characterId={characterId}
            onApplySelfHeal={onApplySelfHeal}
            onSetCurrentHp={onSetCurrentHp}
            onApplySelfInspiration={onApplySelfInspiration}
            onApplySelfConditions={onApplySelfConditions}
            onAddDurationReminder={onAddDurationReminder}
            onApplyCompanionState={onApplyCompanionState}
            perfectedEnhancementBonus={perfectedEnhancementBonus}
            empoweredPsionicsBonus={empoweredPsionicsBonus}
            onMarkDamageDealt={onMarkDamageDealt}
            onBankBalanceOfPower={onBankBalanceOfPower}
            onRestoreUseByResource={() =>
              restoreActionUseByResource(openAction, usageFor(openAction))
            }
            resolveResourcePool={resolveResourcePool}
            allyCandidates={allyCandidates}
            knownSpells={knownSpells}
            onCastSpellChoice={onCastSpellChoice}
            healContext={healContext}
            playerNoteValues={playerNoteValues}
            onPlayerNoteChange={onPlayerNoteChange}
            onEquipmentChoiceChange={onEquipmentChoiceChange}
            onRestorePactSlots={onRestorePactSlots}
            onRestoreSpellSlotsByCombinedLevel={onRestoreSpellSlotsByCombinedLevel}
            onRestoreHitDice={onRestoreHitDice}
            onRestoreResourceFromSpellSlot={onRestoreResourceFromSpellSlot}
            onSpendSpellSlot={onSpendSpellSlot}
            primedBombUsedThisTurn={primedBombUsedThisTurn}
            onPrimedBombUsed={onPrimedBombUsed}
            firstUseNoActionUsedById={firstUseNoActionUsedById}
            onFirstUseNoActionUsed={onFirstUseNoActionUsed}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

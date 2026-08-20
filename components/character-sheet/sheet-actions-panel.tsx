"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, Dices, X } from "lucide-react"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import {
  PsionicAugmentPicker,
  resolveAbilityPsionicAugments,
} from "@/components/character-sheet/psionic-augment-picker"
import { d20CriticalSuffix } from "@/components/character-sheet/d20-roll-button"
import { useSheetRollContext } from "@/components/character-sheet/sheet-roll-context"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import {
  ACTION_KIND_LABELS,
  type ActionEconomyKind,
  type SheetActionEntry,
} from "@/lib/character/sheet-actions"
import { guardianTacticsToggleIdForOption, sheetToggleIdActivatedByAction } from "@/lib/compendium/sheet-toggle-registry"
import { weaponMorphToggleIdForOption } from "@/lib/character/weapon-morph"
import type { IllusionTokenKind } from "@/lib/character/illusion-tokens"
import {
  SHEET_ACTION_CARD,
  SHEET_ACTION_USAGE_DOT,
} from "@/lib/character/sheet-status-colors"
import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import { cn } from "@/lib/utils"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import { resolveActionUsesTrackingKey } from "@/lib/character/action-uses-key"
import type { CharacterCompanionState } from "@/lib/character/companion-stat-block"
import {
  collectTargetableEffects,
  type PartyEffectTarget,
} from "@/lib/character/effect-target-policy"
import { applyAllyEffectLocally } from "@/lib/character/apply-ally-effect"
import { applyPartyHealEffect } from "@/lib/character/apply-party-heal"
import { applyResourceToResourceRestore } from "@/lib/character/resource-conversion"
import {
  formatEmpowerEffect,
  resolveSpecialAttackEmpower,
} from "@/lib/character/special-attack-empower"
import { defaultSheetPlayState } from "@/lib/character/sheet-play-state"
import {
  resolveFeatureEffectHealAmount,
  type HealResolveContext,
} from "@/lib/character/resolve-feature-effect-heal"
import type { PartyAllyCandidate } from "@/lib/character/party-ally-candidates"
import type { FeatureEffect, UsesConfig } from "@/lib/types"
import {
  formatPsionicAugmentSelectionSummary,
  totalPsionicAugmentCost,
  type PsionicAugmentSelection,
} from "@/lib/compendium/parse-psionic-augments"
import type { SpecialAttackCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { rollD20WithMode } from "@/lib/dice/d20-roll"
import { formatDamageRollResult, rollDamageWithMode } from "@/lib/dice/damage-roll"
import { resolveRollMode } from "@/lib/character/resolve-roll-mode"

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
  /** Activate a sheet toggle when a menu option is used (e.g. Guardian Tactics Block). */
  onActivateSheetToggle?: (toggleId: string) => void
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
  healContext?: HealResolveContext | null
  /** Force a single card column (e.g. narrow combat right rail). */
  singleColumn?: boolean
  playerNoteValues?: Record<string, string[]>
  onPlayerNoteChange?: (key: string, value: string) => void
  onEquipmentChoiceChange?: (key: string, value: string) => void
}

function actionPlayerNoteKey(action: SheetActionEntry, noteId: string): string {
  return `player-note:${action.id}:${noteId}`
}

function actionEquipmentChoiceKey(action: SheetActionEntry, choiceId: string): string {
  return `player-equipment:${action.id}:${choiceId}`
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
  proficiencyBonus,
  damageModifier,
  damageModifierNote = null,
  bonusDice = null,
  psiSpent,
  hitDiceSpent,
  augmentSummary,
  onClose,
}: {
  action: SheetActionEntry
  specialAttack: SpecialAttackCharacteristic
  attackMod: number
  proficiencyBonus: number
  damageModifier: number
  damageModifierNote?: string | null
  /** Extra damage dice bought with a resource (e.g. Prime Bomb Reagents). */
  bonusDice?: { count: number; sides: number; label: string } | null
  psiSpent: number
  hitDiceSpent: number
  augmentSummary: string | null
  onClose: () => void
}) {
  const history = useSheetRollHistory()
  const rollCtx = useSheetRollContext()
  const [attackSummary, setAttackSummary] = useState<string | null>(null)
  const [damageSummary, setDamageSummary] = useState<string | null>(null)

  const isAttackRoll =
    specialAttack.attackProfile === "melee" || specialAttack.attackProfile === "ranged"
  const saveAbility = specialAttack.saveAbility?.trim() || null
  const saveDc =
    specialAttack.saveDCBase != null
      ? specialAttack.saveDCBase
      : 8 + proficiencyBonus + attackMod

  const sides =
    action.hitDieSides != null && action.hitDieSides > 0
      ? action.hitDieSides
      : dieSides(specialAttack.damageDieType)
  const extraDice = bonusDice && bonusDice.count > 0 ? bonusDice : null
  const damageExpression = `${specialAttack.damageDiceCount}d${sides}${
    extraDice ? ` + ${extraDice.count}d${extraDice.sides}` : ""
  }${damageModifier ? ` ${damageModifier >= 0 ? "+" : ""}${damageModifier}` : ""}${
    specialAttack.damageTypes[0] ? ` ${specialAttack.damageTypes[0]}` : ""
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
    const modeSuffix =
      rolled.mode === "advantage" ? " (adv)" : rolled.mode === "disadvantage" ? " (dis)" : ""
    const summary = `${rolled.natural} + ${attackMod + proficiencyBonus} = ${rolled.total}${modeSuffix}${d20CriticalSuffix(rolled.natural)}`
    setAttackSummary(summary)
    history?.logRoll({
      kind: "d20",
      label: `${action.name} attack`,
      summary,
      natural: rolled.natural,
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
      },
      "normal",
    )
    const damageType = specialAttack.damageTypes[0]
    const summary = `${formatDamageRollResult(result.rolls, result.modifier, result.total)}${
      damageType ? ` ${damageType}` : ""
    }`
    setDamageSummary(summary)
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
        {augmentSummary ? (
          <p className="text-xs text-muted-foreground">{augmentSummary}</p>
        ) : null}
        {extraDice ? (
          <p className="text-xs font-semibold text-primary">{extraDice.label}</p>
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
          {damageModifierNote ? (
            <p className="text-[11px] font-medium text-primary">{damageModifierNote}</p>
          ) : null}
          <p className="text-lg font-black tabular-nums text-foreground">
            {damageSummary ?? "—"}
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
  onActivateSheetToggle,
  onSpawnIllusionToken,
  onGrantMutationDie,
  onMarkEconomy,
  incapacitated,
  resolveContext,
  onClose,
  characterId,
  onApplySelfHeal,
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
}: {
  action: SheetActionEntry
  usage: ActionUsage | null
  psiLimit?: number | null
  availablePsiPoints: number
  psiResourceId: string | null
  onSpendPsi: (points: number) => void
  hitDiceRemaining: number
  onSpendHitDice?: (amount: number, preferClassId?: string | null) => boolean
  /** Activate a sheet toggle when a menu option is used (e.g. Guardian Tactics Block). */
  onActivateSheetToggle?: (toggleId: string) => void
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
}) {
  const [augmentSelections, setAugmentSelections] = useState<PsionicAugmentSelection[]>([])
  const [step, setStep] = useState<"detail" | "roll" | "target">("detail")
  const [useFeedback, setUseFeedback] = useState<string | null>(null)
  const [resourceSpendAmount, setResourceSpendAmount] = useState(1)
  const [empowerSpend, setEmpowerSpend] = useState(0)
  const [pendingHealEffects, setPendingHealEffects] = useState<FeatureEffect[]>([])
  const [applyingHeal, setApplyingHeal] = useState(false)
  const menuOptions = (action.menuOptions ?? []).filter(
    (option) => option.unlocksAtLevel == null || option.unlocksAtLevel <= action.classLevel,
  )
  const [selectedMenuOption, setSelectedMenuOption] = useState<string | null>(
    menuOptions[0]?.name ?? null,
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

  const specialAttack = action.specialAttack ?? null
  const psiCost = psionicAugments
    ? totalPsionicAugmentCost(psionicAugments, augmentSelections)
    : 0
  const augmentSummary =
    psionicAugments && augmentSelections.length
      ? formatPsionicAugmentSelectionSummary(psionicAugments, augmentSelections)
      : null

  const selectedOption = menuOptions.find((option) => option.name === selectedMenuOption)
  const hitDiceCost =
    selectedOption?.hitDiceCost ??
    action.spendHitDice ??
    (menuOptions.length === 0 ? null : menuOptions[0]?.hitDiceCost ?? null)
  const hitDiceNeeded = hitDiceCost != null && hitDiceCost > 0 ? hitDiceCost : 0

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
  const resourceSpend =
    resourceCostMode === "fixed"
      ? configuredResourceCost
      : Math.max(1, Math.min(resourceSpendAmount, resourceSpendCap))
  const chargeExhausted = usage != null && usage.max - usage.used < resourceSpend

  const empower = resolveSpecialAttackEmpower(specialAttack, action.classLevel)
  // The rider spends its own pool (Reagents, for a Bomb), which is usually not the pool the action
  // itself draws on, so it is resolved separately from `usage`.
  const empowerPool = empower
    ? (resolveResourcePool?.(empower.resourceKey, action.classId) ?? null)
    : null
  const empowerMax = Math.min(
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
  const empowerApplied = Math.max(0, Math.min(empowerSpend, empowerMax))

  const canAffordPsi = psiCost <= availablePsiPoints && (psiLimit == null || psiCost <= psiLimit)
  const canAffordHitDice = hitDiceNeeded <= 0 || hitDiceNeeded <= hitDiceRemaining
  const canUse =
    !incapacitated &&
    !chargeExhausted &&
    canAffordPsi &&
    canAffordHitDice &&
    (psiCost === 0 || Boolean(psiResourceId)) &&
    (hitDiceNeeded === 0 || Boolean(onSpendHitDice)) &&
    (menuOptions.length === 0 || Boolean(selectedMenuOption))

  useEffect(() => {
    setAugmentSelections([])
    setStep("detail")
    setUseFeedback(null)
    setResourceSpendAmount(1)
    setEmpowerSpend(0)
    setSelectedMenuOption(menuOptions[0]?.name ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when the opened action changes
  }, [action.id])

  const handleUse = () => {
    if (!canUse) return

    if (hitDiceNeeded > 0 && onSpendHitDice) {
      const ok = onSpendHitDice(hitDiceNeeded, action.classId)
      if (!ok) {
        setUseFeedback("Not enough Hit Dice")
        return
      }
    }

    const spendViaAugments = psiCost > 0
    const sharesEmpowerPool =
      empowerPool != null && usage != null && empowerPool.resourceId === usage.resourceId
    if (usage && !spendViaAugments) {
      usage.setUsed(usage.used + resourceSpend + (sharesEmpowerPool ? empowerApplied : 0))
    }
    if (empowerPool && empowerApplied > 0 && !sharesEmpowerPool) {
      empowerPool.setUsed(empowerPool.used + empowerApplied)
    }
    if (spendViaAugments) {
      onSpendPsi(psiCost)
    }

    const parts: string[] = []
    if (empower && empowerApplied > 0) {
      parts.push(
        `Spent ${empowerApplied} ${empowerPool?.resourceName ?? empower.resourceKey.replace(/_/g, " ")} · ${formatEmpowerEffect(empower, empowerApplied)}`,
      )
    }
    if (selectedOption) {
      parts.push(selectedOption.name)
    }

    const morphToggleId = selectedOption
      ? weaponMorphToggleIdForOption(selectedOption.name)
      : null
    const toggleId =
      morphToggleId ??
      (selectedOption ? guardianTacticsToggleIdForOption(selectedOption.name) : null) ??
      sheetToggleIdActivatedByAction(action)
    if (toggleId && onActivateSheetToggle) {
      onActivateSheetToggle(toggleId)
      parts.push(toggleId === "__end_weapon_morph__" ? "Morph ended" : "Toggle on")
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

    if (action.spendsEconomy !== false && onMarkEconomy) {
      for (const kind of action.kinds) {
        onMarkEconomy(kind)
      }
    }
    if ((specialAttack?.damageDiceCount ?? 0) > 0 && onMarkDamageDealt) {
      onMarkDamageDealt()
    }
    if (hitDiceNeeded > 0) parts.push(`Spent ${hitDiceNeeded} Hit Dice`)
    if (psiCost > 0) parts.push(`Spent ${psiCost} psi`)
    if (augmentSummary) parts.push(augmentSummary)
    if (usage && !spendViaAugments) parts.push("Marked one use")

    const targetable = collectTargetableEffects(action.healEffects)
    const needsAllyPick = targetable.some((entry) => entry.policy === "choose_ally")
    if (needsAllyPick && healContext) {
      setPendingHealEffects(targetable.map((entry) => entry.effect))
      setUseFeedback(parts.join(" · ") || null)
      setStep("target")
      return
    }

    if (targetable.length && healContext && characterId && onApplySelfHeal) {
      const healParts = [...parts]
      const isPsionicPower = action.abilityRole === "psionic_power"
      let banked = 0
      for (const { effect } of targetable) {
        let amount = resolveFeatureEffectHealAmount(effect, healContext)
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
        healParts.push(kind === "temp_hp" ? `+${amount} temp HP` : `Healed ${amount} HP`)
      }
      if (banked > 0 && onBankBalanceOfPower) onBankBalanceOfPower(banked)
      setUseFeedback(healParts.join(" · ") || "Used!")
      if (specialAttack && (specialAttack.damageDiceCount > 0 || specialAttack.attackProfile)) {
        setStep("roll")
        return
      }
      return
    }

    if (specialAttack && (specialAttack.damageDiceCount > 0 || specialAttack.attackProfile)) {
      setStep("roll")
      return
    }

    setUseFeedback(parts.join(" · ") || "Used!")
  }

  const handlePickTarget = async (target: PartyEffectTarget) => {
    if (!healContext || !pendingHealEffects.length) return
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
            healContext,
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
          healContext,
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
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-2 border-border rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 p-4 border-b border-border bg-card/95 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-black text-foreground">{action.name}</h2>
            <p className="text-xs text-muted-foreground">
              {action.sourceLabel}
              {" · "}
              {action.kinds.map((kind) => ACTION_KIND_LABELS[kind]).join(", ")}
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

        {step === "roll" && specialAttack ? (
          <ActionRollStep
            action={action}
            specialAttack={specialAttack}
            attackMod={attackModifierFromContext(resolveContext)}
            proficiencyBonus={resolveContext.proficiencyBonus ?? 0}
            damageModifier={vengeanceDamageMod + empoweredPsionicsDamageMod}
            damageModifierNote={
              empoweredPsionicsDamageMod > 0
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
            psiSpent={psiCost}
            hitDiceSpent={hitDiceNeeded}
            augmentSummary={augmentSummary}
            onClose={onClose}
          />
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
                      <div className="font-semibold">{candidate.label}</div>
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
            <div className="p-4 space-y-3">
              {usage ? (
                <p className="text-xs font-semibold text-foreground">
                  {usage.resourceName ? `${usage.resourceName}: ` : "Uses: "}
                  <span className="tabular-nums">
                    {usage.max - usage.used} / {usage.max} remaining
                  </span>
                </p>
              ) : null}
              {hitDiceNeeded > 0 || menuOptions.length > 0 ? (
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
              {action.relatedTalentAlerts?.length ? (
                <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    Related talents
                  </p>
                  {action.relatedTalentAlerts.map((alert) => (
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

            <div className="sticky bottom-0 space-y-2 border-t border-border bg-card/95 p-4 backdrop-blur-sm">
              {usage && action.classResourceKey && resourceCostMode !== "fixed" ? (
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
                      {empowerPool.max - empowerPool.used} left · max {empower.maxSpend} per use
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: empower.maxSpend + 1 }, (_, spend) => (
                      <button
                        key={spend}
                        type="button"
                        disabled={spend > empowerMax}
                        onClick={() => setEmpowerSpend(spend)}
                        className={cn(
                          "min-w-9 rounded-lg border px-2 py-1 text-xs font-semibold tabular-nums transition-colors",
                          spend === empowerApplied
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border hover:border-primary/40",
                          spend > empowerMax && "opacity-40",
                        )}
                      >
                        {spend}
                      </button>
                    ))}
                  </div>
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
              <button
                type="button"
                disabled={!canUse}
                onClick={handleUse}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Use {action.name}
                {usage && action.classResourceKey ? ` (${resourceSpend} ${usage.resourceName ?? "resource"})` : ""}
                {empower && empowerApplied > 0
                  ? ` (+${empowerApplied} ${empowerPool?.resourceName ?? "resource"})`
                  : ""}
                {hitDiceNeeded > 0 ? ` (${hitDiceNeeded} HD)` : ""}
                {psiCost > 0 ? ` (${psiCost} psi)` : ""}
              </button>
            </div>
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
  onActivateSheetToggle,
  onSpawnIllusionToken,
  onGrantMutationDie,
  onMarkEconomy,
  characterId = null,
  onApplySelfHeal,
  onApplySelfInspiration,
  onApplySelfConditions,
  onAddDurationReminder,
  onApplyCompanionState,
  perfectedEnhancementBonus = 0,
  empoweredPsionicsBonus = 0,
  onMarkDamageDealt,
  onBankBalanceOfPower,
  allyCandidates = [],
  healContext = null,
  singleColumn = false,
  playerNoteValues = {},
  onPlayerNoteChange,
  onEquipmentChoiceChange,
}: SheetActionsPanelProps) {
  const [openActionId, setOpenActionId] = useState<string | null>(null)

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

  if (!actions.length) {
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

  const grouped: Record<ActionEconomyKind, SheetActionEntry[]> = {
    action: [],
    bonus: [],
    reaction: [],
  }
  for (const entry of actions) {
    for (const kind of entry.kinds) {
      if (!grouped[kind].some((existing) => existing.id === entry.id)) {
        grouped[kind].push(entry)
      }
    }
  }

  const openAction = openActionId
    ? actions.find((entry) => entry.id === openActionId) ?? null
    : null

  return (
    <div className="space-y-3">
      {incapacitated ? (
        <p className="text-xs text-destructive font-medium">
          Incapacitated — you cannot take actions, bonus actions, or reactions.
        </p>
      ) : null}
      {(Object.keys(grouped) as ActionEconomyKind[]).map((kind) => {
        const entries = grouped[kind]
        if (!entries.length) return null
        return (
          <div key={kind}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
              {ACTION_KIND_LABELS[kind]}
            </p>
            <div
              className={cn(
                "grid gap-2",
                singleColumn ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {entries.map((entry) => {
                const usage = usageFor(entry)
                const usesClassResource = Boolean(entry.classResourceKey)
                const interactive = !incapacitated
                return (
                  <div
                    key={`${kind}-${entry.id}`}
                    role={interactive ? "button" : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    onClick={interactive ? () => setOpenActionId(entry.id) : undefined}
                    onKeyDown={
                      interactive
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              setOpenActionId(entry.id)
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "relative flex flex-col gap-2 rounded border px-2 py-1.5",
                      usesClassResource
                        ? SHEET_ACTION_CARD.classResource
                        : SHEET_ACTION_CARD.default,
                      interactive &&
                        (usesClassResource
                          ? cn("cursor-pointer transition-colors", SHEET_ACTION_CARD.classResourceHover)
                          : cn("cursor-pointer transition-colors", SHEET_ACTION_CARD.defaultHover)),
                      incapacitated ? "opacity-50" : "",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{entry.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {entry.sourceLabel}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {entry.relatedTalentAlerts?.length ? (
                          <span
                            className="rounded p-0.5 text-amber-600 dark:text-amber-400"
                            title={entry.relatedTalentAlerts
                              .map((alert) => `${alert.name}: ${alert.summary}`)
                              .join(" · ")}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {usage && usesClassResource ? (
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        Costs{" "}
                        {entry.limitedUses?.classResourceCostMode === "up_to_proficiency_bonus"
                          ? `up to ${(entry.limitedUses.classResourceAmount ?? 1) > 1 ? `${entry.limitedUses.classResourceAmount} × ` : ""}PB`
                          : entry.limitedUses?.classResourceCostMode ===
                              "up_to_ability_modifier"
                            ? `up to ${(entry.limitedUses.classResourceAmount ?? 1) > 1 ? `${entry.limitedUses.classResourceAmount} × ` : ""}${entry.limitedUses.classResourceCostAbility ?? "ability"} mod`
                            : entry.limitedUses?.classResourceAmount ?? 1}
                        {usage.resourceName ? ` ${usage.resourceName}` : ""}
                      </span>
                    ) : usage ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {usage.max - usage.used} / {usage.max}
                          {usage.resourceName ? (
                            <span className="ml-1 text-muted-foreground/70">
                              {usage.resourceName}
                            </span>
                          ) : null}
                        </span>
                        <UseDots
                          usage={usage}
                          label={entry.name}
                          tone={usesClassResource ? "classResource" : "default"}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

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
            onActivateSheetToggle={onActivateSheetToggle}
            onSpawnIllusionToken={onSpawnIllusionToken}
            onGrantMutationDie={onGrantMutationDie}
            onMarkEconomy={onMarkEconomy}
            incapacitated={incapacitated}
            resolveContext={resolveContext}
            onClose={() => setOpenActionId(null)}
            characterId={characterId}
            onApplySelfHeal={onApplySelfHeal}
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
            healContext={healContext}
            playerNoteValues={playerNoteValues}
            onPlayerNoteChange={onPlayerNoteChange}
            onEquipmentChoiceChange={onEquipmentChoiceChange}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

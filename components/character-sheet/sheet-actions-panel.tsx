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
import { guardianTacticsToggleIdForOption } from "@/lib/compendium/sheet-toggle-registry"
import {
  SHEET_ACTION_CARD,
  SHEET_ACTION_USAGE_DOT,
} from "@/lib/character/sheet-status-colors"
import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import { cn } from "@/lib/utils"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import { resolveActionUsesTrackingKey } from "@/lib/character/action-uses-key"
import type { UsesConfig } from "@/lib/types"
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
  const damageExpression = `${specialAttack.damageDiceCount}d${sides}${
    damageModifier ? ` ${damageModifier >= 0 ? "+" : ""}${damageModifier}` : ""
  }${specialAttack.damageTypes[0] ? ` ${specialAttack.damageTypes[0]}` : ""}`

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
  incapacitated,
  resolveContext,
  onClose,
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
  incapacitated: boolean
  resolveContext: ResolveUsesContext
  onClose: () => void
}) {
  const [augmentSelections, setAugmentSelections] = useState<PsionicAugmentSelection[]>([])
  const [step, setStep] = useState<"detail" | "roll">("detail")
  const [useFeedback, setUseFeedback] = useState<string | null>(null)
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

  const chargeExhausted = usage != null && usage.used >= usage.max
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
    if (usage && !spendViaAugments) {
      usage.setUsed(usage.used + 1)
    }
    if (spendViaAugments) {
      onSpendPsi(psiCost)
    }

    const parts: string[] = []
    if (selectedOption) {
      parts.push(selectedOption.name)
      const toggleId = guardianTacticsToggleIdForOption(selectedOption.name)
      if (toggleId && onActivateSheetToggle) {
        onActivateSheetToggle(toggleId)
        parts.push("Tactics toggle on")
      }
    }
    if (hitDiceNeeded > 0) parts.push(`Spent ${hitDiceNeeded} Hit Dice`)
    if (psiCost > 0) parts.push(`Spent ${psiCost} psi`)
    if (augmentSummary) parts.push(augmentSummary)
    if (usage && !spendViaAugments) parts.push("Marked one use")

    if (specialAttack && (specialAttack.damageDiceCount > 0 || specialAttack.attackProfile)) {
      setStep("roll")
      return
    }

    setUseFeedback(parts.join(" · ") || "Used!")
  }

  const conMod = resolveContext.abilityModifiers?.CON ?? 0
  const vengeanceDamageMod =
    hitDiceNeeded > 0 && specialAttack && /vengeance/i.test(action.name) ? conMod : 0

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
            damageModifier={vengeanceDamageMod}
            psiSpent={psiCost}
            hitDiceSpent={hitDiceNeeded}
            augmentSummary={augmentSummary}
            onClose={onClose}
          />
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
                            <p className="mt-1 text-muted-foreground leading-relaxed">
                              {option.description}
                            </p>
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
            </div>

            <div className="sticky bottom-0 space-y-2 border-t border-border bg-card/95 p-4 backdrop-blur-sm">
              {useFeedback ? (
                <p className="rounded-lg bg-primary/10 px-3 py-2 text-center text-xs font-semibold text-primary">
                  {useFeedback}
                </p>
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

  /** Resolve the spendable counter backing an action, if any. */
  const usageFor = (action: SheetActionEntry): ActionUsage | null => {
    if (action.classResourceKey && action.classId && onResourceUsedChange) {
      const resourceId = `${action.classId}_${action.classResourceKey}`
      const resource = resourceById.get(resourceId)
      if (resource) {
        const max = resolveUsesAtLevel(resource.uses, resource.classLevel, resolveContext)
        if (max != null && max > 0) {
          return {
            max,
            used: usedResourcesById[resourceId] ?? 0,
            resourceName: resource.name,
            resourceId,
            setUsed: (next) =>
              onResourceUsedChange({
                ...usedResourcesById,
                [resourceId]: Math.min(max, Math.max(0, next)),
              }),
          }
        }
      }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                        Costs {entry.limitedUses?.classResourceAmount ?? 1}
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
            incapacitated={incapacitated}
            resolveContext={resolveContext}
            onClose={() => setOpenActionId(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

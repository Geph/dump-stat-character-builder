"use client"

import { useState } from "react"
import { Dices } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import { useSheetRollContext } from "@/components/character-sheet/sheet-roll-context"
import type { RollContext } from "@/lib/character/roll-context"
import { collectFeatureRollBonuses } from "@/lib/character/collect-limited-feature-effects"
import {
  resolveRollMode,
  rollModeBadgeLabel,
  type ManualRollOverride,
} from "@/lib/character/resolve-roll-mode"
import { D20NaturalsDisplay } from "@/components/character-sheet/d20-naturals-display"
import { formatD20RollSummary, rollD20WithMode, type D20RollMode } from "@/lib/dice/d20-roll"

type D20RollButtonProps = {
  modifier: number
  title?: string
  size?: "sm" | "md" | "lg"
  /** `stack` puts adv/dis above the roll button (centered). `panel` fills parent height. */
  layout?: "inline" | "stack" | "panel"
  /** Color fill for weapon / large combat buttons. */
  tone?: "default" | "action" | "bonus"
  /**
   * Mode-toggle contrast when the control sits on a colored sheet tile (e.g. Initiative)
   * rather than on the roll button's own fill.
   */
  modeToggleSurface?: "default" | "onFill"
  /** Optional caption shown inside filled panel buttons (e.g. TO HIT). */
  caption?: string
  /** Optional shared progress through a multi-attack Attack action. */
  attackPips?: { used: number; total: number }
  className?: string
  breakdown?: { label: string; value: number }[]
  onRoll?: () => void
  rollContext?: RollContext
  activeConditions?: string[]
  exhaustionLevel?: number
  /** When false, Jack of All Trades and similar bonuses are skipped for this roll. */
  skillProficient?: boolean
  /** Set when `modifier` already includes feature roll bonuses (e.g. derived skill totals). */
  featureBonusesIncluded?: boolean
  disabled?: boolean
  disabledReason?: string
}

export function isNat20OrNat1(natural: number): boolean {
  return natural === 20 || natural === 1
}

export function d20CriticalSuffix(natural: number): string {
  return isNat20OrNat1(natural) ? " !!" : ""
}

/** @deprecated Use rollD20WithMode from lib/dice/d20-roll */
export function rollD20(modifier: number): { natural: number; total: number } {
  const rolled = rollD20WithMode("normal", modifier)
  return { natural: rolled.natural, total: rolled.total }
}

function D20RollFace({
  result,
  filled,
}: {
  result: { natural: number; total: number; naturals: number[] }
  filled: boolean
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${filled ? "text-white" : ""}`}>
      <D20NaturalsDisplay chosen={result.natural} filled={filled} naturals={result.naturals} />
      <span className={filled ? "text-white/70" : "text-muted-foreground"}>=</span>
      <span className={`font-black ${filled ? "text-white" : "text-primary"}`}>{result.total}</span>
    </span>
  )
}

function cycleManualOverride(current: ManualRollOverride): ManualRollOverride {
  if (current === "normal") return "advantage"
  if (current === "advantage") return "disadvantage"
  return "normal"
}

function RollDiceIcon({ className = "w-3 h-3 text-muted-foreground" }: { className?: string }) {
  return <Dices className={`${className} shrink-0`} aria-hidden />
}

export function D20RollButton({
  modifier,
  title,
  size = "sm",
  layout = "inline",
  tone = "default",
  modeToggleSurface = "default",
  caption,
  attackPips,
  className,
  breakdown,
  onRoll,
  rollContext,
  activeConditions = [],
  exhaustionLevel = 0,
  skillProficient,
  featureBonusesIncluded = false,
  disabled = false,
  disabledReason,
}: D20RollButtonProps) {
  const [result, setResult] = useState<{
    natural: number
    total: number
    mode: D20RollMode
    naturals: number[]
  } | null>(null)
  const [manualOverride, setManualOverride] = useState<ManualRollOverride>("normal")
  const history = useSheetRollHistory()
  const rollCtx = useSheetRollContext()
  const conditions = activeConditions.length ? activeConditions : rollCtx.activeConditions
  const exhaustion = exhaustionLevel || rollCtx.exhaustionLevel

  const resolved = rollContext
    ? resolveRollMode({
        context: rollContext,
        activeConditions: conditions,
        exhaustionLevel: exhaustion,
        manualOverride,
        classFeatures: rollCtx.classFeatures,
        limitationContext: {
          activeConditions: conditions,
          activeSheetToggles: rollCtx.activeSheetToggles,
          equippedArmor: rollCtx.equippedArmor,
          equippedShield: rollCtx.equippedShield,
          currentHp: rollCtx.featureEffectContext?.currentHp ?? rollCtx.currentHp,
        },
      })
    : {
        mode: (manualOverride === "normal" ? "normal" : manualOverride) as D20RollMode,
        sources: [] as string[],
      }

  const featureRollBonus =
    !featureBonusesIncluded &&
    rollContext &&
    rollCtx.classFeatures.length &&
    rollCtx.featureEffectContext
      ? collectFeatureRollBonuses(rollCtx.classFeatures, rollContext, {
          activeConditions: conditions,
          activeSheetToggles: rollCtx.activeSheetToggles,
          equippedArmor: rollCtx.equippedArmor,
          equippedShield: rollCtx.equippedShield,
          currentHp: rollCtx.featureEffectContext.currentHp,
          proficiencyBonus: rollCtx.featureEffectContext.proficiencyBonus,
          abilityMods: rollCtx.featureEffectContext.abilityMods,
          characterLevel: rollCtx.featureEffectContext.characterLevel,
          classResourceDieSides: rollCtx.featureEffectContext.classResourceDieSides,
          skillProficient,
        }).total
      : 0

  const effectiveModifier = modifier + featureRollBonus

  const effectiveMode = resolved.mode
  const filled = tone !== "default" || layout === "panel"
  const modeToggleOnFill = filled || modeToggleSurface === "onFill"
  const sizeClass =
    layout === "panel"
      ? "h-auto min-h-[2.75rem] w-full px-2 py-1.5 pr-9 text-sm gap-1"
      : size === "lg"
        ? "h-11 min-w-11 px-2 text-sm gap-1.5"
        : size === "md"
          ? "h-9 min-w-9 px-2 text-sm gap-1.5"
          : "h-6 min-w-[2.25rem] px-1.5 text-xs gap-1"

  const toneClass =
    tone === "action"
      ? "sheet-fill-tile sheet-fill-action"
      : tone === "bonus"
        ? "sheet-fill-tile sheet-fill-bonus"
        : "border border-border bg-muted/80 hover:bg-muted"

  const modLabel = effectiveModifier >= 0 ? `+${effectiveModifier}` : `${effectiveModifier}`
  const modeBadge = rollModeBadgeLabel(effectiveMode)

  const formatSigned = (value: number) => (value >= 0 ? `+${value}` : `${value}`)
  const tooltip = (() => {
    const header = title ? `${title} (${modLabel})` : `Roll d20 ${modLabel}`
    const lines = (breakdown ?? []).filter((part) => part.value !== 0)
    const featureBonusLine =
      featureRollBonus !== 0 ? `  Feature bonus: ${formatSigned(featureRollBonus)}` : null
    const modeLine = modeBadge ? `Mode: ${modeBadge}` : null
    const manualLine =
      manualOverride !== "normal" ? `Manual override: ${manualOverride}` : null
    return [header, modeLine, manualLine, featureBonusLine, ...lines.map((part) => `  ${part.label}: ${formatSigned(part.value)}`)]
      .filter(Boolean)
      .join("\n")
  })()

  const handleRoll = () => {
    if (disabled) return
    if (effectiveMode === "auto_fail") {
      setResult({ natural: 1, total: 1 + effectiveModifier, mode: "auto_fail", naturals: [1] })
      history?.logRoll({
        kind: "d20",
        label: title ?? `d20 ${modLabel}`,
        summary: `Auto-fail (${title ?? "save"})`,
        natural: 1,
        naturals: [1],
      })
      onRoll?.()
      return
    }

    const rolled = rollD20WithMode(effectiveMode, effectiveModifier)
    setResult({
      natural: rolled.natural,
      total: rolled.total,
      mode: rolled.mode,
      naturals: rolled.naturals,
    })
    history?.logRoll({
      kind: "d20",
      label: title ?? `d20 ${modLabel}`,
      summary: formatD20RollSummary(rolled, effectiveModifier),
      natural: rolled.natural,
      naturals: rolled.naturals,
    })
    const critFloor = rollCtx.criticalHitMinimum ?? 20
    if (
      (rollContext?.kind === "attack" || rollContext?.kind === "spell_attack") &&
      rolled.natural >= critFloor
    ) {
      rollCtx.onAttackCriticalHit?.()
    }
    onRoll?.()
  }

  const modeToggle = (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        setManualOverride((current) => cycleManualOverride(current))
      }}
      className={`inline-flex min-h-6 min-w-6 items-center justify-center rounded border px-1.5 py-1 text-[10px] font-bold uppercase leading-none ${
        modeToggleOnFill
          ? modeBadge || manualOverride !== "normal"
            ? "border-white/55 bg-black/15 text-white"
            : "border-white/40 bg-black/15 text-white/90 hover:border-white/65 hover:text-white"
          : modeBadge || manualOverride !== "normal"
            ? "border-primary/40 text-primary"
            : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
      }`}
      title="Cycle manual advantage / disadvantage override"
      aria-label="Cycle roll mode override"
    >
      {modeBadge ?? (manualOverride === "normal" ? "···" : manualOverride === "advantage" ? "Adv" : "Dis")}
    </button>
  )

  const rollButton = (
    <button
      type="button"
      onClick={handleRoll}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-bold tabular-nums shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
        layout === "panel" ? "rounded-lg" : "rounded"
      } ${sizeClass} ${toneClass} ${className ?? ""}`}
      title={disabledReason ?? tooltip}
      aria-label={title ?? `Roll d20 ${modLabel}`}
    >
      {caption ? (
        <span className="flex flex-col items-center gap-0.5 leading-none">
          <span className={`text-[9px] font-bold uppercase tracking-wide ${filled ? "text-white/85" : "text-muted-foreground"}`}>
            {caption}
          </span>
          <span className="inline-flex items-center gap-1">
            <RollDiceIcon className={filled ? "w-3.5 h-3.5 text-white/90" : "w-3 h-3"} />
            {effectiveMode === "auto_fail" ? (
              <span className={`font-medium ${filled ? "text-white" : "text-destructive"}`}>Fail</span>
            ) : result != null ? (
              <D20RollFace filled={filled} result={result} />
            ) : (
              <span className={filled ? "text-white" : "text-foreground"}>{modLabel}</span>
            )}
          </span>
          {attackPips && attackPips.total > 1 ? (
            <span
              className="inline-flex gap-1 pt-0.5"
              aria-label={`${Math.min(attackPips.used, attackPips.total)} of ${attackPips.total} attacks used`}
            >
              {Array.from({ length: attackPips.total }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full border border-white/70 ${
                    index < attackPips.used ? "bg-white" : "bg-transparent"
                  }`}
                />
              ))}
            </span>
          ) : null}
        </span>
      ) : (
        <>
          <RollDiceIcon className={filled ? "w-3.5 h-3.5 text-white/90" : undefined} />
          {effectiveMode === "auto_fail" ? (
            <span className={`font-medium ${filled ? "text-white" : "text-destructive"}`}>Fail</span>
          ) : result != null ? (
            <D20RollFace filled={filled} result={result} />
          ) : null}
        </>
      )}
    </button>
  )

  if (layout === "panel") {
    return (
      <span className="relative block w-full">
        <span className="pointer-events-auto absolute right-2 top-1.5 z-10">{modeToggle}</span>
        {rollButton}
      </span>
    )
  }

  if (layout === "stack") {
    return (
      <span className="inline-flex flex-col items-center gap-0.5 shrink-0">
        {modeToggle}
        {rollButton}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      {modeToggle}
      {rollButton}
    </span>
  )
}

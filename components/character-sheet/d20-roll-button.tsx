"use client"

import { useState } from "react"
import { Dices } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import { useSheetRollContext } from "@/components/character-sheet/sheet-roll-context"
import type { RollContext } from "@/lib/character/roll-context"
import {
  resolveRollMode,
  rollModeBadgeLabel,
  type ManualRollOverride,
} from "@/lib/character/resolve-roll-mode"
import { rollD20WithMode, type D20RollMode } from "@/lib/dice/d20-roll"

type D20RollButtonProps = {
  modifier: number
  title?: string
  size?: "sm" | "md" | "lg"
  breakdown?: { label: string; value: number }[]
  onRoll?: () => void
  rollContext?: RollContext
  activeConditions?: string[]
  exhaustionLevel?: number
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

function cycleManualOverride(current: ManualRollOverride): ManualRollOverride {
  if (current === "normal") return "advantage"
  if (current === "advantage") return "disadvantage"
  return "normal"
}

function RollDiceIcon({ className = "w-3 h-3" }: { className?: string }) {
  return <Dices className={`${className} text-muted-foreground shrink-0`} aria-hidden />
}

export function D20RollButton({
  modifier,
  title,
  size = "sm",
  breakdown,
  onRoll,
  rollContext,
  activeConditions = [],
  exhaustionLevel = 0,
  disabled = false,
  disabledReason,
}: D20RollButtonProps) {
  const [result, setResult] = useState<{
    natural: number
    total: number
    mode: D20RollMode
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
      })
    : {
        mode: (manualOverride === "normal" ? "normal" : manualOverride) as D20RollMode,
        sources: [] as string[],
      }

  const effectiveMode = resolved.mode
  const sizeClass =
    size === "lg"
      ? "h-11 min-w-11 px-2 text-sm gap-1.5"
      : size === "md"
        ? "h-9 min-w-9 px-2 text-sm gap-1.5"
        : "h-6 min-w-[2.25rem] px-1.5 text-xs gap-1"

  const modLabel = modifier >= 0 ? `+${modifier}` : `${modifier}`
  const modeBadge = rollModeBadgeLabel(effectiveMode)

  const formatSigned = (value: number) => (value >= 0 ? `+${value}` : `${value}`)
  const tooltip = (() => {
    const header = title ? `${title} (${modLabel})` : `Roll d20 ${modLabel}`
    const lines = (breakdown ?? []).filter((part) => part.value !== 0)
    const modeLine = modeBadge ? `Mode: ${modeBadge}` : null
    const manualLine =
      manualOverride !== "normal" ? `Manual override: ${manualOverride}` : null
    return [header, modeLine, manualLine, ...lines.map((part) => `  ${part.label}: ${formatSigned(part.value)}`)]
      .filter(Boolean)
      .join("\n")
  })()

  const handleRoll = () => {
    if (disabled) return
    if (effectiveMode === "auto_fail") {
      setResult({ natural: 1, total: 1 + modifier, mode: "auto_fail" })
      history?.logRoll({
        kind: "d20",
        label: title ?? `d20 ${modLabel}`,
        summary: `Auto-fail (${title ?? "save"})`,
        natural: 1,
      })
      onRoll?.()
      return
    }

    const rolled = rollD20WithMode(effectiveMode, modifier)
    setResult({ natural: rolled.natural, total: rolled.total, mode: rolled.mode })
    const modeSuffix =
      rolled.mode === "advantage" ? " (adv)" : rolled.mode === "disadvantage" ? " (dis)" : ""
    history?.logRoll({
      kind: "d20",
      label: title ?? `d20 ${modLabel}`,
      summary: `${rolled.natural}${modifier >= 0 ? ` + ${modifier}` : ` − ${Math.abs(modifier)}`} = ${rolled.total}${modeSuffix}${d20CriticalSuffix(rolled.natural)}`,
      natural: rolled.natural,
    })
    onRoll?.()
  }

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setManualOverride((current) => cycleManualOverride(current))
        }}
        className={`rounded border px-1 py-0.5 text-[9px] font-bold uppercase ${
          modeBadge || manualOverride !== "normal"
            ? "border-primary/40 text-primary"
            : "border-transparent text-muted-foreground/50 hover:text-muted-foreground hover:border-border"
        }`}
        title="Cycle manual advantage / disadvantage override"
        aria-label="Cycle roll mode override"
      >
        {modeBadge ?? (manualOverride === "normal" ? "···" : manualOverride === "advantage" ? "Adv" : "Dis")}
      </button>
      <button
        type="button"
        onClick={handleRoll}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded border border-border bg-muted/80 font-bold tabular-nums hover:bg-muted shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass}`}
        title={disabledReason ?? tooltip}
        aria-label={title ?? `Roll d20 ${modLabel}`}
      >
        <RollDiceIcon />
        {effectiveMode === "auto_fail" ? (
          <span className="font-medium text-destructive">Fail</span>
        ) : result != null ? (
          <span className="font-medium">
            {result.natural}
            <span className="text-muted-foreground">=</span>
            <span className="font-black text-primary">{result.total}</span>
            {isNat20OrNat1(result.natural) ? (
              <span className="text-primary" aria-label="Natural 20 or natural 1">
                !!
              </span>
            ) : null}
          </span>
        ) : null}
      </button>
    </span>
  )
}

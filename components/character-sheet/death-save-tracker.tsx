"use client"

import { useState } from "react"
import { Dices, RotateCcw, Skull } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import { useSheetRollContext } from "@/components/character-sheet/sheet-roll-context"
import { isNat20OrNat1 } from "@/components/character-sheet/d20-roll-button"
import { collectDeathSaveCritThreshold } from "@/lib/character/collect-feature-roll-modes"
import { resolveRollMode, rollModeBadgeLabel } from "@/lib/character/resolve-roll-mode"
import {
  applyDeathSaveRoll,
  deathSaveRollSummary,
  type DeathSaveState,
} from "@/lib/character/death-save-roll"
import { SHEET_DEATH_SAVE_BOX } from "@/lib/character/sheet-status-colors"
import { rollD20WithMode } from "@/lib/dice/d20-roll"

export type { DeathSaveState }

type DeathSaveTrackerProps = {
  deathSaves: DeathSaveState
  onDeathSavesChange: (next: DeathSaveState) => void
  /** Compact row aligned with saving throw rows. */
  variant?: "stacked" | "inline"
}

function DeathSaveDots({
  label,
  count,
  tone,
  onToggle,
  compact = false,
}: {
  label: string
  count: number
  tone: "success" | "failure"
  onToggle: (index: number) => void
  compact?: boolean
}) {
  const activeClass =
    tone === "success"
      ? "border-emerald-500 bg-emerald-500"
      : "border-destructive bg-destructive"

  return (
    <div className={compact ? "min-w-0 flex items-center gap-1.5" : "min-w-0"}>
      <p
        className={
          compact
            ? "text-[9px] font-semibold text-muted-foreground uppercase shrink-0"
            : "text-[9px] font-semibold text-muted-foreground uppercase mb-1"
        }
      >
        {label}
      </p>
      <div className={`flex gap-1 ${compact ? "" : "justify-center"}`}>
        {Array.from({ length: 3 }, (_, index) => {
          const active = index < count
          return (
            <button
              key={index}
              type="button"
              onClick={() => onToggle(index)}
              className={`rounded-full border ${
                compact ? "h-3.5 w-3.5" : "h-4 w-4"
              } ${active ? activeClass : "border-border bg-background hover:border-muted-foreground"}`}
              aria-label={`${label} ${index + 1}${active ? " marked" : ""}`}
            />
          )
        })}
      </div>
    </div>
  )
}

export function DeathSaveTracker({
  deathSaves,
  onDeathSavesChange,
  variant = "stacked",
}: DeathSaveTrackerProps) {
  const history = useSheetRollHistory()
  const rollCtx = useSheetRollContext()
  const [lastRoll, setLastRoll] = useState<number | null>(null)

  const critThreshold = collectDeathSaveCritThreshold(rollCtx.classFeatures, {
    activeConditions: rollCtx.activeConditions,
    activeSheetToggles: rollCtx.activeSheetToggles,
    equippedArmor: rollCtx.equippedArmor,
    equippedShield: rollCtx.equippedShield,
    currentHp: rollCtx.featureEffectContext?.currentHp ?? rollCtx.currentHp,
  })
  const resolvedMode = resolveRollMode({
    context: { kind: "death_save" },
    activeConditions: rollCtx.activeConditions,
    exhaustionLevel: rollCtx.exhaustionLevel,
    classFeatures: rollCtx.classFeatures,
    limitationContext: {
      activeConditions: rollCtx.activeConditions,
      activeSheetToggles: rollCtx.activeSheetToggles,
      equippedArmor: rollCtx.equippedArmor,
      equippedShield: rollCtx.equippedShield,
      currentHp: rollCtx.featureEffectContext?.currentHp ?? rollCtx.currentHp,
    },
  })
  const modeBadge = rollModeBadgeLabel(resolvedMode.mode)

  const toggleSuccess = (index: number) => {
    const active = index < deathSaves.successes
    onDeathSavesChange({
      ...deathSaves,
      successes: active ? index : index + 1,
    })
  }

  const toggleFailure = (index: number) => {
    const active = index < deathSaves.failures
    onDeathSavesChange({
      ...deathSaves,
      failures: active ? index : index + 1,
    })
  }

  const handleRoll = () => {
    const rolled = rollD20WithMode(resolvedMode.mode === "auto_fail" ? "normal" : resolvedMode.mode, 0)
    const natural = rolled.natural
    setLastRoll(natural)
    onDeathSavesChange(applyDeathSaveRoll(natural, deathSaves, critThreshold))
    const modeSuffix =
      resolvedMode.mode === "advantage" ? " (adv)" : resolvedMode.mode === "disadvantage" ? " (dis)" : ""
    history?.logRoll({
      kind: "d20",
      label: "Death save",
      summary: `${deathSaveRollSummary(natural, critThreshold)}${modeSuffix}`,
      natural,
    })
  }

  const isCritByThreshold = lastRoll != null && lastRoll !== 1 && lastRoll >= critThreshold

  const rollControls = (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={handleRoll}
        className="inline-flex h-7 min-w-[2rem] items-center justify-center gap-1 rounded border border-border bg-muted/80 px-1.5 text-xs font-bold tabular-nums hover:bg-muted"
        title={`Roll death saving throw (d20${modeBadge ? `, ${modeBadge}` : ""}, 10+ success, nat 1 = 2 failures, ${critThreshold < 20 ? `${critThreshold}-20` : "nat 20"} = regain 1 HP)`}
        aria-label="Roll death save"
      >
        <Dices className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden />
        {modeBadge ? (
          <span className="text-[9px] font-bold uppercase text-primary">{modeBadge}</span>
        ) : null}
        {lastRoll != null ? (
          <span className="font-medium">
            {lastRoll}
            {isNat20OrNat1(lastRoll) || isCritByThreshold ? (
              <span className="text-primary" aria-label="Natural 20 or natural 1">
                !!
              </span>
            ) : null}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => {
          setLastRoll(null)
          onDeathSavesChange({ successes: 0, failures: 0 })
        }}
        className="inline-flex h-7 items-center gap-0.5 rounded border border-border bg-background/80 px-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Clear death saves"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
    </div>
  )

  if (variant === "inline") {
    return (
      <div
        className={`relative flex flex-col justify-center gap-1.5 px-2 py-1.5 min-h-[2.75rem] h-full ${SHEET_DEATH_SAVE_BOX}`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Death Saves</p>
          {rollControls}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-6">
          <DeathSaveDots
            label="Succ"
            count={deathSaves.successes}
            tone="success"
            onToggle={toggleSuccess}
            compact
          />
          <DeathSaveDots
            label="Fail"
            count={deathSaves.failures}
            tone="failure"
            onToggle={toggleFailure}
            compact
          />
        </div>
        <Skull
          className="pointer-events-none absolute bottom-1.5 right-1.5 h-5 w-5 text-muted-foreground/30"
          aria-hidden
        />
      </div>
    )
  }

  return (
    <div className={`p-2.5 flex flex-col gap-2 h-full ${SHEET_DEATH_SAVE_BOX}`}>
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase">Death Saves</p>
        {rollControls}
      </div>
      <DeathSaveDots
        label="Successes"
        count={deathSaves.successes}
        tone="success"
        onToggle={toggleSuccess}
      />
      <DeathSaveDots
        label="Failures"
        count={deathSaves.failures}
        tone="failure"
        onToggle={toggleFailure}
      />
    </div>
  )
}

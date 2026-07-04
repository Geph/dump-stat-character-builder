"use client"

import type { ReactNode } from "react"
import { Heart, Minus, Plus } from "lucide-react"
import type { StatBreakdownPart } from "@/lib/character/types"
import type { DerivedStatBreakdowns } from "@/lib/character/stat-contributions"
import { breakdownLines } from "@/lib/character/get-derived-breakdowns"
import { StatExplainPopover } from "@/components/character-sheet/stat-explain-popover"
import type { IncomingAttackNote } from "@/lib/character/incoming-attack-notes"
import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import {
  clampExhaustionLevel,
  EXHAUSTION_MAX_LEVEL,
  getExhaustionEffectSummary,
} from "@/lib/srd/exhaustion-effects"

type SheetPersistentStatsBarProps = {
  armorClass: number
  acBreakdown: StatBreakdownPart[]
  statBreakdowns?: DerivedStatBreakdowns
  incomingAttackNotes?: IncomingAttackNote[]
  exhaustionLevel?: number
  onExhaustionLevelChange?: (level: number) => void
  initiative: number
  speed: number
  maxHp: number
  currentHp: number
  tempHp: number
  onCurrentHpChange: (value: number) => void
  onTempHpChange: (value: number) => void
  onInitiativeRoll: () => void
  formatMod: (mod: number) => string
}

function CoreStatTile({
  label,
  children,
  trailing,
}: {
  label: string
  children: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div className="bg-card/90 rounded-lg border border-border/80 px-3 py-2 min-h-11 flex flex-col justify-center min-w-[4.5rem]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-between gap-1.5">
        <div className="font-black text-base tabular-nums leading-none">{children}</div>
        {trailing}
      </div>
    </div>
  )
}

export function SheetPersistentStatsBar({
  armorClass,
  acBreakdown,
  statBreakdowns,
  incomingAttackNotes = [],
  exhaustionLevel = 0,
  onExhaustionLevelChange,
  initiative,
  speed,
  maxHp,
  currentHp,
  tempHp,
  onCurrentHpChange,
  onTempHpChange,
  onInitiativeRoll,
  formatMod,
}: SheetPersistentStatsBarProps) {
  const clampedExhaustion = clampExhaustionLevel(exhaustionLevel)

  return (
    <div className="mt-3 -mx-1 overflow-x-auto overscroll-x-contain">
      <div className="flex items-stretch gap-2 px-1 min-w-max sm:min-w-0 sm:flex-wrap sm:justify-end">
        <div className="bg-card/90 rounded-lg border border-border/80 px-3 py-2 min-h-11 flex flex-col justify-center min-w-[4.5rem]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
            AC
          </p>
          <div className="mt-1 flex items-center justify-between gap-1.5">
            <div className="font-black text-base tabular-nums leading-none">{armorClass}</div>
            <StatExplainPopover
              title="Armor Class"
              total={armorClass}
              parts={acBreakdown}
              contributions={statBreakdowns ? breakdownLines(statBreakdowns, "ac") : undefined}
            />
          </div>
          {incomingAttackNotes.length > 0 ? (
            <div className="mt-1 space-y-0.5">
              {incomingAttackNotes.map((note) => (
                <p
                  key={note.label}
                  className="text-[10px] leading-tight text-amber-800 dark:text-amber-300"
                  title={note.detail}
                >
                  {note.detail}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <CoreStatTile
          label="Init"
          trailing={
            <>
              <StatExplainPopover
                title="Initiative"
                total={initiative}
                contributions={
                  statBreakdowns ? breakdownLines(statBreakdowns, "initiative") : undefined
                }
              />
              <D20RollButton
                modifier={initiative}
                title="Roll initiative"
                size="lg"
                rollContext={{ kind: "initiative", ability: "dexterity" }}
                onRoll={onInitiativeRoll}
              />
            </>
          }
        >
          {formatMod(initiative)}
        </CoreStatTile>

        <CoreStatTile
          label="Speed"
          trailing={
            <StatExplainPopover
              title="Speed"
              total={speed}
              contributions={statBreakdowns ? breakdownLines(statBreakdowns, "speed") : undefined}
            />
          }
        >
          {speed} ft
        </CoreStatTile>

        <div className="bg-card/90 rounded-lg border border-border/80 px-3 py-2 min-h-11 min-w-[6.5rem]">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-destructive shrink-0" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
              HP
            </p>
          </div>
          <div className="mt-1 flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={maxHp + tempHp}
              value={currentHp}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10)
                onCurrentHpChange(Number.isNaN(next) ? 0 : Math.max(0, Math.min(maxHp + tempHp, next)))
              }}
              aria-label="Current hit points"
              className="w-11 min-h-9 text-center bg-background border border-border rounded px-0.5 text-base font-black tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-xs text-muted-foreground tabular-nums">/ {maxHp}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] font-medium text-cyan-700 dark:text-cyan-300">Temp</span>
            <input
              type="number"
              min={0}
              value={tempHp}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10)
                onTempHpChange(Number.isNaN(next) ? 0 : Math.max(0, next))
              }}
              aria-label="Temporary hit points"
              className="w-10 min-h-8 text-center bg-background border border-cyan/30 rounded text-xs font-bold text-cyan tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        {onExhaustionLevelChange ? (
          <div className="bg-card/90 rounded-lg border border-border/80 px-3 py-2 min-h-11 min-w-[5.5rem]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
              Exhaustion
            </p>
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onExhaustionLevelChange(clampExhaustionLevel(clampedExhaustion - 1))
                }
                disabled={clampedExhaustion <= 0}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-background disabled:opacity-40"
                aria-label="Decrease exhaustion"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span
                className="min-w-[1.25rem] text-center text-base font-black tabular-nums"
                title={getExhaustionEffectSummary(clampedExhaustion)}
              >
                {clampedExhaustion}
              </span>
              <button
                type="button"
                onClick={() =>
                  onExhaustionLevelChange(clampExhaustionLevel(clampedExhaustion + 1))
                }
                disabled={clampedExhaustion >= EXHAUSTION_MAX_LEVEL}
                className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-background disabled:opacity-40"
                aria-label="Increase exhaustion"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

"use client"

import { useState, type ReactNode } from "react"
import { Heart, Info, Minus, Plus } from "lucide-react"
import type { StatBreakdownPart } from "@/lib/character/types"
import type { IncomingAttackNote } from "@/lib/character/incoming-attack-notes"
import { D20RollButton } from "@/components/character-sheet/d20-roll-button"
import {
  clampExhaustionLevel,
  EXHAUSTION_MAX_LEVEL,
  getExhaustionEffectSummary,
} from "@/lib/srd/exhaustion-effects"

function formatSignedValue(value: number) {
  return value >= 0 ? `+${value}` : `${value}`
}

function StatBreakdownButton({
  title,
  total,
  parts,
}: {
  title: string
  total: number
  parts: StatBreakdownPart[]
}) {
  const [open, setOpen] = useState(false)
  if (!parts.length) return null
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
        aria-label={`How ${title} is calculated`}
        aria-expanded={open}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open ? (
        <>
          <span className="fixed inset-0 z-[99]" aria-hidden onClick={() => setOpen(false)} />
          <span className="absolute right-0 top-9 z-[100] block w-52 rounded-lg border border-border bg-card p-2 text-left shadow-xl">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {title}
            </span>
            <span className="block space-y-0.5">
              {parts.map((part, index) => (
                <span
                  key={`${part.label}-${index}`}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-muted-foreground">{part.label}</span>
                  <span className="font-medium tabular-nums">{formatSignedValue(part.value)}</span>
                </span>
              ))}
            </span>
            <span className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-1 text-xs font-bold">
              <span>Total</span>
              <span className="tabular-nums">{total}</span>
            </span>
          </span>
        </>
      ) : null}
    </span>
  )
}

type SheetPersistentStatsBarProps = {
  armorClass: number
  acBreakdown: StatBreakdownPart[]
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
  trailing?: React.ReactNode
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
            <StatBreakdownButton title="Armor Class" total={armorClass} parts={acBreakdown} />
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
            <D20RollButton
              modifier={initiative}
              title="Roll initiative"
              size="lg"
              rollContext={{ kind: "initiative", ability: "dexterity" }}
              onRoll={onInitiativeRoll}
            />
          }
        >
          {formatMod(initiative)}
        </CoreStatTile>

        <CoreStatTile label="Speed">{speed} ft</CoreStatTile>

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

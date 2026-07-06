"use client"

import type { ReactNode } from "react"
import { Footprints, Heart, Shield, ShieldPlus, Zap } from "lucide-react"
import type { CharacterSpeedEntry } from "@/lib/character/resolve-all-speeds"
import type { HitDicePoolEntry } from "@/lib/character/hit-dice"
import { ShortRestHitDiceBox } from "@/components/character-sheet/short-rest-hit-dice-box"
import type { DerivedStatBreakdowns } from "@/lib/character/stat-contributions"
import { breakdownLines } from "@/lib/character/get-derived-breakdowns"
import { StatExplainPopover } from "@/components/character-sheet/stat-explain-popover"
import type { IncomingAttackNote } from "@/lib/character/incoming-attack-notes"
import { D20RollButton } from "@/components/character-sheet/d20-roll-button"

type SheetPersistentStatsBarProps = {
  armorClass: number
  acBreakdown: StatBreakdownPart[]
  statBreakdowns?: DerivedStatBreakdowns
  incomingAttackNotes?: IncomingAttackNote[]
  /** When true, omits outer margin for embedding in the sheet header row. */
  embedded?: boolean
  /** Panel layout for combat tab — single compact row (no initiative). */
  panel?: boolean
  initiative: number
  speed: number
  speeds?: CharacterSpeedEntry[]
  maxHp: number
  currentHp: number
  tempHp: number
  onCurrentHpChange: (value: number) => void
  onTempHpChange: (value: number) => void
  hitDicePool?: HitDicePoolEntry[]
  conMod?: number
  /** Show hit-dice healing controls after the player takes a Short Rest. */
  showShortRestHitDice?: boolean
  onShortRestHeal?: (amount: number) => void
  onSpendHitDice?: (classId: string, count: number) => void
  onInitiativeRoll: () => void
  formatMod: (mod: number) => string
}

type InitiativeBlockProps = {
  initiative: number
  statBreakdowns?: DerivedStatBreakdowns
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

function hpBarTone(currentHp: number, maxHp: number): string {
  if (maxHp <= 0) return "from-muted-foreground/40 to-muted-foreground/30"
  const ratio = currentHp / maxHp
  if (ratio <= 0.25) return "from-destructive to-destructive/70"
  if (ratio <= 0.5) return "from-amber-500 to-amber-400"
  return "from-emerald-500 to-emerald-400"
}

export function SheetInitiativeBlock({
  initiative,
  statBreakdowns,
  onInitiativeRoll,
  formatMod,
}: InitiativeBlockProps) {
  return (
    <div className="rounded-lg border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-card p-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
          <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Initiative
            </p>
            <StatExplainPopover
              title="Initiative"
              total={initiative}
              contributions={
                statBreakdowns ? breakdownLines(statBreakdowns, "initiative") : undefined
              }
            />
          </div>
          <p className="text-xl font-black tabular-nums leading-tight">{formatMod(initiative)}</p>
        </div>
        <D20RollButton
          modifier={initiative}
          title="Roll initiative"
          size="md"
          rollContext={{ kind: "initiative", ability: "dexterity" }}
          onRoll={onInitiativeRoll}
        />
      </div>
    </div>
  )
}

function CombatStatsCompactRow({
  armorClass,
  acBreakdown,
  statBreakdowns,
  incomingAttackNotes,
  speed,
  speeds = [],
  maxHp,
  currentHp,
  tempHp,
  onCurrentHpChange,
  onTempHpChange,
  hitDicePool = [],
  conMod = 0,
  showShortRestHitDice = false,
  onShortRestHeal,
  onSpendHitDice,
}: Omit<
  SheetPersistentStatsBarProps,
  "embedded" | "panel" | "initiative" | "onInitiativeRoll" | "formatMod"
>) {
  const hpPercent =
    maxHp > 0 ? Math.min(100, Math.round((currentHp / maxHp) * 100)) : 0
  const hpTone = hpBarTone(currentHp, maxHp)
  const walkSpeed = speeds.find((entry) => entry.type === "walk")?.feet ?? speed

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <div className="flex shrink-0 flex-col justify-center gap-2 rounded-lg border border-primary/25 bg-gradient-to-br from-primary/12 to-card px-3 py-3 min-h-[5.625rem] min-w-[5rem]">
        <div className="flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-primary shrink-0" aria-hidden />
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
            AC
          </p>
          <StatExplainPopover
            title="Armor Class"
            total={armorClass}
            parts={acBreakdown}
            contributions={statBreakdowns ? breakdownLines(statBreakdowns, "ac") : undefined}
          />
        </div>
        <span className="block w-full text-center text-2xl font-black tabular-nums leading-none text-primary">
          {armorClass}
        </span>
        {incomingAttackNotes.length > 0 ? (
          <div className="space-y-0.5 max-w-[10rem]">
            {incomingAttackNotes.map((note) => (
              <p
                key={`${note.label}:${note.detail}`}
                className="text-[9px] leading-tight text-amber-800 dark:text-amber-300 line-clamp-2"
                title={note.detail}
              >
                {note.detail}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col justify-center gap-2 rounded-lg border border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-card px-3 py-3 min-h-[5.625rem] min-w-[5.5rem]">
        <div className="flex items-center gap-1.5">
          <Footprints className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
            Speed
          </p>
          <StatExplainPopover
            title="Speed"
            total={speed}
            summable={false}
            contributions={statBreakdowns ? breakdownLines(statBreakdowns, "speed") : undefined}
          />
        </div>
        {speeds.length > 1 ? (
          <div className="flex w-full flex-col items-center gap-0.5 text-center text-xs font-bold leading-snug tabular-nums">
            {speeds.map((entry) => (
              <span key={entry.type}>
                {entry.feet} ft {entry.label}
              </span>
            ))}
          </div>
        ) : (
          <span className="block w-full text-center text-xl font-black tabular-nums leading-none">
            {walkSpeed}
            <span className="ml-0.5 text-xs font-bold text-muted-foreground">ft</span>
          </span>
        )}
      </div>

      <div className="flex min-w-[12rem] flex-1 flex-col justify-center gap-2.5 rounded-lg border border-destructive/20 bg-gradient-to-br from-destructive/6 to-card px-3 py-3 min-h-[5.625rem]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2 shrink-0">
            <Heart className="h-4 w-4 text-destructive shrink-0" aria-hidden />
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                min={0}
                max={maxHp + tempHp}
                value={currentHp}
                onChange={(e) => {
                  const next = parseInt(e.target.value, 10)
                  onCurrentHpChange(
                    Number.isNaN(next) ? 0 : Math.max(0, Math.min(maxHp + tempHp, next)),
                  )
                }}
                aria-label="Current hit points"
                className="w-11 min-h-8 text-center bg-background border border-border rounded px-0.5 text-lg font-black tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-sm font-bold text-muted-foreground tabular-nums">/ {maxHp}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 rounded border border-cyan/25 bg-cyan/5 px-1.5 py-1">
            <ShieldPlus className="h-3 w-3 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden />
            <span className="text-[9px] font-semibold uppercase text-cyan-700 dark:text-cyan-300">
              Temp
            </span>
            <input
              type="number"
              min={0}
              value={tempHp}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10)
                onTempHpChange(Number.isNaN(next) ? 0 : Math.max(0, next))
              }}
              aria-label="Temporary hit points"
              className="w-8 min-h-6 text-center bg-background/80 border border-cyan/30 rounded text-[11px] font-bold text-cyan tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          {showShortRestHitDice && onShortRestHeal && onSpendHitDice && hitDicePool.length > 0 ? (
            <ShortRestHitDiceBox
              pool={hitDicePool}
              conMod={conMod}
              currentHp={currentHp}
              maxHp={maxHp}
              onHeal={onShortRestHeal}
              onSpendDice={onSpendHitDice}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/80">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${hpTone}`}
              style={{ width: `${hpPercent}%` }}
              role="progressbar"
              aria-valuenow={currentHp}
              aria-valuemin={0}
              aria-valuemax={maxHp}
              aria-label="Hit point percentage"
            />
          </div>
          <span className="text-[9px] tabular-nums text-muted-foreground shrink-0">{hpPercent}%</span>
        </div>
      </div>
    </div>
  )
}

export function SheetPersistentStatsBar({
  armorClass,
  acBreakdown,
  statBreakdowns,
  incomingAttackNotes = [],
  embedded = false,
  panel = false,
  initiative,
  speed,
  speeds,
  maxHp,
  currentHp,
  tempHp,
  onCurrentHpChange,
  onTempHpChange,
  hitDicePool,
  conMod,
  showShortRestHitDice,
  onShortRestHeal,
  onSpendHitDice,
  onInitiativeRoll,
  formatMod,
}: SheetPersistentStatsBarProps) {
  if (panel) {
    return (
      <CombatStatsCompactRow
        armorClass={armorClass}
        acBreakdown={acBreakdown}
        statBreakdowns={statBreakdowns}
        incomingAttackNotes={incomingAttackNotes}
        speed={speed}
        speeds={speeds}
        maxHp={maxHp}
        currentHp={currentHp}
        tempHp={tempHp}
        onCurrentHpChange={onCurrentHpChange}
        onTempHpChange={onTempHpChange}
        hitDicePool={hitDicePool}
        conMod={conMod}
        showShortRestHitDice={showShortRestHitDice}
        onShortRestHeal={onShortRestHeal}
        onSpendHitDice={onSpendHitDice}
      />
    )
  }

  return (
    <div
      className={
        embedded
          ? "overflow-x-auto overscroll-x-contain overflow-y-visible"
          : "mt-3 -mx-1 overflow-x-auto overscroll-x-contain"
      }
    >
      <div
        className={`flex items-stretch gap-2 min-w-max sm:min-w-0 sm:flex-wrap ${
          embedded ? "justify-end" : "px-1 sm:justify-end"
        }`}
      >
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
                  key={`${note.label}:${note.detail}`}
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
              summable={false}
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
      </div>
    </div>
  )
}

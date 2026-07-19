"use client"

import { useMemo, useState } from "react"
import { Dices } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import {
  formatHitDiceRollSummary,
  rollHitDiceHeal,
  type HitDicePoolEntry,
} from "@/lib/character/hit-dice"

type HitDiceTrackerProps = {
  pool: HitDicePoolEntry[]
  conMod: number
  currentHp: number
  maxHp: number
  onHeal: (amount: number) => void
  onSetSpent: (classId: string, spent: number) => void
  /** Compact chip next to Temp HP; default is a full-width ability-tab row. */
  variant?: "row" | "compact"
}

export function HitDiceTracker({
  pool,
  conMod,
  currentHp,
  maxHp,
  onHeal,
  onSetSpent,
  variant = "row",
}: HitDiceTrackerProps) {
  const history = useSheetRollHistory()
  const [selectedClassId, setSelectedClassId] = useState(() => pool[0]?.classId ?? "")
  const [diceCount, setDiceCount] = useState(1)

  const selectedEntry = useMemo(() => {
    const match = pool.find((entry) => entry.classId === selectedClassId)
    return match ?? pool[0] ?? null
  }, [pool, selectedClassId])

  if (!pool.length || !selectedEntry) return null

  const maxSpend = selectedEntry.remaining
  const safeCount = Math.min(Math.max(1, diceCount), Math.max(1, maxSpend || 1))
  const atFullHp = currentHp >= maxHp
  const rollDisabled = maxSpend <= 0 || atFullHp

  const handleRemainingChange = (nextRemaining: number) => {
    const clamped = Math.max(0, Math.min(selectedEntry.total, nextRemaining))
    onSetSpent(selectedEntry.classId, selectedEntry.total - clamped)
  }

  const handleRoll = () => {
    if (rollDisabled) return
    const count = Math.min(safeCount, selectedEntry.remaining)
    if (count <= 0) return

    const rolled = rollHitDiceHeal({
      die: selectedEntry.die,
      count,
      conMod,
    })
    const healing = Math.min(rolled.total, Math.max(0, maxHp - currentHp))
    if (healing <= 0) return

    onSetSpent(selectedEntry.classId, selectedEntry.spent + count)
    onHeal(healing)
    history?.logRoll({
      kind: "damage",
      label: "Hit Dice healing",
      summary: formatHitDiceRollSummary({
        className: selectedEntry.className,
        die: selectedEntry.die,
        count,
        conMod,
        rolls: rolled.rolls,
        total: rolled.total,
      }),
    })
  }

  const classPicker =
    pool.length > 1 ? (
      <select
        value={selectedEntry.classId}
        onChange={(event) => {
          setSelectedClassId(event.target.value)
          setDiceCount(1)
        }}
        aria-label="Hit die class"
        className={
          variant === "compact"
            ? "max-w-[4.5rem] min-h-6 rounded border border-emerald-500/30 bg-background/80 px-1 text-[10px] font-semibold text-foreground"
            : "max-w-[9rem] min-h-7 rounded border border-border bg-background px-1.5 text-xs font-semibold text-foreground"
        }
      >
        {pool.map((entry) => (
          <option key={entry.classId} value={entry.classId}>
            {variant === "compact"
              ? `d${entry.die} (${entry.remaining})`
              : `${entry.className} d${entry.die}`}
          </option>
        ))}
      </select>
    ) : (
      <span
        className={
          variant === "compact"
            ? "text-[10px] font-bold tabular-nums text-emerald-800 dark:text-emerald-200"
            : "text-xs font-bold tabular-nums text-foreground"
        }
      >
        d{selectedEntry.die}
        {variant === "row" && pool.length === 1 ? (
          <span className="ml-1 font-medium text-muted-foreground">{selectedEntry.className}</span>
        ) : null}
      </span>
    )

  const remainingEditor = (
    <div className="flex items-center gap-0.5">
      <input
        type="number"
        min={0}
        max={selectedEntry.total}
        value={selectedEntry.remaining}
        onChange={(event) => {
          const next = parseInt(event.target.value, 10)
          handleRemainingChange(Number.isNaN(next) ? selectedEntry.remaining : next)
        }}
        aria-label="Hit dice remaining"
        className={
          variant === "compact"
            ? "w-7 min-h-6 text-center bg-background/80 border border-emerald-500/30 rounded text-[10px] font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            : "w-9 min-h-7 text-center bg-background border border-border rounded text-xs font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        }
      />
      <span
        className={
          variant === "compact"
            ? "text-[10px] tabular-nums text-muted-foreground"
            : "text-xs tabular-nums text-muted-foreground"
        }
      >
        / {selectedEntry.total}
      </span>
    </div>
  )

  const rollControls = (
    <div className="flex items-center gap-1">
      <select
        value={safeCount}
        onChange={(event) => setDiceCount(parseInt(event.target.value, 10))}
        disabled={maxSpend <= 0}
        aria-label="Hit dice to spend"
        className={
          variant === "compact"
            ? "w-9 min-h-6 rounded border border-emerald-500/30 bg-background/80 px-0.5 text-center text-[10px] font-bold tabular-nums text-foreground disabled:opacity-50"
            : "w-10 min-h-7 rounded border border-border bg-background px-0.5 text-center text-xs font-bold tabular-nums text-foreground disabled:opacity-50"
        }
      >
        {Array.from({ length: Math.max(1, maxSpend) }, (_, index) => index + 1).map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleRoll}
        disabled={rollDisabled}
        title={
          atFullHp
            ? "Already at maximum hit points"
            : maxSpend <= 0
              ? "No hit dice remaining"
              : "Spend hit dice to heal"
        }
        className={
          variant === "compact"
            ? "inline-flex min-h-6 items-center gap-0.5 rounded border border-emerald-500/35 bg-emerald-500/15 px-1.5 text-[10px] font-bold uppercase text-emerald-800 transition-colors hover:bg-emerald-500/25 disabled:pointer-events-none disabled:opacity-40 dark:text-emerald-200"
            : "inline-flex min-h-7 items-center gap-1 rounded border border-border bg-muted/80 px-2 text-xs font-bold hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        }
      >
        <Dices className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        Roll
      </button>
    </div>
  )

  if (variant === "compact") {
    return (
      <div className="flex shrink-0 items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/5 px-1.5 py-1">
        <Dices className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <span className="text-[9px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
          HD
        </span>
        {classPicker}
        {remainingEditor}
        {rollControls}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 rounded text-xs bg-emerald-500/10 font-medium">
      <span className="shrink-0">Hit Dice</span>
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        {classPicker}
        {remainingEditor}
        {rollControls}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { Dices, X } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import {
  formatHitDiceRollSummary,
  rollHitDiceHeal,
  type HitDicePoolEntry,
} from "@/lib/character/hit-dice"
import { cn } from "@/lib/utils"

type HitDiceTrackerProps = {
  pool: HitDicePoolEntry[]
  conMod: number
  currentHp: number
  maxHp: number
  onHeal: (amount: number) => void
  onSetSpent: (classId: string, spent: number) => void
  /** Compact chip next to Temp HP; default is a full-width ability-tab row. */
  variant?: "row" | "compact"
  /**
   * When false, remaining can still be adjusted but rolling to heal is hidden
   * (short-rest-only Hit Dice). Default true for backwards compatibility.
   */
  allowRollHeal?: boolean
}

export function HitDiceTracker({
  pool,
  conMod,
  currentHp,
  maxHp,
  onHeal,
  onSetSpent,
  variant = "row",
  allowRollHeal = true,
}: HitDiceTrackerProps) {
  const history = useSheetRollHistory()
  const [open, setOpen] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState(() => pool[0]?.classId ?? "")
  const [diceCount, setDiceCount] = useState(1)
  const [lastSummary, setLastSummary] = useState<string | null>(null)

  const selectedEntry = useMemo(() => {
    const match = pool.find((entry) => entry.classId === selectedClassId)
    return match ?? pool[0] ?? null
  }, [pool, selectedClassId])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!pool.length || !selectedEntry) return null

  const totalRemaining = pool.reduce((sum, entry) => sum + entry.remaining, 0)
  const totalDice = pool.reduce((sum, entry) => sum + entry.total, 0)
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
    const summary = formatHitDiceRollSummary({
      className: selectedEntry.className,
      die: selectedEntry.die,
      count,
      conMod,
      rolls: rolled.rolls,
      total: rolled.total,
    })
    setLastSummary(summary)
    history?.logRoll({
      kind: "damage",
      label: "Hit Dice healing",
      summary,
    })
  }

  const openOverlay = () => {
    setLastSummary(null)
    setDiceCount(1)
    setOpen(true)
  }

  const triggerButton =
    variant === "compact" ? (
      <button
        type="button"
        onClick={openOverlay}
        title={
          allowRollHeal
            ? "Hit Dice — adjust remaining or roll to heal"
            : "Hit Dice — adjust remaining (heal on Short Rest)"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex shrink-0 items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/5 px-1.5 py-1 transition-colors hover:bg-emerald-500/15"
      >
        <Dices className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <span className="text-[9px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
          HD
        </span>
        <span className="text-[10px] font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
          {totalRemaining}/{totalDice}
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={openOverlay}
        title={
          allowRollHeal
            ? "Hit Dice — adjust remaining or roll to heal"
            : "Hit Dice — adjust remaining (heal on Short Rest)"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-xs font-medium bg-emerald-500/10 transition-colors hover:bg-emerald-500/20"
      >
        <span className="inline-flex items-center gap-1.5 shrink-0">
          <Dices className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Hit Dice
        </span>
        <span className="font-bold tabular-nums text-foreground">
          {totalRemaining}/{totalDice}
          {pool.length === 1 ? (
            <span className="ml-1.5 font-medium text-muted-foreground">d{selectedEntry.die}</span>
          ) : null}
        </span>
      </button>
    )

  return (
    <>
      {triggerButton}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hit-dice-overlay-title"
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border-2 border-border bg-card p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex items-center gap-2.5 pr-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <Dices className="h-5 w-5" />
              </span>
              <div>
                <p id="hit-dice-overlay-title" className="text-base font-black text-foreground">
                  Hit Dice
                </p>
                <p className="text-xs text-muted-foreground">
                  {allowRollHeal
                    ? "Adjust remaining or spend dice to heal"
                    : "Adjust remaining — spend dice to heal on a Short Rest"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {pool.length > 1 ? (
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Class
                  </label>
                  <select
                    value={selectedEntry.classId}
                    onChange={(event) => {
                      setSelectedClassId(event.target.value)
                      setDiceCount(1)
                      setLastSummary(null)
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground"
                  >
                    {pool.map((entry) => (
                      <option key={entry.classId} value={entry.classId}>
                        {entry.className} · d{entry.die} · {entry.remaining}/{entry.total}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                  <p className="text-sm font-bold text-foreground">{selectedEntry.className}</p>
                  <p className="text-xs text-muted-foreground">d{selectedEntry.die} hit die</p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Remaining
                </label>
                <div className="flex items-center gap-2">
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
                    className="w-20 rounded-lg border border-border bg-background px-3 py-2.5 text-center text-sm font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-sm tabular-nums text-muted-foreground">
                    / {selectedEntry.total}
                  </span>
                </div>
              </div>

              {allowRollHeal ? (
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Spend to heal
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={safeCount}
                    onChange={(event) => setDiceCount(parseInt(event.target.value, 10))}
                    disabled={maxSpend <= 0}
                    aria-label="Hit dice to spend"
                    className="w-20 rounded-lg border border-border bg-background px-2 py-2.5 text-center text-sm font-bold tabular-nums text-foreground disabled:opacity-50"
                  >
                    {Array.from({ length: Math.max(1, maxSpend) }, (_, index) => index + 1).map(
                      (value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ),
                    )}
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
                    className={cn(
                      "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors",
                      rollDisabled
                        ? "pointer-events-none border-border opacity-40"
                        : "border-emerald-500/40 bg-emerald-500/15 text-emerald-900 hover:bg-emerald-500/25 dark:text-emerald-100",
                    )}
                  >
                    <Dices className="h-4 w-4 shrink-0" aria-hidden />
                    Roll {safeCount}d{selectedEntry.die}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Each die adds your Constitution modifier ({conMod >= 0 ? "+" : ""}
                  {conMod}).{" "}
                  {atFullHp
                    ? "Already at max HP."
                    : `${Math.max(0, maxHp - currentHp)} HP until full.`}
                </p>
              </div>
              ) : (
                <p className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground">
                  Rolling Hit Dice to heal is available on a Short Rest, unless a feat or feature
                  lets you spend them otherwise.
                </p>
              )}

              {lastSummary ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Last roll
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                    {lastSummary}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

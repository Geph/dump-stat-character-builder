"use client"

import { useMemo, useState } from "react"
import { Dices } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import {
  formatHitDiceRollSummary,
  rollHitDiceHeal,
  type HitDicePoolEntry,
} from "@/lib/character/hit-dice"
import { cn } from "@/lib/utils"

type ShortRestHitDiceBoxProps = {
  pool: HitDicePoolEntry[]
  conMod: number
  currentHp: number
  maxHp: number
  onHeal: (amount: number) => void
  onSpendDice: (classId: string, count: number) => void
}

export function ShortRestHitDiceBox({
  pool,
  conMod,
  currentHp,
  maxHp,
  onHeal,
  onSpendDice,
}: ShortRestHitDiceBoxProps) {
  const history = useSheetRollHistory()
  const available = pool.filter((entry) => entry.remaining > 0)
  const [selectedClassId, setSelectedClassId] = useState(() => available[0]?.classId ?? "")
  const [diceCount, setDiceCount] = useState(1)

  const effectiveClassId = available.some((entry) => entry.classId === selectedClassId)
    ? selectedClassId
    : (available[0]?.classId ?? "")

  const selectedEntry = useMemo(
    () => available.find((entry) => entry.classId === effectiveClassId) ?? available[0] ?? null,
    [available, effectiveClassId],
  )

  const maxSpend = selectedEntry?.remaining ?? 0
  const safeCount = Math.min(Math.max(1, diceCount), Math.max(1, maxSpend))
  const atFullHp = currentHp >= maxHp
  const disabled = !selectedEntry || maxSpend <= 0 || atFullHp

  const handleRoll = () => {
    if (!selectedEntry || disabled) return
    const count = Math.min(safeCount, selectedEntry.remaining)
    if (count <= 0) return

    const rolled = rollHitDiceHeal({
      die: selectedEntry.die,
      count,
      conMod,
    })
    const healing = Math.min(rolled.total, Math.max(0, maxHp - currentHp))
    if (healing <= 0) return

    onSpendDice(selectedEntry.classId, count)
    onHeal(healing)
    history?.logRoll({
      kind: "damage",
      label: "Short Rest healing",
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

  if (!pool.length) return null

  const selectClass =
    "min-h-11 w-full rounded-xl border border-emerald-500/35 bg-background px-3 text-sm font-semibold text-foreground disabled:opacity-50"
  const selectCount =
    "min-h-11 w-full rounded-xl border border-emerald-500/35 bg-background px-3 text-center text-sm font-bold tabular-nums text-foreground disabled:opacity-50"

  return (
    <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 sm:p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <Dices className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Hit Dice</p>
          <p className="text-xs text-muted-foreground">
            Roll + CON ({conMod >= 0 ? "+" : ""}
            {conMod}) per die
          </p>
        </div>
      </div>

      <div className={cn("grid gap-2", available.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
        {available.length > 1 ? (
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              Die type
            </span>
            <select
              value={selectedEntry?.classId ?? ""}
              onChange={(event) => {
                setSelectedClassId(event.target.value)
                setDiceCount(1)
              }}
              disabled={available.length === 0}
              aria-label="Hit die type"
              className={selectClass}
            >
              {available.map((entry) => (
                <option key={entry.classId} value={entry.classId}>
                  {entry.className} · d{entry.die} ({entry.remaining} left)
                </option>
              ))}
            </select>
          </label>
        ) : selectedEntry ? (
          <div className="rounded-xl border border-emerald-500/25 bg-background/60 px-3 py-2.5">
            <p className="text-sm font-bold text-foreground">{selectedEntry.className}</p>
            <p className="text-xs text-muted-foreground">
              d{selectedEntry.die} · {selectedEntry.remaining} remaining
            </p>
          </div>
        ) : null}

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            Dice to spend
          </span>
          <select
            value={safeCount}
            onChange={(event) => setDiceCount(parseInt(event.target.value, 10))}
            disabled={disabled}
            aria-label="Hit dice to spend"
            className={selectCount}
          >
            {Array.from({ length: Math.max(1, maxSpend) }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={handleRoll}
        disabled={disabled}
        title={
          atFullHp
            ? "Already at maximum hit points"
            : maxSpend <= 0
              ? "No hit dice remaining"
              : "Spend hit dice to heal (Short Rest)"
        }
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/20 px-4 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-500/30 disabled:pointer-events-none disabled:opacity-40 dark:text-emerald-50"
      >
        <Dices className="h-4 w-4 shrink-0" aria-hidden />
        Roll {selectedEntry ? `${safeCount}d${selectedEntry.die}` : "Hit Dice"}
      </button>
    </div>
  )
}

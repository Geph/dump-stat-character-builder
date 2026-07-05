"use client"

import { useMemo, useState } from "react"
import { Dices } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import {
  formatHitDiceRollSummary,
  rollHitDiceHeal,
  type HitDicePoolEntry,
} from "@/lib/character/hit-dice"

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

  return (
    <div className="flex shrink-0 items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/5 px-1.5 py-1">
      <Dices className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      <span className="text-[9px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
        HD
      </span>
      {available.length > 1 ? (
        <select
          value={selectedEntry?.classId ?? ""}
          onChange={(event) => {
            setSelectedClassId(event.target.value)
            setDiceCount(1)
          }}
          disabled={available.length === 0}
          aria-label="Hit die type"
          className="max-w-[4.5rem] min-h-6 rounded border border-emerald-500/30 bg-background/80 px-1 text-[10px] font-semibold text-foreground"
        >
          {available.map((entry) => (
            <option key={entry.classId} value={entry.classId}>
              d{entry.die} ({entry.remaining})
            </option>
          ))}
        </select>
      ) : selectedEntry ? (
        <span className="text-[10px] font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
          d{selectedEntry.die}
        </span>
      ) : null}
      <select
        value={safeCount}
        onChange={(event) => setDiceCount(parseInt(event.target.value, 10))}
        disabled={disabled}
        aria-label="Hit dice to spend"
        className="w-9 min-h-6 rounded border border-emerald-500/30 bg-background/80 px-0.5 text-center text-[10px] font-bold tabular-nums text-foreground disabled:opacity-50"
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
        disabled={disabled}
        title={
          atFullHp
            ? "Already at maximum hit points"
            : maxSpend <= 0
              ? "No hit dice remaining"
              : "Spend hit dice to heal (Short Rest)"
        }
        className="min-h-6 rounded border border-emerald-500/35 bg-emerald-500/15 px-1.5 text-[10px] font-bold uppercase text-emerald-800 transition-colors hover:bg-emerald-500/25 disabled:pointer-events-none disabled:opacity-40 dark:text-emerald-200"
      >
        Roll
      </button>
    </div>
  )
}

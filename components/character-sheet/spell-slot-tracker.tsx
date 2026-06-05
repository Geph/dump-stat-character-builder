"use client"

import { useMemo } from "react"
import { RotateCcw } from "lucide-react"
import {
  formatSpellSlotLevel,
  type SpellSlotTable,
} from "@/lib/compendium/spell-slots"

function buildInitialUsed(slotsByLevel: number[]): number[] {
  return slotsByLevel.map(() => 0)
}

type SpellSlotTrackerProps = {
  table: SpellSlotTable
  usedByLevel: number[]
  onUsedChange: (used: number[]) => void
}

export function SpellSlotTracker({ table, usedByLevel, onUsedChange }: SpellSlotTrackerProps) {
  const entries = useMemo(
    () =>
      table.slotsByLevel
        .map((max, index) => ({ spellLevel: index + 1, max }))
        .filter((entry) => entry.max > 0),
    [table.slotsByLevel],
  )

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No spell slots at class level {table.classLevel}.
      </p>
    )
  }

  const toggleSlot = (levelIndex: number, slotIndex: number) => {
    const max = table.slotsByLevel[levelIndex] ?? 0
    const used = usedByLevel[levelIndex] ?? 0
    const isUsed = slotIndex < used
    const next = [...usedByLevel]
    if (isUsed) {
      next[levelIndex] = Math.max(0, used - 1)
    } else if (used < max) {
      next[levelIndex] = used + 1
    }
    onUsedChange(next)
  }

  const resetAll = () => onUsedChange(buildInitialUsed(table.slotsByLevel))

  const remainingTotal = entries.reduce(
    (sum, entry) => sum + entry.max - (usedByLevel[entry.spellLevel - 1] ?? 0),
    0,
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {table.type === "pact"
            ? `Pact Magic (${formatSpellSlotLevel(table.pactSlotLevel ?? 1)} slots)`
            : `${table.className} spell slots`}
        </p>
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
          title="Restore all spell slots"
        >
          <RotateCcw className="w-3 h-3" />
          Rest
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-semibold py-1 pr-3">Level</th>
              <th className="text-left font-semibold py-1 pr-2">Slots</th>
              <th className="text-right font-semibold py-1 w-12">Left</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(({ spellLevel, max }) => {
              const levelIndex = spellLevel - 1
              const used = usedByLevel[levelIndex] ?? 0
              const remaining = max - used
              return (
                <tr key={spellLevel} className="border-t border-border/60">
                  <td className="py-1.5 pr-3 font-medium whitespace-nowrap">
                    {formatSpellSlotLevel(spellLevel)}
                  </td>
                  <td className="py-1.5 pr-2">
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: max }, (_, slotIndex) => {
                        const isUsed = slotIndex < used
                        return (
                          <button
                            key={slotIndex}
                            type="button"
                            onClick={() => toggleSlot(levelIndex, slotIndex)}
                            className={`w-4 h-4 rounded-full border-2 transition-colors ${
                              isUsed
                                ? "bg-muted border-border"
                                : "bg-primary border-primary hover:bg-primary/80"
                            }`}
                            title={isUsed ? "Mark slot available" : "Mark slot used"}
                            aria-label={`${formatSpellSlotLevel(spellLevel)} slot ${slotIndex + 1}, ${isUsed ? "used" : "available"}`}
                          />
                        )
                      })}
                    </div>
                  </td>
                  <td className="py-1.5 text-right font-bold tabular-nums">{remaining}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground">{remainingTotal} slots remaining total</p>
    </div>
  )
}

/** Mark one slot used at the given spell level (1-based). Returns false if none available. */
export function consumeSpellSlot(
  usedByLevel: number[],
  slotsByLevel: number[],
  spellLevel: number,
): number[] | null {
  if (spellLevel < 1) return usedByLevel
  const index = spellLevel - 1
  const max = slotsByLevel[index] ?? 0
  const used = usedByLevel[index] ?? 0
  if (used >= max) return null
  const next = [...usedByLevel]
  next[index] = used + 1
  return next
}

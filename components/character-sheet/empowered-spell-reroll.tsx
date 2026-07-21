"use client"

import { useMemo, useState } from "react"
import { Dices } from "lucide-react"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"

type EmpoweredSpellRerollProps = {
  /** Max dice the caster may reroll (Charisma modifier, minimum 1). */
  maxRerolls: number
}

/** Post-cast helper for Mortal Metamagic Empowered Spell. */
export function EmpoweredSpellReroll({ maxRerolls }: EmpoweredSpellRerollProps) {
  const history = useSheetRollHistory()
  const [diceCount, setDiceCount] = useState(4)
  const [diceSides, setDiceSides] = useState(6)
  const [rolls, setRolls] = useState<number[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const cap = Math.max(1, maxRerolls)

  const total = useMemo(
    () => (rolls ? rolls.reduce((sum, value) => sum + value, 0) : null),
    [rolls],
  )

  const rollInitial = () => {
    const count = Math.max(1, Math.min(20, diceCount))
    const sides = Math.max(2, Math.min(20, diceSides))
    const next = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides))
    setRolls(next)
    setSelected(new Set())
    const summary = `${next.join(" + ")} = ${next.reduce((a, b) => a + b, 0)} (${count}d${sides})`
    history?.logRoll({ kind: "damage", label: "Spell damage (Empowered)", summary })
  }

  const toggleDie = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
        return next
      }
      if (next.size >= cap) return prev
      next.add(index)
      return next
    })
  }

  const rerollSelected = () => {
    if (!rolls || selected.size === 0) return
    const sides = Math.max(2, Math.min(20, diceSides))
    const next = rolls.map((value, index) =>
      selected.has(index) ? 1 + Math.floor(Math.random() * sides) : value,
    )
    setRolls(next)
    setSelected(new Set())
    const summary = `${next.join(" + ")} = ${next.reduce((a, b) => a + b, 0)} (rerolled ${selected.size})`
    history?.logRoll({ kind: "damage", label: "Empowered Spell reroll", summary })
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          Empowered Spell
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
          Roll the spell&apos;s damage dice, then select up to {cap} die
          {cap === 1 ? "" : "e"} to reroll (use the new rolls).
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[10px] font-semibold text-muted-foreground">
          Dice
          <input
            type="number"
            min={1}
            max={20}
            value={diceCount}
            onChange={(e) => setDiceCount(parseInt(e.target.value, 10) || 1)}
            className="mt-1 block w-16 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
          />
        </label>
        <span className="pb-2 text-sm text-muted-foreground">d</span>
        <label className="text-[10px] font-semibold text-muted-foreground">
          Sides
          <input
            type="number"
            min={2}
            max={20}
            value={diceSides}
            onChange={(e) => setDiceSides(parseInt(e.target.value, 10) || 6)}
            className="mt-1 block w-16 px-2 py-1.5 rounded-lg border border-border bg-background text-sm"
          />
        </label>
        <button
          type="button"
          onClick={rollInitial}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40"
        >
          <Dices className="h-3.5 w-3.5" />
          Roll damage
        </button>
      </div>
      {rolls ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {rolls.map((value, index) => {
              const isSelected = selected.has(index)
              return (
                <button
                  key={`${index}-${value}`}
                  type="button"
                  onClick={() => toggleDie(index)}
                  className={`h-9 min-w-9 rounded-lg border-2 px-2 text-sm font-black tabular-nums ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/20 text-foreground"
                      : "border-border bg-card text-foreground hover:border-amber-500/40"
                  }`}
                  aria-pressed={isSelected}
                  title={isSelected ? "Selected for reroll" : "Select to reroll"}
                >
                  {value}
                </button>
              )
            })}
          </div>
          <p className="text-sm font-bold tabular-nums text-foreground">Total: {total}</p>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={rerollSelected}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-100 disabled:opacity-40"
          >
            <Dices className="h-3.5 w-3.5" />
            Reroll selected ({selected.size}/{cap})
          </button>
        </div>
      ) : null}
    </div>
  )
}

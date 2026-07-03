"use client"

import type { MetamagicCastOption } from "@/lib/character/resolve-spell-cast-cost"

type MetamagicCastPickerProps = {
  options: MetamagicCastOption[]
  selectedIds: string[]
  onChange: (next: string[]) => void
  maxTotalCost: number | null
  disabled?: boolean
}

export function MetamagicCastPicker({
  options,
  selectedIds,
  onChange,
  maxTotalCost,
  disabled = false,
}: MetamagicCastPickerProps) {
  if (!options.length) return null

  const selected = options.filter((row) => selectedIds.includes(row.id))
  const selectedCost = selected.reduce((sum, row) => sum + row.cost, 0)

  const toggle = (id: string) => {
    if (disabled) return
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((entry) => entry !== id))
      return
    }
    const next = options.find((row) => row.id === id)
    if (!next) return
    const nextCost = selectedCost + next.cost
    if (maxTotalCost != null && nextCost > maxTotalCost) return
    onChange([...selectedIds, id])
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Metamagic
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Optional add-ons capped at your Proficiency Bonus per cast.
          </p>
        </div>
        {selected.length ? (
          <p className="text-xs font-semibold tabular-nums shrink-0">{selectedCost} SP</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id)
          const wouldExceed =
            maxTotalCost != null &&
            !isSelected &&
            selectedCost + option.cost > maxTotalCost
          return (
            <label
              key={option.id}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                isSelected
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-border/70 bg-background/60"
              } ${disabled || wouldExceed ? "opacity-60" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled || wouldExceed}
                onChange={() => toggle(option.id)}
                className="mt-1 accent-amber-500"
              />
              <span className="min-w-0">
                <span className="text-sm font-semibold text-foreground">{option.name}</span>
                {option.cost > 0 ? (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                    +{option.cost} SP
                  </span>
                ) : (
                  <span className="ml-2 text-[10px] text-muted-foreground">No SP cost parsed</span>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

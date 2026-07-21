"use client"

import { ChevronDown, Sparkles } from "lucide-react"
import type { MetamagicCastOption } from "@/lib/character/resolve-spell-cast-cost"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type MetamagicCastDropdownProps = {
  options: MetamagicCastOption[]
  selectedIds: string[]
  onChange: (next: string[]) => void
  maxTotalCost: number | null
  disabled?: boolean
}

export function MetamagicCastDropdown({
  options,
  selectedIds,
  onChange,
  maxTotalCost,
  disabled = false,
}: MetamagicCastDropdownProps) {
  if (!options.length) return null

  const selected = options.filter((row) => selectedIds.includes(row.id))
  const selectedCost = selected.reduce((sum, row) => sum + row.cost, 0)
  const selectedHitDice = selected.reduce((sum, row) => sum + (row.hitDiceCost ?? 0), 0)

  const toggle = (id: string) => {
    if (disabled) return
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((entry) => entry !== id))
      return
    }
    const next = options.find((row) => row.id === id)
    if (!next) return
    const nextCost = selectedCost + next.cost
    if (maxTotalCost != null && next.cost > 0 && nextCost > maxTotalCost) return
    onChange([...selectedIds, id])
  }

  const costSummary = (() => {
    const parts: string[] = []
    if (selectedCost > 0) parts.push(`${selectedCost} SP`)
    if (selectedHitDice > 0) parts.push(`${selectedHitDice} HD`)
    return parts.join(" + ")
  })()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-colors",
            selected.length
              ? "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              : "border-border bg-card text-foreground hover:border-amber-500/40 hover:bg-amber-500/5",
            disabled && "opacity-50 pointer-events-none",
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">
            {selected.length
              ? `Metamagic (${selected.length})${costSummary ? ` · ${costSummary}` : ""}`
              : "Cast with Metamagic"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[min(100vw-2rem,20rem)]">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          Metamagic options
        </DropdownMenuLabel>
        <p className="px-2 pb-2 text-[11px] text-muted-foreground leading-snug">
          Select any that apply to this cast
          {maxTotalCost != null ? ` (max ${maxTotalCost} SP total).` : "."} Hit Dice options spend
          from the Hit Dice tracker.
        </p>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id)
          const wouldExceed =
            maxTotalCost != null &&
            option.cost > 0 &&
            !isSelected &&
            selectedCost + option.cost > maxTotalCost
          const costLabel =
            (option.hitDiceCost ?? 0) > 0
              ? `+${option.hitDiceCost} HD`
              : `+${option.cost} SP`
          return (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={isSelected}
              disabled={disabled || wouldExceed}
              onCheckedChange={() => toggle(option.id)}
              onSelect={(event) => event.preventDefault()}
              className="items-start py-2"
            >
              <span className="min-w-0">
                <span className="font-semibold text-foreground">{option.name}</span>
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                  {costLabel}
                </span>
              </span>
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

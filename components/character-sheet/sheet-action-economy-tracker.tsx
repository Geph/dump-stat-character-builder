"use client"

import { RotateCcw } from "lucide-react"
import type { ActionEconomyKind } from "@/lib/character/sheet-actions"
import type { ActionEconomySpent } from "@/lib/character/action-economy"
import { cn } from "@/lib/utils"

const ECONOMY_BUTTONS: { kind: ActionEconomyKind; label: string; short: string }[] = [
  { kind: "action", label: "Action", short: "Action" },
  { kind: "bonus", label: "Bonus Action", short: "Bonus" },
  { kind: "reaction", label: "Reaction", short: "Reaction" },
]

type SheetActionEconomyTrackerProps = {
  spent: ActionEconomySpent
  onToggle: (kind: ActionEconomyKind) => void
  onReset: () => void
  disabled?: boolean
}

export function SheetActionEconomyTracker({
  spent,
  onToggle,
  onReset,
  disabled = false,
}: SheetActionEconomyTrackerProps) {
  const anySpent = spent.action || spent.bonus || spent.reaction

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      {ECONOMY_BUTTONS.map(({ kind, label, short }) => {
        const lit = spent[kind]
        return (
          <button
            key={kind}
            type="button"
            disabled={disabled}
            aria-pressed={lit}
            title={lit ? `${label} used — click to clear` : `Mark ${label} used`}
            onClick={() => onToggle(kind)}
            className={cn(
              "min-h-9 flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors sm:flex-none sm:min-w-[4.5rem]",
              lit
                ? "border-primary/50 bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
      <button
        type="button"
        disabled={disabled || !anySpent}
        title="Reset action economy"
        aria-label="Reset action economy"
        onClick={onReset}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
          anySpent
            ? "border-border bg-muted/50 text-foreground hover:bg-muted"
            : "border-border/60 bg-transparent text-muted-foreground/50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

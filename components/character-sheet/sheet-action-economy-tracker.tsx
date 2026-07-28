"use client"

import { RotateCcw, Swords, Zap, Shield } from "lucide-react"
import type { ActionEconomyKind } from "@/lib/character/sheet-actions"
import type { ActionEconomySpent } from "@/lib/character/action-economy"
import { cn } from "@/lib/utils"

const ECONOMY_BUTTONS: {
  kind: ActionEconomyKind
  label: string
  short: string
  Icon: typeof Swords
  idleClass: string
  litClass: string
}[] = [
  {
    kind: "action",
    label: "Action",
    short: "Action",
    Icon: Swords,
    idleClass:
      "border-amber-500/45 bg-gradient-to-b from-amber-600/50 to-amber-950/75 text-white/90 hover:from-amber-500/60",
    litClass:
      "border-amber-400/80 bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25",
  },
  {
    kind: "bonus",
    label: "Bonus Action",
    short: "Bonus",
    Icon: Zap,
    idleClass:
      "border-sky-500/45 bg-gradient-to-b from-sky-600/50 to-sky-950/75 text-white/90 hover:from-sky-500/60",
    litClass:
      "border-sky-400/80 bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/25",
  },
  {
    kind: "reaction",
    label: "Reaction",
    short: "Reaction",
    Icon: Shield,
    idleClass:
      "border-violet-500/45 bg-gradient-to-b from-violet-600/50 to-violet-950/75 text-white/90 hover:from-violet-500/60",
    litClass:
      "border-violet-400/80 bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-md shadow-violet-500/25",
  },
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
    <div className="mb-3 grid w-full grid-cols-[1fr_1fr_1fr_auto] gap-2">
      {ECONOMY_BUTTONS.map(({ kind, label, short, Icon, idleClass, litClass }) => {
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
              "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1.5 py-2.5 transition-all",
              lit ? litClass : idleClass,
              lit && "ring-2 ring-inset ring-white/25",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <Icon
              className={cn("h-4 w-4 shrink-0 text-white/90", lit ? "opacity-100" : "opacity-90")}
              aria-hidden
            />
            <span className="text-[11px] font-black uppercase tracking-wide leading-tight text-white/90 sm:hidden">
              {short}
            </span>
            <span className="hidden text-[11px] font-black uppercase tracking-wide leading-tight text-white/90 sm:inline">
              {label}
            </span>
            {lit ? (
              <span className="absolute right-1 top-1 rounded bg-black/20 px-1 text-[8px] font-bold uppercase tracking-wider text-white/95">
                Used
              </span>
            ) : null}
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
          "inline-flex min-h-14 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors",
          anySpent
            ? "border-border bg-muted/60 text-foreground hover:bg-muted"
            : "border-border/60 bg-transparent text-muted-foreground/50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

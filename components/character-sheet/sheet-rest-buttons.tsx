"use client"

import { Moon, Sun, RefreshCw } from "lucide-react"
import { SHEET_BANNER_BUTTON } from "@/lib/character/sheet-status-colors"
import type { RestType } from "@/lib/types"
import { cn } from "@/lib/utils"

type SheetRestButtonsProps = {
  onRest: (rest: RestType) => void
  onTurnStart?: () => void
}

export function SheetRestButtons({ onRest, onTurnStart }: SheetRestButtonsProps) {
  const restButtonClass = cn(
    "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors sm:flex-none sm:px-3 sm:text-sm",
    SHEET_BANNER_BUTTON.rest,
  )

  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 sm:flex-none">
      {onTurnStart ? (
        <button
          type="button"
          onClick={onTurnStart}
          title="Turn Start — apply start-of-turn effects (e.g. Warrior's Spirit)"
          className={restButtonClass}
        >
          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
          <span>Turn</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onRest("short_rest")}
        title="Short Rest — restore short-rest resources and pact slots"
        className={restButtonClass}
      >
        <Sun className="h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="min-[380px]:hidden">Short</span>
          <span className="hidden min-[380px]:inline">Short Rest</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRest("long_rest")}
        title="Long Rest — restore HP, spell slots, death saves, and long-rest resources"
        className={restButtonClass}
      >
        <Moon className="h-3.5 w-3.5 shrink-0" />
        <span>
          <span className="min-[380px]:hidden">Long</span>
          <span className="hidden min-[380px]:inline">Long Rest</span>
        </span>
      </button>
    </div>
  )
}

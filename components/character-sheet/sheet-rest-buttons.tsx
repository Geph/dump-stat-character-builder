"use client"

import { useState } from "react"
import { Moon, RefreshCw } from "lucide-react"
import { SheetRestChooser } from "@/components/character-sheet/sheet-rest-chooser"
import { SHEET_BANNER_BUTTON } from "@/lib/character/sheet-status-colors"
import type { RestType } from "@/lib/types"
import { cn } from "@/lib/utils"

type SheetRestButtonsProps = {
  onRest: (rest: RestType) => void
  onTurnStart?: () => void
}

export function SheetRestButtons({ onRest, onTurnStart }: SheetRestButtonsProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const buttonClass = cn(
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border-2 px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors sm:px-3 sm:text-sm",
    SHEET_BANNER_BUTTON.rest,
  )

  return (
    <>
      <div className="inline-flex shrink-0 gap-1.5">
        {onTurnStart ? (
          <button
            type="button"
            onClick={onTurnStart}
            title="Turn Start — apply start-of-turn effects (e.g. Warrior's Spirit)"
            className={buttonClass}
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            <span>Turn</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          title="Rest — choose Short Rest or Long Rest"
          className={buttonClass}
        >
          <Moon className="h-3.5 w-3.5 shrink-0" />
          <span>Rest</span>
        </button>
      </div>
      <SheetRestChooser open={menuOpen} onClose={() => setMenuOpen(false)} onRest={onRest} />
    </>
  )
}

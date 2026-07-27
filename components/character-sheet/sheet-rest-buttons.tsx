"use client"

import { useEffect, useState } from "react"
import { Flame, Moon, RefreshCw, Sun, X } from "lucide-react"
import { SHEET_BANNER_BUTTON } from "@/lib/character/sheet-status-colors"
import type { RestType } from "@/lib/types"
import { cn } from "@/lib/utils"

type SheetRestButtonsProps = {
  onRest: (rest: RestType) => void
  onTurnStart?: () => void
}

export function SheetRestButtons({ onRest, onTurnStart }: SheetRestButtonsProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [menuOpen])

  const buttonClass = cn(
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border-2 px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors sm:px-3 sm:text-sm",
    SHEET_BANNER_BUTTON.rest,
  )

  const chooseRest = (rest: RestType) => {
    setMenuOpen(false)
    onRest(rest)
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
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
          <Flame className="h-3.5 w-3.5 shrink-0" />
          <span>Rest</span>
        </button>
      </div>

      {menuOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setMenuOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-rest-choose-title"
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border-2 border-border bg-card p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex items-center gap-2.5 pr-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Flame className="h-5 w-5" />
              </span>
              <div>
                <p id="sheet-rest-choose-title" className="text-base font-black text-foreground">
                  Take a rest
                </p>
                <p className="text-xs text-muted-foreground">Choose short or long rest</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => chooseRest("short_rest")}
                className="flex w-full items-start gap-3 rounded-xl border-2 border-border bg-background/80 px-3.5 py-3.5 text-left transition-colors hover:border-amber-500/50 hover:bg-amber-500/10"
              >
                <Sun className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <span className="block text-sm font-bold text-foreground">Short Rest</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    ~1 hour · recharge short-rest resources
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => chooseRest("long_rest")}
                className="flex w-full items-start gap-3 rounded-xl border-2 border-border bg-background/80 px-3.5 py-3.5 text-left transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/10"
              >
                <Moon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>
                  <span className="block text-sm font-bold text-foreground">Long Rest</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    ~8 hours · full HP, slots, and long-rest resources
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

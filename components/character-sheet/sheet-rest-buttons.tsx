"use client"

import { useEffect, useRef, useState } from "react"
import { Flame, Moon, RefreshCw, Sun } from "lucide-react"
import { SHEET_BANNER_BUTTON } from "@/lib/character/sheet-status-colors"
import type { RestType } from "@/lib/types"
import { cn } from "@/lib/utils"

type SheetRestButtonsProps = {
  onRest: (rest: RestType) => void
  onTurnStart?: () => void
}

export function SheetRestButtons({ onRest, onTurnStart }: SheetRestButtonsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    window.addEventListener("mousedown", close)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", close)
      window.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  const buttonClass = cn(
    "inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors sm:flex-none sm:px-3 sm:text-sm",
    SHEET_BANNER_BUTTON.rest,
  )

  const chooseRest = (rest: RestType) => {
    setMenuOpen(false)
    onRest(rest)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 sm:flex-none">
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
      <div ref={rootRef} className="relative min-w-0 flex-1 sm:flex-none">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title="Rest — choose Short Rest or Long Rest"
          className={buttonClass}
        >
          <Flame className="h-3.5 w-3.5 shrink-0" />
          <span>Rest</span>
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-40 mt-1.5 w-52 overflow-hidden rounded-xl border-2 border-border bg-card shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => chooseRest("short_rest")}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
            >
              <Sun className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <span className="block text-sm font-bold text-foreground">Short Rest</span>
                <span className="block text-[11px] text-muted-foreground">
                  ~1 hour · recharge short-rest resources
                </span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => chooseRest("long_rest")}
              className="flex w-full items-start gap-2.5 border-t border-border px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
            >
              <Moon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>
                <span className="block text-sm font-bold text-foreground">Long Rest</span>
                <span className="block text-[11px] text-muted-foreground">
                  ~8 hours · full HP, slots, and long-rest resources
                </span>
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

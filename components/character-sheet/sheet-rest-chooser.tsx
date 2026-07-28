"use client"

import { useEffect } from "react"
import { Moon, Sun, X } from "lucide-react"
import type { RestType } from "@/lib/types"

type SheetRestChooserProps = {
  open: boolean
  onClose: () => void
  onRest: (rest: RestType) => void
}

export function SheetRestChooser({ open, onClose, onRest }: SheetRestChooserProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const chooseRest = (rest: RestType) => {
    onClose()
    onRest(rest)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
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
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-2.5 pr-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Moon className="h-5 w-5" />
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
  )
}

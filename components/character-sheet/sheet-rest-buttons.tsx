"use client"

import { Moon, Sun } from "lucide-react"
import type { RestType } from "@/lib/types"

type SheetRestButtonsProps = {
  onRest: (rest: RestType) => void
  compact?: boolean
}

export function SheetRestButtons({ onRest, compact }: SheetRestButtonsProps) {
  return (
    <div className={`flex gap-1 ${compact ? "" : "w-full"}`}>
      <button
        type="button"
        onClick={() => onRest("short_rest")}
        title="Short Rest — restore short-rest resources and pact slots"
        className={`inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border bg-background/80 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
          compact ? "px-1.5 py-1 text-[10px]" : "px-2 py-1.5 text-xs"
        }`}
      >
        <Sun className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        Short
      </button>
      <button
        type="button"
        onClick={() => onRest("long_rest")}
        title="Long Rest — restore HP, spell slots, death saves, and long-rest resources"
        className={`inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border bg-background/80 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
          compact ? "px-1.5 py-1 text-[10px]" : "px-2 py-1.5 text-xs"
        }`}
      >
        <Moon className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        Long
      </button>
    </div>
  )
}

"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Dices, History, RotateCcw, X } from "lucide-react"
import { isNat20OrNat1 } from "@/components/character-sheet/d20-roll-button"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import { formatRollTime } from "@/lib/character/sheet-roll-history"
import { cn } from "@/lib/utils"

export function RollHistoryTrigger() {
  const history = useSheetRollHistory()
  const [open, setOpen] = useState(false)

  if (!history) return null

  const { entries, clearHistory } = history
  const count = entries.length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Session roll history"
        aria-label={`Session roll history${count ? `, ${count} rolls` : ""}`}
        className="relative mt-1 flex h-10 w-10 items-center justify-center rounded-lg border-2 border-border/70 bg-card/80 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <span className="flex items-center gap-0.5" aria-hidden>
          <Dices className="w-3.5 h-3.5" />
          <History className="w-3.5 h-3.5" />
        </span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-black leading-none flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center sm:justify-end p-4 pt-20 sm:pt-24 sm:pr-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="w-full max-w-sm max-h-[min(70vh,32rem)] flex flex-col bg-card border-2 border-border rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
                <div>
                  <h2 className="text-sm font-black text-foreground">Roll History</h2>
                  <p className="text-[10px] text-muted-foreground">This browser session</p>
                </div>
                <div className="flex items-center gap-1">
                  {count > 0 && (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                    aria-label="Close roll history"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 min-h-0">
                {entries.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10 px-4">
                    No rolls yet. Dice you roll on this sheet will appear here.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground leading-snug">
                            {entry.label}
                          </p>
                          <time
                            className="text-[10px] text-muted-foreground tabular-nums shrink-0"
                            dateTime={new Date(entry.at).toISOString()}
                          >
                            {formatRollTime(entry.at)}
                          </time>
                        </div>
                        <p
                          className={cn(
                            "text-xs font-bold tabular-nums mt-0.5",
                            entry.natural != null && isNat20OrNat1(entry.natural)
                              ? "text-primary"
                              : "text-foreground",
                          )}
                        >
                          {entry.summary}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Dices, History, RotateCcw, X } from "lucide-react"
import { SheetRollHistoryPanel } from "@/components/character-sheet/sheet-roll-history-panel"
import { useSheetRollHistory } from "@/components/character-sheet/sheet-roll-history-context"
import {
  MANUAL_DIE_SIDES,
  clampManualDiceCount,
  clampManualModifier,
  formatManualRollExpression,
  rollManualDice,
  type ManualDieSides,
  type ManualRollMode,
  type ManualRollResult,
} from "@/lib/dice/manual-roll"
import { SHEET_BANNER_BUTTON } from "@/lib/character/sheet-status-colors"
import { cn } from "@/lib/utils"

const MODE_OPTIONS: { value: ManualRollMode; label: string; short: string }[] = [
  { value: "normal", label: "Normal", short: "N" },
  { value: "advantage", label: "Adv", short: "A" },
  { value: "disadvantage", label: "Dis", short: "D" },
]

const DEFAULT_MANUAL_ROLL_LABEL = "Manual Roll"

type OverlayView = "roll" | "history"

export function ManualRollTrigger() {
  const history = useSheetRollHistory()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<OverlayView>("roll")
  const [label, setLabel] = useState("")
  const [count, setCount] = useState(1)
  const [sides, setSides] = useState<ManualDieSides>(20)
  const [modifier, setModifier] = useState(0)
  const [mode, setMode] = useState<ManualRollMode>("normal")
  const [lastResult, setLastResult] = useState<ManualRollResult | null>(null)

  if (!history) return null

  const expression = formatManualRollExpression({ count, sides, modifier, mode })
  const historyLabel = label.trim() || DEFAULT_MANUAL_ROLL_LABEL
  const historyCount = history.entries.length

  const closeOverlay = () => {
    setOpen(false)
    setView("roll")
  }

  const handleRoll = () => {
    const result = rollManualDice({ count, sides, modifier, mode })
    setLastResult(result)
    history.logRoll({
      kind: "manual",
      label: historyLabel,
      summary: result.summary,
      natural: sides === 20 && count === 1 ? result.rolls[0] : undefined,
    })
  }

  const bumpModifier = (delta: number) => {
    setModifier((current) => clampManualModifier(current + delta))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setView("roll")
          setOpen(true)
        }}
        title="Manual dice roller"
        aria-label="Open manual dice roller"
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-lg border-2 transition-colors",
          SHEET_BANNER_BUTTON.manualRoll,
        )}
      >
        <Dices className="h-5 w-5" aria-hidden />
        {historyCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-black leading-none text-primary-foreground">
            {historyCount > 99 ? "99+" : historyCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 sm:justify-end sm:pt-20 sm:pr-6"
            onClick={closeOverlay}
          >
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className={cn(
                "flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-b from-card via-card to-muted/40 shadow-2xl",
                view === "history" && "max-h-[min(70vh,32rem)]",
              )}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={view === "history" ? "roll-history-title" : "manual-roll-title"}
            >
              {view === "history" ? (
                <>
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setView("roll")}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to roller
                    </button>
                    <div className="flex items-center gap-1">
                      {historyCount > 0 ? (
                        <button
                          type="button"
                          onClick={history.clearHistory}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Clear
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={closeOverlay}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div id="roll-history-title" className="sr-only">
                    Roll History
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <SheetRollHistoryPanel />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/80 px-4 py-3">
                    <div>
                      <h2 id="manual-roll-title" className="text-sm font-black tracking-wide text-foreground">
                        Dice Console
                      </h2>
                      <p className="text-[10px] text-muted-foreground">Pick · Boost · Roll</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeOverlay}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Close manual roller"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="rounded-xl border-2 border-border bg-zinc-950 px-3 py-3 text-center shadow-inner dark:bg-black/70">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500/80">
                        Readout
                      </p>
                      <p className="mt-1 font-mono text-2xl font-black tabular-nums tracking-wider text-emerald-400">
                        {expression}
                      </p>
                      {lastResult ? (
                        <p className="mt-1 font-mono text-sm tabular-nums text-emerald-300/90">
                          → {lastResult.total}
                          <span className="ml-2 text-[11px] text-emerald-500/70">{lastResult.summary}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-emerald-700/80">Awaiting roll…</p>
                      )}
                    </div>

                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder={DEFAULT_MANUAL_ROLL_LABEL}
                      aria-label="Roll label"
                      className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-sm"
                    />

                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Die
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {MANUAL_DIE_SIDES.map((die) => (
                          <button
                            key={die}
                            type="button"
                            onClick={() => setSides(die)}
                            className={cn(
                              "min-h-11 rounded-xl border-2 font-mono text-sm font-black tabular-nums transition-colors",
                              sides === die
                                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                : "border-border bg-background text-foreground hover:border-primary/50",
                            )}
                          >
                            d{die}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-border bg-muted/30 p-2">
                        <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Count
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCount((c) => clampManualDiceCount(c - 1))}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background text-lg font-black hover:border-primary/50"
                            aria-label="Fewer dice"
                          >
                            −
                          </button>
                          <span className="min-w-[2rem] text-center font-mono text-xl font-black tabular-nums">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCount((c) => clampManualDiceCount(c + 1))}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background text-lg font-black hover:border-primary/50"
                            aria-label="More dice"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-2">
                        <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Modifier
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => bumpModifier(-1)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background text-lg font-black hover:border-primary/50"
                            aria-label="Lower modifier"
                          >
                            −
                          </button>
                          <span className="min-w-[2.5rem] text-center font-mono text-xl font-black tabular-nums">
                            {modifier >= 0 ? `+${modifier}` : modifier}
                          </span>
                          <button
                            type="button"
                            onClick={() => bumpModifier(1)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-background text-lg font-black hover:border-primary/50"
                            aria-label="Raise modifier"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Mode
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {MODE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMode(option.value)}
                            className={cn(
                              "min-h-11 rounded-xl border-2 text-xs font-black uppercase tracking-wide transition-colors",
                              mode === option.value
                                ? option.value === "advantage"
                                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                                  : option.value === "disadvantage"
                                    ? "border-rose-500 bg-rose-500/20 text-rose-800 dark:text-rose-200"
                                    : "border-primary bg-primary/15 text-primary"
                                : "border-border bg-background text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRoll}
                      className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-primary bg-primary px-4 py-4 text-base font-black uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98]"
                    >
                      <Dices className="h-5 w-5 transition group-hover:rotate-12" />
                      Roll {expression}
                    </button>

                    <button
                      type="button"
                      onClick={() => setView("history")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border bg-background/80 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
                    >
                      <History className="h-4 w-4 text-muted-foreground" />
                      Roll History
                      {historyCount > 0 ? (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                          {historyCount > 99 ? "99+" : historyCount}
                        </span>
                      ) : null}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

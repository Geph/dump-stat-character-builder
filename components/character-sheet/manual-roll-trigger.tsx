"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Dices, X } from "lucide-react"
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

const MODE_OPTIONS: { value: ManualRollMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "advantage", label: "Advantage" },
  { value: "disadvantage", label: "Disadvantage" },
]

const DEFAULT_MANUAL_ROLL_LABEL = "Manual Roll"

export function ManualRollTrigger() {
  const history = useSheetRollHistory()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [count, setCount] = useState(1)
  const [sides, setSides] = useState<ManualDieSides>(20)
  const [modifier, setModifier] = useState(0)
  const [mode, setMode] = useState<ManualRollMode>("normal")
  const [lastResult, setLastResult] = useState<ManualRollResult | null>(null)

  if (!history) return null

  const expression = formatManualRollExpression({ count, sides, modifier, mode })
  const historyLabel = label.trim() || DEFAULT_MANUAL_ROLL_LABEL

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Manual dice roller"
        aria-label="Open manual dice roller"
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-lg border-2 transition-colors",
          SHEET_BANNER_BUTTON.manualRoll,
        )}
      >
        <Dices className="h-5 w-5" aria-hidden />
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
              className="w-full max-w-sm flex flex-col bg-card border-2 border-border rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="manual-roll-title"
            >
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
                <div>
                  <h2 id="manual-roll-title" className="text-sm font-black text-foreground">
                    Manual Roll
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Custom dice, modifiers, and advantage
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                  aria-label="Close manual roller"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                    Label <span className="font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={DEFAULT_MANUAL_ROLL_LABEL}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                      Dice
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={count}
                      onChange={(e) => setCount(clampManualDiceCount(Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm tabular-nums text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                      Type
                    </label>
                    <select
                      value={sides}
                      onChange={(e) => setSides(Number(e.target.value) as ManualDieSides)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    >
                      {MANUAL_DIE_SIDES.map((die) => (
                        <option key={die} value={die}>
                          d{die}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                    Bonus / penalty
                  </label>
                  <input
                    type="number"
                    min={-999}
                    max={999}
                    value={modifier}
                    onChange={(e) => setModifier(clampManualModifier(Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm tabular-nums text-center"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Use negative numbers for penalties (e.g. −2).
                  </p>
                </div>

                <div>
                  <p className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Roll mode
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MODE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMode(option.value)}
                        className={cn(
                          "rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
                          mode === option.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Expression</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">{expression}</span>
                </div>

                <button
                  type="button"
                  onClick={handleRoll}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/10 px-4 py-3 text-sm font-black text-primary hover:bg-primary/15"
                >
                  <Dices className="h-4 w-4" />
                  Roll {expression}
                </button>

                {lastResult ? (
                  <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 text-center space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Result
                    </p>
                    <p className="text-3xl font-black tabular-nums text-primary">{lastResult.total}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{lastResult.summary}</p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

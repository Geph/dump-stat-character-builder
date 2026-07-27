"use client"

import { motion } from "framer-motion"
import { Flame, Moon, Sun, X } from "lucide-react"
import { ShortRestHitDiceBox } from "@/components/character-sheet/short-rest-hit-dice-box"
import type { HitDicePoolEntry } from "@/lib/character/hit-dice"
import type { RestType } from "@/lib/types"

type SheetRestOverlayProps = {
  rest: RestType
  summary: string[]
  onClose: () => void
  /** Short rest only — spend Hit Dice after the rest (SRD). */
  hitDicePool?: HitDicePoolEntry[]
  conMod?: number
  currentHp?: number
  maxHp?: number
  onHeal?: (amount: number) => void
  onSpendDice?: (classId: string, count: number) => void
}

export function SheetRestOverlay({
  rest,
  summary,
  onClose,
  hitDicePool = [],
  conMod = 0,
  currentHp = 0,
  maxHp = 0,
  onHeal,
  onSpendDice,
}: SheetRestOverlayProps) {
  const isShort = rest === "short_rest"
  const title = isShort ? "Short Rest" : "Long Rest"
  const showHitDice =
    isShort && hitDicePool.length > 0 && onHeal && onSpendDice && currentHp < maxHp

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-rest-title"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="relative w-full max-w-md rounded-xl border-2 border-primary/40 bg-card p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-center gap-2 pr-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            {isShort ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </span>
          <div>
            <p id="sheet-rest-title" className="text-base font-black text-foreground">
              {title} complete
            </p>
            <p className="text-xs text-muted-foreground">
              {isShort
                ? "Short-rest resources and pact slots recharge."
                : "HP, spell slots, and long-rest resources restore."}
            </p>
          </div>
        </div>

        <ul className="mb-4 space-y-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          {summary.map((line, index) => (
            <li key={`${index}-${line}`} className="text-sm text-foreground">
              {line}
            </li>
          ))}
        </ul>

        {showHitDice ? (
          <div className="mb-4 space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              Spend Hit Dice
            </p>
            <p className="text-[11px] text-muted-foreground">
              At the end of a Short Rest you may spend Hit Dice to regain hit points (roll the die +
              your Constitution modifier per die).
            </p>
            <ShortRestHitDiceBox
              pool={hitDicePool}
              conMod={conMod}
              currentHp={currentHp}
              maxHp={maxHp}
              onHeal={onHeal}
              onSpendDice={onSpendDice}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Flame className="h-4 w-4" />
          Done
        </button>
      </motion.div>
    </motion.div>
  )
}

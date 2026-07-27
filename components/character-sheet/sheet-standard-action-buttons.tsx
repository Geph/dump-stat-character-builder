"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import {
  DEFAULT_SHEET_ACTIONS,
  type DefaultSheetAction,
} from "@/lib/character/default-actions"
import type { ActionEconomyKind } from "@/lib/character/sheet-actions"
import { cn } from "@/lib/utils"

const COMBAT_STANDARD_ACTIONS = DEFAULT_SHEET_ACTIONS.filter(
  (action) => action.category === "combat",
)

type SheetStandardActionButtonsProps = {
  onUse: (kind: ActionEconomyKind, action: DefaultSheetAction) => void
  disabled?: boolean
}

export function SheetStandardActionButtons({
  onUse,
  disabled = false,
}: SheetStandardActionButtonsProps) {
  const [detail, setDetail] = useState<DefaultSheetAction | null>(null)

  return (
    <>
      <div className="mb-3">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Standard
        </p>
        <div className="flex flex-wrap gap-1.5">
          {COMBAT_STANDARD_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={disabled}
              title={action.description}
              onClick={() => {
                onUse("action", action)
                setDetail(action)
              }}
              className={cn(
                "rounded-md border border-border/80 bg-muted/30 px-2 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              {action.name}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {detail ? (
          <motion.div
            key="standard-action-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative w-full max-w-md rounded-2xl border-2 border-border bg-card p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="pr-8 text-base font-black text-foreground">{detail.name}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                Action used
              </p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {detail.description}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

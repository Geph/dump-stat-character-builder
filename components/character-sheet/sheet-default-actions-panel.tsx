"use client"

import { motion } from "framer-motion"
import { BookOpen, X } from "lucide-react"
import {
  DEFAULT_ACTION_CATEGORY_LABELS,
  defaultActionsByCategory,
  type DefaultActionCategory,
} from "@/lib/character/default-actions"

type DefaultActionsButtonProps = {
  onClick: () => void
  /** Compact icon+label for combat header; full-width for ability scores footer. */
  variant?: "compact" | "footer"
}

export function DefaultActionsButton({ onClick, variant = "compact" }: DefaultActionsButtonProps) {
  if (variant === "footer") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        Standard Actions
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/60 transition-colors shrink-0"
      title="2024 standard actions reference"
    >
      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
      Standard Actions
    </button>
  )
}

type DefaultActionsOverlayProps = {
  onClose: () => void
  /** Abilities tab: other actions first; combat tab: combat actions first. */
  context: "abilities" | "combat"
}

const CATEGORY_ORDER_BY_CONTEXT: Record<
  DefaultActionsOverlayProps["context"],
  DefaultActionCategory[]
> = {
  abilities: ["other", "combat"],
  combat: ["combat", "other"],
}

export function DefaultActionsOverlay({ onClose, context }: DefaultActionsOverlayProps) {
  const grouped = defaultActionsByCategory()
  const categoryOrder = CATEGORY_ORDER_BY_CONTEXT[context]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-card border-2 border-border rounded-2xl shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 p-4 border-b border-border bg-card/95 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-black text-foreground">Standard Actions</h2>
            <p className="text-sm text-muted-foreground">
              2024 rules — one action per turn unless noted
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {categoryOrder.map((category) => {
            const actions = grouped[category]
            if (!actions.length) return null
            return (
              <section key={category}>
                <h3 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  {DEFAULT_ACTION_CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-2">
                  {actions.map((action) => (
                    <div
                      key={action.id}
                      className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5"
                    >
                      <p className="text-sm font-semibold text-foreground">{action.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

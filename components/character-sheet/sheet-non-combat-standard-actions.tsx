"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, X } from "lucide-react"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { nonCombatStandardActions, type DefaultSheetAction } from "@/lib/character/default-actions"
import { cn } from "@/lib/utils"

export function SheetNonCombatStandardActions() {
  const [detail, setDetail] = useState<DefaultSheetAction | null>(null)
  const [expanded, setExpanded] = useState(true)
  const actions = nonCombatStandardActions()

  return (
    <>
      <div>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
          className="mb-1.5 inline-flex items-center gap-1 rounded-lg px-0.5 py-0.5 text-left transition-colors hover:bg-muted/40"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Standard
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="non-combat-standard-actions"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="grid w-full grid-cols-4 gap-1.5 pt-0.5 sm:grid-cols-7">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    title={action.description}
                    onClick={() => setDetail(action)}
                    className="flex min-h-11 w-full items-center justify-center rounded-md border border-border/80 bg-muted/30 px-1.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                  >
                    {action.name}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {detail ? (
          <motion.div
            key="non-combat-standard-detail"
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
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Standard action
              </p>
              <RichTextContent
                html={detail.description}
                className="mt-2 text-sm leading-relaxed text-muted-foreground [&_p]:mb-0"
                fallback=""
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

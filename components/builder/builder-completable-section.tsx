"use client"

import { useEffect, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type BuilderCompletableSectionProps = {
  id?: string
  title: string
  description?: ReactNode
  /** When true, the section may collapse. Incomplete sections stay open. */
  complete: boolean
  /**
   * `auto` — collapse as soon as complete.
   * `confirm` — stay open until the user hits Done (or the header chevron).
   */
  collapseMode?: "auto" | "confirm"
  /** Shown in the header while collapsed when there is no pinned selection preview. */
  summary?: ReactNode
  /**
   * Kept in view after the section is complete (and while collapsed), e.g. the selected
   * class/species/background card. Hidden again if the section becomes incomplete.
   */
  pinnedWhenComplete?: ReactNode
  /** Label for the confirm-collapse action button. */
  doneLabel?: string
  headingLevel?: 2 | 3
  className?: string
  children: ReactNode
}

/**
 * Builder step subsection that collapses when complete so the next block is easier to reach.
 * Incomplete sections cannot be collapsed; completed ones can be re-expanded to edit.
 */
export function BuilderCompletableSection({
  id,
  title,
  description,
  complete,
  collapseMode = "auto",
  summary,
  pinnedWhenComplete,
  doneLabel = "Done",
  headingLevel = 2,
  className,
  children,
}: BuilderCompletableSectionProps) {
  const [expanded, setExpanded] = useState(!complete)
  const confirmCollapse = collapseMode === "confirm"

  useEffect(() => {
    if (!complete) {
      setExpanded(true)
      return
    }
    if (!confirmCollapse) {
      setExpanded(false)
    }
  }, [complete, confirmCollapse])

  const canToggle = complete
  const HeadingTag = headingLevel === 3 ? "h3" : "h2"
  const titleClass =
    headingLevel === 3
      ? "text-lg font-bold text-foreground"
      : "text-2xl font-black text-foreground"
  const showPinned = complete && !expanded && pinnedWhenComplete != null
  const showTextSummary = !expanded && !showPinned && summary != null

  return (
    <section id={id} className={cn("min-w-0", className)}>
      <button
        type="button"
        aria-expanded={expanded}
        disabled={!canToggle}
        onClick={() => {
          if (!canToggle) return
          setExpanded((prev) => !prev)
        }}
        className={cn(
          "group flex w-full items-start gap-3 rounded-xl text-left outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring/50",
          canToggle
            ? "cursor-pointer hover:bg-muted/30 -mx-2 px-2 py-1.5"
            : "cursor-default py-0.5",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <HeadingTag className={titleClass}>{title}</HeadingTag>
            {complete ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
                <Check className="h-3 w-3" aria-hidden />
                Done
              </span>
            ) : null}
          </div>
          {expanded && description ? (
            <div className="mt-1 text-sm text-muted-foreground">{description}</div>
          ) : null}
          {showTextSummary ? (
            <div className="mt-1 whitespace-pre-line text-sm font-medium text-foreground/90">
              {summary}
            </div>
          ) : null}
        </div>
        {canToggle ? (
          <span
            className={cn(
              "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              "border border-border bg-muted/50 text-foreground",
              "transition-colors group-hover:border-foreground/30 group-hover:bg-muted",
            )}
            aria-hidden
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </span>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="section-picker"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showPinned ? <div className="pt-2">{pinnedWhenComplete}</div> : null}

      {expanded && confirmCollapse && complete ? (
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Check className="h-4 w-4" aria-hidden />
            {doneLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}

"use client"

import type { ReactNode } from "react"
import type { ImportStage } from "@/lib/import/import-staging"
import {
  pageOverlayPanelClass,
  pageOverlayPanelHintClass,
  pageOverlayPanelTitleClass,
} from "@/lib/compendium/editor-field-styles"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Layers } from "lucide-react"

export type ImportReviewPhase = "content" | "modifiers"

type ImportStagingPanelProps = {
  stages: ImportStage[]
  summary: string
  activeIndex: number
  phase: ImportReviewPhase
  hasModifiers: boolean
  onPrevious: () => void
  onNext: () => void
  canPrevious: boolean
  canNext: boolean
  /** Content review / collisions / card art for the active stage. */
  contentChildren: ReactNode
  /** Modifier wiring for the active stage (shown on the modifiers phase). */
  modifiersChildren?: ReactNode
}

export function ImportStagingPanel({
  stages,
  summary,
  activeIndex,
  phase,
  hasModifiers,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
  contentChildren,
  modifiersChildren,
}: ImportStagingPanelProps) {
  if (!stages.length) return null

  const safeIndex = Math.min(Math.max(activeIndex, 0), stages.length - 1)
  const stage = stages[safeIndex]
  const phaseLabel = phase === "content" ? "Parsed content" : "Modifier wiring"
  const showPhaseToggle = hasModifiers

  return (
    <div className={cn(pageOverlayPanelClass, "space-y-4 p-4 text-sm")}>
      <div className="flex items-start gap-2">
        <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className={pageOverlayPanelTitleClass}>Staged import</p>
            <p className="text-xs font-medium text-muted-foreground">
              Stage {safeIndex + 1} of {stages.length}
              {showPhaseToggle ? (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  {phaseLabel}
                </>
              ) : null}
            </p>
          </div>
          <p className={pageOverlayPanelHintClass}>{summary}</p>
        </div>
      </div>

      {stages.length > 1 ? (
        <div
          className="flex items-center justify-center gap-1.5"
          role="tablist"
          aria-label="Import stages"
        >
          {stages.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={index === safeIndex}
              aria-label={`Stage ${index + 1}: ${entry.label}`}
              disabled
              className={cn(
                "h-2 rounded-full transition-all",
                index === safeIndex ? "w-6 bg-primary" : "w-2 bg-border",
              )}
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="font-medium text-foreground">
          {stage.label}{" "}
          <span className="font-normal text-muted-foreground">({stage.total})</span>
        </p>
        <p className="text-xs text-muted-foreground">{stage.description}</p>
      </div>

      {showPhaseToggle ? (
        <div
          className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1"
          role="tablist"
          aria-label="Review phase"
        >
          <span
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center text-xs font-semibold",
              phase === "content"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            1. Content
          </span>
          <span
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center text-xs font-semibold",
              phase === "modifiers"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            2. Modifiers
          </span>
        </div>
      ) : null}

      <div className="space-y-4">
        {phase === "content" ? contentChildren : modifiersChildren}
      </div>

      {canPrevious || canNext ? (
        <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-3">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canPrevious}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Previous
          </button>
          <p className="text-[11px] text-muted-foreground">
            {phase === "content" && hasModifiers
              ? "Next: review modifier wiring"
              : canNext
                ? "Next: continue staged review"
                : "Confirm below when ready"}
          </p>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  )
}

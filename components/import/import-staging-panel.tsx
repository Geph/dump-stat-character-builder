"use client"

import type { ImportStage } from "@/lib/import/import-staging"
import {
  pageOverlayPanelClass,
  pageOverlayPanelHintClass,
  pageOverlayPanelTitleClass,
} from "@/lib/compendium/editor-field-styles"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Layers } from "lucide-react"

type ImportStagingPanelProps = {
  stages: ImportStage[]
  summary: string
  activeIndex: number
  onActiveIndexChange: (index: number) => void
}

export function ImportStagingPanel({
  stages,
  summary,
  activeIndex,
  onActiveIndexChange,
}: ImportStagingPanelProps) {
  if (!stages.length) return null

  const safeIndex = Math.min(Math.max(activeIndex, 0), stages.length - 1)
  const stage = stages[safeIndex]
  const isFirst = safeIndex === 0
  const isLast = safeIndex === stages.length - 1

  return (
    <div className={cn(pageOverlayPanelClass, "space-y-3 p-4 text-sm")}>
      <div className="flex items-start gap-2">
        <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className={pageOverlayPanelTitleClass}>Staged import</p>
            <p className="text-xs font-medium text-muted-foreground">
              Step {safeIndex + 1} of {stages.length}
            </p>
          </div>
          <p className={pageOverlayPanelHintClass}>{summary}</p>
        </div>
      </div>

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
            aria-label={`Step ${index + 1}: ${entry.label}`}
            onClick={() => onActiveIndexChange(index)}
            className={cn(
              "h-2 rounded-full transition-all",
              index === safeIndex
                ? "w-6 bg-primary"
                : "w-2 bg-border hover:bg-muted-foreground/40",
            )}
          />
        ))}
      </div>

      <div className="rounded-lg border border-border bg-background/60 px-3 py-3">
        <div className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {safeIndex + 1}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {stage.label}{" "}
              <span className="font-normal text-muted-foreground">({stage.total})</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stage.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onActiveIndexChange(safeIndex - 1)}
          disabled={isFirst}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Previous
        </button>
        <button
          type="button"
          onClick={() => onActiveIndexChange(safeIndex + 1)}
          disabled={isLast}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

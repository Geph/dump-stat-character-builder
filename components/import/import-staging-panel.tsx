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

export type ImportReviewPhase = "conflicts" | "content" | "card-art" | "modifiers"

type ImportStagingPanelProps = {
  stages: ImportStage[]
  summary: string
  activeIndex: number
  phase: ImportReviewPhase
  hasConflicts: boolean
  hasCardArt: boolean
  hasModifiers: boolean
  onNext: () => void
  canNext: boolean
  onBack?: () => void
  canBack?: boolean
  /** When false, hide the footer Next control (e.g. deferred to last-source row). */
  showNextInFooter?: boolean
  /** Right-side footer actions when Next is hidden (e.g. Confirm / Cancel on the last step). */
  footerEnd?: ReactNode
  /** Name-collision review (first step when this stage has conflicts). */
  conflictsChildren?: ReactNode
  /** Parsed content for the active stage. */
  contentChildren: ReactNode
  /** Optional card-art review (Graphic mode only). */
  cardArtChildren?: ReactNode
  /** Modifier wiring for the active stage (shown on the modifiers phase). */
  modifiersChildren?: ReactNode
}

export function ImportStagingPanel({
  stages,
  summary,
  activeIndex,
  phase,
  hasConflicts,
  hasCardArt,
  hasModifiers,
  onNext,
  canNext,
  onBack,
  canBack = false,
  showNextInFooter = true,
  footerEnd,
  conflictsChildren,
  contentChildren,
  cardArtChildren,
  modifiersChildren,
}: ImportStagingPanelProps) {
  if (!stages.length) return null

  const safeIndex = Math.min(Math.max(activeIndex, 0), stages.length - 1)
  const stage = stages[safeIndex]
  const phaseTabs = [
    ...(hasConflicts ? [{ id: "conflicts" as const, label: "Name conflicts" }] : []),
    { id: "content" as const, label: "Content" },
    ...(hasCardArt ? [{ id: "card-art" as const, label: "Card art" }] : []),
    ...(hasModifiers ? [{ id: "modifiers" as const, label: "Modifiers" }] : []),
  ]
  const phaseLabel =
    phase === "conflicts"
      ? "name conflicts"
      : phase === "content"
        ? "Parsed content"
        : phase === "card-art"
          ? "Card art"
          : "modifier wiring"
  const showPhaseToggle = phaseTabs.length > 1
  const showFooterNext = canNext && showNextInFooter
  const showFooter = canBack || showFooterNext || Boolean(footerEnd)
  const nextLabel =
    phase === "conflicts"
      ? "Next: review content"
      : phase === "content" && hasCardArt
        ? "Next: review card art"
        : phase !== "modifiers" && hasModifiers
          ? "Next: review modifier wiring"
          : "Next stage"
  const backLabel =
    phase === "modifiers"
      ? hasCardArt
        ? "Back: card art"
        : "Back: content"
      : phase === "card-art"
        ? "Back: content"
        : phase === "content" && hasConflicts
          ? "Back: name conflicts"
          : "Previous stage"

  const phaseBody =
    phase === "conflicts"
      ? conflictsChildren
      : phase === "content"
        ? contentChildren
        : phase === "card-art"
          ? cardArtChildren
          : modifiersChildren

  return (
    <div className={cn(pageOverlayPanelClass, "w-full space-y-4 p-4 text-sm")}>
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
          {phaseTabs.map((tab, index) => (
            <span
              key={tab.id}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-center text-xs font-semibold",
                phase === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {index + 1}. {tab.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">{phaseBody}</div>

      {showFooter ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {canBack && onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                {backLabel}
              </button>
            ) : null}
          </div>
          {showFooterNext ? (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-colors hover:bg-primary/90"
            >
              {nextLabel}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : footerEnd ? (
            <div className="flex flex-wrap items-center justify-end gap-2">{footerEnd}</div>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  )
}

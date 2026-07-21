"use client"

import { useEffect, useMemo, useState } from "react"
import { ModifierWiringRegistryCoverageLine } from "@/components/import/modifier-wiring-registry-coverage-line"
import type { ImportModifierReviewRow } from "@/lib/import/import-modifier-previews"
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Link2, Sparkles, X } from "lucide-react"

type ImportModifierReviewPanelProps = {
  rows: ImportModifierReviewRow[]
  onRemoveModifier?: (previewId: string) => void
  variant?: "review" | "report"
  /** Nested inside Staged import — omit the outer bordered shell. */
  embedded?: boolean
}

const CONFIDENCE_STYLES = {
  high: "border-success/30 bg-success/10 text-success",
  medium: "border-primary/30 bg-primary/10 text-primary",
  low: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
} as const

const SOURCE_LABELS = {
  ai: "AI",
  detector: "Phrase match",
  foundry_effect: "Foundry Active Effect",
} as const

type SourceGroup = [string, ImportModifierReviewRow[]]

function isPagedSourceLabel(sourceLabel: string): boolean {
  return sourceLabel.startsWith("Subclass: ") || sourceLabel.startsWith("Species: ")
}

function SourceGroupCard({
  sourceLabel,
  items,
  onRemoveModifier,
}: {
  sourceLabel: string
  items: ImportModifierReviewRow[]
  onRemoveModifier?: (previewId: string) => void
}) {
  return (
    <li className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {sourceLabel}
      </p>
      <ul className="space-y-2">
        {items.map((row) => (
          <li
            key={row.id}
            className={`rounded-lg border px-3 py-2 ${
              row.status === "wired"
                ? "border-success/25 bg-success/5"
                : row.status === "structural"
                  ? "border-border/70 bg-muted/20"
                  : "border-destructive/35 bg-destructive/5"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {row.status === "wired" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              ) : row.status === "structural" ? (
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span className="font-medium text-foreground">
                {row.featureName}
                {row.featureLevel != null ? (
                  <span className="ml-1 text-muted-foreground">· L{row.featureLevel}</span>
                ) : null}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  row.status === "wired"
                    ? "bg-success/15 text-success"
                    : row.status === "structural"
                      ? "bg-muted text-muted-foreground"
                      : "bg-destructive/15 text-destructive"
                }`}
              >
                {row.status === "wired"
                  ? "Wired"
                  : row.status === "structural"
                    ? "Structural"
                    : "Not wired"}
              </span>
            </div>

            {row.modifiers.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {row.modifiers.map((entry) => (
                  <li key={entry.id}>
                    <div
                      className={`inline-flex max-w-full items-start gap-1 rounded-full border px-2.5 py-1 text-xs ${CONFIDENCE_STYLES[entry.confidence]}`}
                      title={entry.matchedPhrase}
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{entry.summary}</span>
                        <span className="ml-1 opacity-80">
                          · {SOURCE_LABELS[entry.source]} · {entry.confidence}
                        </span>
                      </span>
                      {entry.source === "ai" ? (
                        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      ) : null}
                      {onRemoveModifier ? (
                        <button
                          type="button"
                          aria-label={`Remove ${entry.summary} from ${entry.featureName}`}
                          className="rounded-full p-0.5 hover:bg-background/60"
                          onClick={() => onRemoveModifier(entry.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 max-w-md truncate text-[10px] text-muted-foreground">
                      {entry.matchedPhrase}
                    </p>
                  </li>
                ))}
              </ul>
            ) : row.status === "wired" ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Wired via choices / structured ability data (no separate common-modifier chips).
              </p>
            ) : row.status === "structural" ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {row.note ??
                  "Structural / narrative — no common modifiers expected."}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-destructive/90">
                No common modifier linked — add effects in the compendium editor after import.
              </p>
            )}
          </li>
        ))}
      </ul>
    </li>
  )
}

export function ImportModifierReviewPanel({
  rows,
  onRemoveModifier,
  variant = "review",
  embedded = false,
}: ImportModifierReviewPanelProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, ImportModifierReviewRow[]>()
    for (const row of rows) {
      const list = map.get(row.sourceLabel) ?? []
      list.push(row)
      map.set(row.sourceLabel, list)
    }
    return [...map.entries()] as SourceGroup[]
  }, [rows])

  const { pagedGroups, otherGroups } = useMemo(() => {
    const paged: SourceGroup[] = []
    const other: SourceGroup[] = []
    for (const group of grouped) {
      if (isPagedSourceLabel(group[0])) paged.push(group)
      else other.push(group)
    }
    return { pagedGroups: paged, otherGroups: other }
  }, [grouped])

  const pageOneAtATime = pagedGroups.length > 1
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex((current) =>
      pagedGroups.length === 0 ? 0 : Math.min(current, pagedGroups.length - 1),
    )
  }, [pagedGroups.length])

  const activePagedGroup = pageOneAtATime ? pagedGroups[pageIndex] ?? null : null
  const wiredCount = rows.filter((row) => row.status === "wired").length
  const structuralCount = rows.filter((row) => row.status === "structural").length
  const unwiredCount = rows.filter((row) => row.status === "unwired").length

  const shellClass = embedded
    ? "space-y-4 text-sm"
    : "space-y-4 rounded-xl border border-border bg-background/80 p-4 text-sm"

  return (
    <section className={shellClass}>
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Modifier wiring review</p>
          <p className="mt-1 text-muted-foreground">
            {variant === "review"
              ? "Auto-wiring runs on import; finish any “Not wired” rows in the compendium editor (modifier effects on each feature), then save."
              : "Summary of modifier auto-wiring from this import."}
          </p>
          {rows.length > 0 ? (
            <p className="mt-2 text-xs">
              <span className="font-medium text-success">{wiredCount} wired</span>
              {structuralCount > 0 ? (
                <>
                  <span className="text-muted-foreground"> · </span>
                  <span className="font-medium text-muted-foreground">
                    {structuralCount} structural
                  </span>
                </>
              ) : null}
              <span className="text-muted-foreground"> · </span>
              <span className={`font-medium ${unwiredCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {unwiredCount} not wired
              </span>
              {pageOneAtATime ? (
                <>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-muted-foreground">
                    Reviewing {pagedGroups.length} subclasses/species one at a time
                  </span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No class, subclass, species, feat, or background features in this import. Spell and
              equipment previews appear above when present.
            </p>
          )}
          <ModifierWiringRegistryCoverageLine className="mt-2" />
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="space-y-3">
          {otherGroups.length > 0 ? (
            <ul className="space-y-3">
              {otherGroups.map(([sourceLabel, items]) => (
                <SourceGroupCard
                  key={sourceLabel}
                  sourceLabel={sourceLabel}
                  items={items}
                  onRemoveModifier={onRemoveModifier}
                />
              ))}
            </ul>
          ) : null}

          {pageOneAtATime && activePagedGroup ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {pageIndex + 1} of {pagedGroups.length}
                  </span>
                  <span className="mx-1.5">·</span>
                  {activePagedGroup[0]}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={pageIndex <= 0}
                    onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pageIndex >= pagedGroups.length - 1}
                    onClick={() =>
                      setPageIndex((index) => Math.min(pagedGroups.length - 1, index + 1))
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
              <ul className="space-y-3">
                <SourceGroupCard
                  sourceLabel={activePagedGroup[0]}
                  items={activePagedGroup[1]}
                  onRemoveModifier={onRemoveModifier}
                />
              </ul>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Subclass or species">
                {pagedGroups.map(([label], index) => {
                  const short =
                    label.replace(/^Subclass:\s*/i, "").replace(/^Species:\s*/i, "") || label
                  const active = index === pageIndex
                  return (
                    <button
                      key={label}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      title={label}
                      onClick={() => setPageIndex(index)}
                      className={`max-w-[12rem] truncate rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {short}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : pagedGroups.length === 1 ? (
            <ul className="space-y-3">
              <SourceGroupCard
                sourceLabel={pagedGroups[0]![0]}
                items={pagedGroups[0]![1]}
                onRemoveModifier={onRemoveModifier}
              />
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

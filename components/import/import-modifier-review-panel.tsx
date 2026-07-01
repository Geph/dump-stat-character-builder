"use client"

import { useMemo } from "react"
import { ModifierWiringRegistryCoverageLine } from "@/components/import/modifier-wiring-registry-coverage-line"
import type { ImportModifierReviewRow } from "@/lib/import/import-modifier-previews"
import { AlertTriangle, CheckCircle2, Link2, Sparkles, X } from "lucide-react"

type ImportModifierReviewPanelProps = {
  rows: ImportModifierReviewRow[]
  onRemoveModifier?: (previewId: string) => void
  variant?: "review" | "report"
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

export function ImportModifierReviewPanel({
  rows,
  onRemoveModifier,
  variant = "review",
}: ImportModifierReviewPanelProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, ImportModifierReviewRow[]>()
    for (const row of rows) {
      const list = map.get(row.sourceLabel) ?? []
      list.push(row)
      map.set(row.sourceLabel, list)
    }
    return [...map.entries()]
  }, [rows])

  const wiredCount = rows.filter((row) => row.status === "wired").length
  const unwiredCount = rows.length - wiredCount

  return (
    <section className="space-y-4 rounded-xl border border-border bg-background/80 p-4 text-sm">
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Modifier wiring review</p>
          <p className="mt-1 text-muted-foreground">
            {variant === "review"
              ? "Auto-wiring runs on import; finish any “Not wired” rows in the compendium editor (Modifier effects on each feature), then save."
              : "Summary of modifier auto-wiring from this import."}
          </p>
          {rows.length > 0 ? (
            <p className="mt-2 text-xs">
              <span className="font-medium text-success">{wiredCount} wired</span>
              <span className="text-muted-foreground"> · </span>
              <span className={`font-medium ${unwiredCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {unwiredCount} not wired
              </span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No class, subclass, species, or feat features in this import.</p>
          )}
          <ModifierWiringRegistryCoverageLine className="mt-2" />
        </div>
      </div>

      {rows.length > 0 ? (
      <ul className="space-y-3">
        {grouped.map(([sourceLabel, items]) => (
          <li key={sourceLabel} className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2">
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
                      : "border-destructive/35 bg-destructive/5"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {row.status === "wired" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
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
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {row.status === "wired" ? "Wired" : "Not wired"}
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
                  ) : (
                    <p className="mt-1.5 text-xs text-destructive/90">
                      No common modifier linked — add effects in the compendium editor after import.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      ) : null}
    </section>
  )
}

"use client"

import { useMemo } from "react"
import type { ImportUnmatchedFeatureEntry } from "@/lib/import/import-modifier-previews"
import { AlertTriangle } from "lucide-react"

type ImportUnmatchedFeaturesPanelProps = {
  entries: ImportUnmatchedFeatureEntry[]
  variant?: "review" | "report"
}

export function ImportUnmatchedFeaturesPanel({
  entries,
  variant = "review",
}: ImportUnmatchedFeaturesPanelProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, ImportUnmatchedFeatureEntry[]>()
    for (const entry of entries) {
      const list = map.get(entry.sourceLabel) ?? []
      list.push(entry)
      map.set(entry.sourceLabel, list)
    }
    return [...map.entries()]
  }, [entries])

  if (!entries.length) return null

  return (
    <section
      className={`space-y-3 rounded-xl border p-4 text-sm ${
        variant === "report"
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-amber-500/25 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-foreground">
            No modifier match ({entries.length} feature{entries.length === 1 ? "" : "s"})
          </p>
          <p className="mt-1 text-muted-foreground">
            {variant === "review"
              ? "These features have description text only — no common modifier was inferred. They will import as text until you wire modifiers in the compendium editor."
              : "These imported features remain text-only. Open them in the compendium to add modifier links if needed."}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {grouped.map(([sourceLabel, items]) => (
          <li key={sourceLabel} className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {sourceLabel}
            </p>
            <ul className="mt-1.5 space-y-0.5 text-sm text-foreground">
              {items.map((entry) => (
                <li key={entry.id}>
                  {entry.featureName}
                  {entry.featureLevel != null ? (
                    <span className="text-muted-foreground"> · level {entry.featureLevel}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}

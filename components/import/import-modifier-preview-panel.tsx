"use client"

import { useMemo } from "react"
import type { ImportModifierPreviewEntry } from "@/lib/import/import-modifier-previews"
import { Link2, Sparkles, X } from "lucide-react"

type ImportModifierPreviewPanelProps = {
  previews: ImportModifierPreviewEntry[]
  onRemove: (previewId: string) => void
}

const CONFIDENCE_STYLES = {
  high: "border-success/30 bg-success/10 text-success",
  medium: "border-primary/30 bg-primary/10 text-primary",
  low: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
} as const

const SOURCE_LABELS = {
  ai: "AI",
  detector: "Phrase match",
} as const

export function ImportModifierPreviewPanel({
  previews,
  onRemove,
}: ImportModifierPreviewPanelProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, ImportModifierPreviewEntry[]>()
    for (const preview of previews) {
      const key = `${preview.sourceLabel} · ${preview.featureName}${
        preview.featureLevel != null ? ` (L${preview.featureLevel})` : ""
      }`
      const list = map.get(key) ?? []
      list.push(preview)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [previews])

  if (!previews.length) return null

  return (
    <section className="space-y-3 rounded-xl border border-border bg-background/80 p-4 text-sm">
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-foreground">Auto-wired modifiers ({previews.length})</p>
          <p className="mt-1 text-muted-foreground">
            These common modifiers were inferred from feature text. Remove any that look wrong before
            importing.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {grouped.map(([heading, entries]) => (
          <li key={heading} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {heading}
            </p>
            <ul className="flex flex-wrap gap-2">
              {entries.map((entry) => (
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
                    <button
                      type="button"
                      aria-label={`Remove ${entry.summary} from ${entry.featureName}`}
                      className="rounded-full p-0.5 hover:bg-background/60"
                      onClick={() => onRemove(entry.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="mt-1 max-w-md truncate text-[10px] text-muted-foreground">
                    {entry.matchedPhrase}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}

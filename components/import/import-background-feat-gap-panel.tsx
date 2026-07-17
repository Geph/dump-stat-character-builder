"use client"

import type { BackgroundFeatGrantGap } from "@/lib/import/collect-missing-background-feat-grants"
import { AlertTriangle } from "lucide-react"

type ImportBackgroundFeatGapPanelProps = {
  gaps: BackgroundFeatGrantGap[]
  onKeepAsNarrative: () => void
  onCancelImport: () => void
}

function gapDetail(gap: BackgroundFeatGrantGap): string {
  const parts: string[] = []
  if (gap.missingFeatNames.length) {
    parts.push(
      `feat${gap.missingFeatNames.length === 1 ? "" : "s"} ${gap.missingFeatNames.join(", ")}`,
    )
  }
  if (gap.missingCategory) {
    parts.push(`no ${gap.missingCategory} feats in your library yet`)
  }
  return parts.join("; ")
}

/**
 * Review gate for background feat grants whose dependent feats are not in the batch or
 * library — the player-facing pick would be empty or unresolvable. The user either
 * cancels (to import those feats first) or downgrades the grants to narrative text.
 */
export function ImportBackgroundFeatGapPanel({
  gaps,
  onKeepAsNarrative,
  onCancelImport,
}: ImportBackgroundFeatGapPanelProps) {
  if (!gaps.length) return null

  return (
    <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-foreground">Background feat grants need feats you have not imported</p>
          <p className="mt-1 text-muted-foreground">
            These backgrounds grant feats that are not in this batch or your library. Cancel and
            import those feats first (recommended), or keep the grant as narrative text — the
            wording stays on the background feature, but the builder will not offer a feat pick.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {gaps.map((gap) => (
          <li
            key={gap.backgroundName}
            className="rounded-lg border border-border/90 bg-card/88 backdrop-blur-sm p-3"
          >
            <p className="font-medium text-foreground">{gap.backgroundName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              “{gap.grantText}” — missing {gapDetail(gap)}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={onCancelImport}
          className="px-4 py-2 rounded-xl border border-border bg-card font-semibold text-foreground hover:border-primary/50 transition-colors"
        >
          Cancel — import the feats first
        </button>
        <button
          type="button"
          onClick={onKeepAsNarrative}
          className="px-4 py-2 rounded-xl bg-amber-600/90 text-white font-semibold hover:bg-amber-600 transition-colors"
        >
          Keep as narrative text
        </button>
      </div>
    </div>
  )
}

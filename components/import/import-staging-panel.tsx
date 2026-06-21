"use client"

import type { ImportStage } from "@/lib/import/import-staging"
import { Layers } from "lucide-react"

type ImportStagingPanelProps = {
  stages: ImportStage[]
  summary: string
}

export function ImportStagingPanel({ stages, summary }: ImportStagingPanelProps) {
  if (!stages.length) return null

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4 text-sm">
      <div className="flex items-start gap-2">
        <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-foreground">Staged import</p>
          <p className="mt-1 text-muted-foreground">{summary}</p>
        </div>
      </div>

      <ol className="space-y-2 pl-1">
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            className="flex gap-3 rounded-lg border border-border bg-background/60 px-3 py-2"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {stage.label}{" "}
                <span className="text-muted-foreground font-normal">({stage.total})</span>
              </p>
              <p className="text-xs text-muted-foreground">{stage.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

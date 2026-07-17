import { Info } from "lucide-react"
import type { FoundryManifestInfo } from "@/lib/import/foundry-types"

type FoundrySkippedPayload = {
  sourceLabel?: string
  skipped?: { reason: string; count: number; examples: string[] }[]
  review?: { label: string; detail: string; documentName?: string }[]
}

type Props = {
  manifest?: FoundryManifestInfo | null
  skippedPayload?: FoundrySkippedPayload | null
}

export function FoundryImportGuidancePanel({ manifest, skippedPayload }: Props) {
  if (!manifest && !skippedPayload) return null

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm space-y-3">
      <div className="flex items-start gap-2 font-medium text-amber-100">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>Foundry VTT import guidance</span>
      </div>

      {manifest ? (
        <>
          <p>
            Detected a Foundry {manifest.kind} manifest (<strong>{manifest.title}</strong>) with{" "}
            {manifest.packs.length} compendium pack{manifest.packs.length === 1 ? "" : "s"}. Item
            or NPC Actor JSON exports are required — manifests cannot be imported directly.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {manifest.guidance.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {manifest.packs.length > 0 ? (
            <div className="text-xs text-muted-foreground">
              Packs:{" "}
              {manifest.packs
                .slice(0, 8)
                .map((pack) => `${pack.label} (${pack.type})`)
                .join(" · ")}
              {manifest.packs.length > 8 ? ` · +${manifest.packs.length - 8} more` : ""}
            </div>
          ) : null}
        </>
      ) : null}

      {skippedPayload?.skipped?.length ? (
        <div className="space-y-2">
          {skippedPayload.skipped.map((entry) => (
            <p key={entry.reason}>
              <strong>{entry.reason}</strong> ({entry.count})
              {entry.examples.length ? `: ${entry.examples.join(", ")}` : ""}
            </p>
          ))}
        </div>
      ) : null}

      {skippedPayload?.review?.length ? (
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          {skippedPayload.review.slice(0, 6).map((entry) => (
            <li key={`${entry.label}-${entry.detail}`}>
              {entry.label}: {entry.detail}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

"use client"

import type {
  ImportCollision,
  ImportCollisionResolution,
  ImportCollisionResolutionMap,
  ImportRenameMap,
} from "@/lib/import/import-collisions"
import { AlertTriangle } from "lucide-react"

type ImportCollisionPanelProps = {
  collisions: ImportCollision[]
  value: ImportRenameMap
  onChange: (map: ImportRenameMap) => void
  resolutionMap: ImportCollisionResolutionMap
  onResolutionChange: (map: ImportCollisionResolutionMap) => void
}

const KIND_LABELS: Record<ImportCollision["kind"], string> = {
  class: "Class",
  feat: "Feat",
  species: "Species",
  spell: "Spell",
  background: "Background",
  ability: "Ability",
}

export function ImportCollisionPanel({
  collisions,
  value,
  onChange,
  resolutionMap,
  onResolutionChange,
}: ImportCollisionPanelProps) {
  if (!collisions.length) return null

  const updateName = (collision: ImportCollision, nextName: string) => {
    onChange({ ...value, [collision.id]: nextName })
  }

  const updateResolution = (collision: ImportCollision, resolution: ImportCollisionResolution) => {
    onResolutionChange({ ...resolutionMap, [collision.id]: resolution })
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-foreground">Name conflicts</p>
          <p className="mt-1 text-muted-foreground">
            These entries match existing compendium content by name. Choose whether to replace the
            existing version or import under a new name.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {collisions.map((collision) => {
          const resolution = resolutionMap[collision.id] ?? "rename"
          const renameDisabled = resolution === "overwrite"

          return (
            <div
              key={collision.id}
              className="rounded-lg border border-border/90 bg-card/88 backdrop-blur-sm p-3 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/75">
                <span className="rounded bg-muted px-2 py-0.5 font-medium">
                  {KIND_LABELS[collision.kind]}
                </span>
                <span>
                  Existing: <span className="text-foreground">{collision.existingName}</span>
                  {collision.existingSource ? ` (${collision.existingSource})` : ""}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateResolution(collision, "overwrite")}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors ${
                    resolution === "overwrite"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  Replace existing
                </button>
                <button
                  type="button"
                  onClick={() => updateResolution(collision, "rename")}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors ${
                    resolution === "rename"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  Import as new name
                </button>
              </div>

              {resolution === "overwrite" ? (
                <p className="text-xs text-muted-foreground">
                  The compendium entry <span className="font-medium text-foreground">{collision.existingName}</span>{" "}
                  will be updated with the imported version.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Incoming name</label>
                    <input
                      type="text"
                      readOnly
                      value={collision.incomingName}
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Import as</label>
                    <input
                      type="text"
                      value={value[collision.id] ?? collision.suggestedName}
                      onChange={(e) => updateName(collision, e.target.value)}
                      disabled={renameDisabled}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm disabled:opacity-60"
                    />
                  </div>
                </div>
              )}

              {collision.suggestedResourcePrefix ? (
                <p className="text-xs text-muted-foreground">
                  Resource key prefix:{" "}
                  <span className="font-mono">{collision.suggestedResourcePrefix}_</span>
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

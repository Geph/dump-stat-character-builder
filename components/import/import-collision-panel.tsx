"use client"

import type { ImportCollision, ImportRenameMap } from "@/lib/import/import-collisions"
import { AlertTriangle } from "lucide-react"

type ImportCollisionPanelProps = {
  collisions: ImportCollision[]
  value: ImportRenameMap
  onChange: (map: ImportRenameMap) => void
}

const KIND_LABELS: Record<ImportCollision["kind"], string> = {
  class: "Class",
  feat: "Feat",
  species: "Species",
  spell: "Spell",
  background: "Background",
  ability: "Ability",
}

export function ImportCollisionPanel({ collisions, value, onChange }: ImportCollisionPanelProps) {
  if (!collisions.length) return null

  const updateName = (collision: ImportCollision, nextName: string) => {
    onChange({ ...value, [collision.id]: nextName })
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-foreground">Name conflicts</p>
          <p className="mt-1 text-muted-foreground">
            These entries would overwrite existing compendium content. Choose new names before
            importing. Linked resource keys will be prefixed automatically (e.g.{" "}
            <span className="font-mono text-xs">alt_fighter_exploit_dice</span>).
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {collisions.map((collision) => (
          <div
            key={collision.id}
            className="rounded-lg border border-border bg-card/60 p-3 space-y-2"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-muted px-2 py-0.5 font-medium">
                {KIND_LABELS[collision.kind]}
              </span>
              <span>
                Existing: <span className="text-foreground">{collision.existingName}</span>
                {collision.existingSource ? ` (${collision.existingSource})` : ""}
              </span>
            </div>
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
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
            </div>
            {collision.suggestedResourcePrefix ? (
              <p className="text-xs text-muted-foreground">
                Resource key prefix:{" "}
                <span className="font-mono">{collision.suggestedResourcePrefix}_</span>
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

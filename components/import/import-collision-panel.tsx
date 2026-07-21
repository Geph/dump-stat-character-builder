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

function defaultResolution(collision: ImportCollision): ImportCollisionResolution {
  return collision.kind === "spell" ? "link" : "rename"
}

export function ImportCollisionPanel({
  collisions,
  value,
  onChange,
  resolutionMap,
  onResolutionChange,
}: ImportCollisionPanelProps) {
  if (!collisions.length) return null

  const hasSpellCollisions = collisions.some((collision) => collision.kind === "spell")
  const hasOtherCollisions = collisions.some((collision) => collision.kind !== "spell")

  const updateName = (collision: ImportCollision, nextName: string) => {
    onChange({ ...value, [collision.id]: nextName })
  }

  const updateResolution = (collision: ImportCollision, resolution: ImportCollisionResolution) => {
    onResolutionChange({ ...resolutionMap, [collision.id]: resolution })
  }

  const skipAll = () => {
    const next: ImportCollisionResolutionMap = { ...resolutionMap }
    for (const collision of collisions) {
      next[collision.id] = "skip"
    }
    onResolutionChange(next)
  }

  /** Preserve existing compendium rows: link matching spells, skip other conflicts. */
  const keepAllExisting = () => {
    const next: ImportCollisionResolutionMap = { ...resolutionMap }
    for (const collision of collisions) {
      next[collision.id] = collision.kind === "spell" ? "link" : "skip"
    }
    onResolutionChange(next)
  }

  const keepExistingResolution = (collision: ImportCollision): ImportCollisionResolution =>
    collision.kind === "spell" ? "link" : "skip"

  const allSkipped = collisions.every(
    (collision) => (resolutionMap[collision.id] ?? defaultResolution(collision)) === "skip",
  )

  const allKeepingExisting = collisions.every(
    (collision) =>
      (resolutionMap[collision.id] ?? defaultResolution(collision)) ===
      keepExistingResolution(collision),
  )

  return (
    <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold text-foreground">Name conflicts</p>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={keepAllExisting}
                className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  allKeepingExisting
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                Keep all existing
              </button>
              <button
                type="button"
                onClick={skipAll}
                className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  allSkipped
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                Skip all
              </button>
            </div>
          </div>
          <p className="mt-1 text-muted-foreground">
            {hasSpellCollisions && hasOtherCollisions
              ? "Matching spells link to the existing compendium entry by default. Other content can replace the existing version, import under a new name, or be skipped."
              : hasSpellCollisions
                ? "These spells already exist in the compendium. They will be matched and linked by default (not replaced). You can still import a copy under a new name, or skip them."
                : "These entries match existing compendium content by name. Choose whether to replace the existing version, import under a new name, or skip importing them."}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {collisions.map((collision) => {
          const resolution = resolutionMap[collision.id] ?? defaultResolution(collision)
          const isSpell = collision.kind === "spell"
          const renameDisabled =
            resolution === "overwrite" || resolution === "link" || resolution === "skip"

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
                {isSpell ? (
                  <button
                    type="button"
                    onClick={() => updateResolution(collision, "link")}
                    className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors ${
                      resolution === "link"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    Use existing
                  </button>
                ) : (
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
                )}
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
                <button
                  type="button"
                  onClick={() => updateResolution(collision, "skip")}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors ${
                    resolution === "skip"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  Skip import
                </button>
              </div>

              {resolution === "overwrite" ? (
                <p className="text-xs text-muted-foreground">
                  The compendium entry{" "}
                  <span className="font-medium text-foreground">{collision.existingName}</span> will
                  be updated with the imported version.
                </p>
              ) : resolution === "link" ? (
                <p className="text-xs text-muted-foreground">
                  Keep{" "}
                  <span className="font-medium text-foreground">{collision.existingName}</span> as-is.
                  Imported features and lists that reference this spell will link to the existing
                  compendium entry.
                </p>
              ) : resolution === "skip" ? (
                <p className="text-xs text-muted-foreground">
                  Do not import{" "}
                  <span className="font-medium text-foreground">{collision.incomingName}</span>. The
                  existing compendium entry stays unchanged.
                </p>
              ) : (
                <div className="space-y-2">
                  {collision.kind === "class" ? (
                    <p className="text-xs text-muted-foreground">
                      Choose what to call this class in your compendium. Suggestion:{" "}
                      <span className="font-medium text-foreground">{collision.suggestedName}</span>
                      {collision.existingSource
                        ? ` (existing entry source: ${collision.existingSource})`
                        : ""}
                      .
                    </p>
                  ) : null}
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
                        value={
                          collision.kind === "class"
                            ? (value[collision.id] ?? "")
                            : (value[collision.id] ?? collision.suggestedName)
                        }
                        placeholder={
                          collision.kind === "class" ? collision.suggestedName : undefined
                        }
                        onChange={(e) => updateName(collision, e.target.value)}
                        disabled={renameDisabled}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm disabled:opacity-60"
                      />
                    </div>
                  </div>
                  {collision.kind === "class" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={renameDisabled}
                        onClick={() => updateName(collision, collision.suggestedName)}
                        className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-60"
                      >
                        Use suggested name
                      </button>
                      {!(value[collision.id] ?? "").trim() ||
                      (value[collision.id] ?? "").trim().toLowerCase() ===
                        collision.incomingName.trim().toLowerCase() ? (
                        <span className="text-xs text-amber-700 dark:text-amber-300">
                          Enter a new name (different from &quot;{collision.incomingName}&quot;) to
                          continue.
                        </span>
                      ) : null}
                    </div>
                  ) : null}
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

"use client"

import type { RelatedCascadeGroup } from "@/lib/compendium/related-cascade"
import { summarizeRelatedNames } from "@/lib/compendium/related-cascade"

type Props = {
  related: RelatedCascadeGroup
  includeFeats: boolean
  includeCreatures: boolean
  includeAbilities: boolean
  onIncludeFeatsChange: (value: boolean) => void
  onIncludeCreaturesChange: (value: boolean) => void
  onIncludeAbilitiesChange: (value: boolean) => void
  disabled?: boolean
  /** When true, hide feats/companions checkboxes (abilities-only section clears). */
  abilitiesOnly?: boolean
}

export function RelatedCascadeOptions({
  related,
  includeFeats,
  includeCreatures,
  includeAbilities,
  onIncludeFeatsChange,
  onIncludeCreaturesChange,
  onIncludeAbilitiesChange,
  disabled,
  abilitiesOnly = false,
}: Props) {
  const hasFeats = !abilitiesOnly && related.feats.length > 0
  const hasCreatures = !abilitiesOnly && related.creatures.length > 0
  const hasAbilities = related.abilities.length > 0
  if (!hasFeats && !hasCreatures && !hasAbilities) return null

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Also clear related content?
      </p>
      {hasFeats ? (
        <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-1"
            checked={includeFeats}
            disabled={disabled}
            onChange={(e) => onIncludeFeatsChange(e.target.checked)}
          />
          <span>
            <span className="font-semibold">
              {related.feats.length} related feat{related.feats.length === 1 ? "" : "s"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {summarizeRelatedNames(related.feats)}
            </span>
          </span>
        </label>
      ) : null}
      {hasCreatures ? (
        <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-1"
            checked={includeCreatures}
            disabled={disabled}
            onChange={(e) => onIncludeCreaturesChange(e.target.checked)}
          />
          <span>
            <span className="font-semibold">
              {related.creatures.length} related companion
              {related.creatures.length === 1 ? "" : "s"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {summarizeRelatedNames(related.creatures)}
            </span>
          </span>
        </label>
      ) : null}
      {hasAbilities ? (
        <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-1"
            checked={includeAbilities}
            disabled={disabled}
            onChange={(e) => onIncludeAbilitiesChange(e.target.checked)}
          />
          <span>
            <span className="font-semibold">
              {related.abilities.length} attached custom abilit
              {related.abilities.length === 1 ? "y" : "ies"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {summarizeRelatedNames(related.abilities)}
            </span>
          </span>
        </label>
      ) : null}
    </div>
  )
}

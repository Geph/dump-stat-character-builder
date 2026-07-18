"use client"

import { useMemo, useState } from "react"
import { ConditionInfoTip } from "@/components/character-sheet/condition-info-tip"
import {
  defaultProposalSelections,
  type ImportProposalSelections,
  type ImportProposalSet,
} from "@/lib/import/import-proposals"
import { Gauge, Sparkles, Loader2 } from "lucide-react"

type ImportProposalPanelProps = {
  proposals: ImportProposalSet
  onConfirm: (selections: ImportProposalSelections) => void | Promise<void>
  onCancel: () => void
  confirming?: boolean
}

const SOURCE_LABELS = {
  ai: "AI identified",
  table: "From level table",
  explicit: "Extracted",
  feature: "From class feature",
} as const

export function ImportProposalPanel({
  proposals,
  onConfirm,
  onCancel,
  confirming = false,
}: ImportProposalPanelProps) {
  const [selections, setSelections] = useState<ImportProposalSelections>(() =>
    defaultProposalSelections(proposals),
  )

  const selectedResourceCount = useMemo(
    () =>
      proposals.classResources.filter((row) => selections.classResourceIds.includes(row.id)).length,
    [proposals.classResources, selections.classResourceIds],
  )
  const selectedAbilityCount = useMemo(
    () =>
      proposals.customAbilities.filter((row) => selections.customAbilityIds.includes(row.id)).length,
    [proposals.customAbilities, selections.customAbilityIds],
  )

  const toggleResource = (id: string) => {
    setSelections((prev) => ({
      ...prev,
      classResourceIds: prev.classResourceIds.includes(id)
        ? prev.classResourceIds.filter((entry) => entry !== id)
        : [...prev.classResourceIds, id],
    }))
  }

  const toggleAbility = (id: string) => {
    setSelections((prev) => ({
      ...prev,
      customAbilityIds: prev.customAbilityIds.includes(id)
        ? prev.customAbilityIds.filter((entry) => entry !== id)
        : [...prev.customAbilityIds, id],
    }))
  }

  return (
    <div className="space-y-4 rounded-xl border-2 border-primary/45 bg-primary/[0.07] p-4 text-sm shadow-md shadow-primary/10 ring-1 ring-primary/20">
      <div>
        <p className="text-base font-semibold text-foreground">Ready to import</p>
        {proposals.classResources.length === 0 && proposals.customAbilities.length === 0 ? (
          <p className="mt-1 text-muted-foreground">
            No class resources or custom abilities need separate approval. Confirm when the preview
            above looks correct.
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">
            Uncheck any class resources or custom abilities you do not want created in the
            compendium.
          </p>
        )}
      </div>

      {proposals.classResources.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
            <Gauge className="h-4 w-4" />
            Class resources ({selectedResourceCount}/{proposals.classResources.length})
          </div>
          <ul className="space-y-2">
            {proposals.classResources.map((resource) => {
              const checked = selections.classResourceIds.includes(resource.id)
              return (
                <li
                  key={resource.id}
                  className="rounded-lg border border-border/70 bg-background/80 px-3 py-2"
                >
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggleResource(resource.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-foreground">{resource.name}</span>
                        <span className="text-xs text-muted-foreground">({resource.className})</span>
                        <ConditionInfoTip description={resource.definition} />
                      </span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
                        {SOURCE_LABELS[resource.source]} · {resource.resourceKey}
                        {resource.uses.atLevelTable?.length
                          ? ` · ${resource.uses.atLevelTable.length} level tiers`
                          : ""}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {proposals.customAbilities.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="h-4 w-4" />
            Custom abilities ({selectedAbilityCount}/{proposals.customAbilities.length})
          </div>
          <ul className="space-y-2">
            {proposals.customAbilities.map((ability) => {
              const checked = selections.customAbilityIds.includes(ability.id)
              return (
                <li
                  key={ability.id}
                  className="rounded-lg border border-border/70 bg-background/80 px-3 py-2"
                >
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggleAbility(ability.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-foreground">{ability.name}</span>
                        {ability.levelRequirement != null ? (
                          <span className="text-xs text-muted-foreground">
                            L{ability.levelRequirement}
                          </span>
                        ) : null}
                        <ConditionInfoTip description={ability.definition} />
                      </span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
                        {SOURCE_LABELS[ability.source]}
                        {ability.sourceName ? ` · ${ability.sourceName}` : ""}
                        {ability.talentCount
                          ? ` · ${ability.talentCount} talent${ability.talentCount === 1 ? "" : "s"}`
                          : ""}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-primary/25 pt-3">
        <button
          type="button"
          disabled={confirming}
          onClick={() => void onConfirm(selections)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90 disabled:opacity-60"
        >
          {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Confirm and import
        </button>
        <button
          type="button"
          disabled={confirming}
          onClick={onCancel}
          className="rounded-xl border border-border/80 bg-background/70 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

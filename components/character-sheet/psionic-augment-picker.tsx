"use client"

import { useMemo } from "react"
import {
  augmentPointsCost,
  formatPsionicAugmentCost,
  formatPsionicAugmentSelectionSummary,
  totalPsionicAugmentCost,
  type PsionicAugmentSelection,
  type PsionicAugmentsConfig,
} from "@/lib/compendium/parse-psionic-augments"
import { resolvePsionicAugments } from "@/lib/compendium/resolve-psionic-augments"
import type { CustomAbility, Spell } from "@/lib/types"

export function resolveSpellPsionicAugments(spell: Spell): PsionicAugmentsConfig | null {
  return resolvePsionicAugments(spell)
}

export function resolveAbilityPsionicAugments(
  ability: Pick<CustomAbility, "name" | "description" | "psionic_augments">,
): PsionicAugmentsConfig | null {
  return resolvePsionicAugments(ability)
}

type PsionicAugmentPickerProps = {
  config: PsionicAugmentsConfig
  selections: PsionicAugmentSelection[]
  onChange: (next: PsionicAugmentSelection[]) => void
  psiLimit?: number | null
  readOnly?: boolean
}

function defaultPointsForAugment(config: PsionicAugmentsConfig, augmentId: string): number {
  const augment = config.augments.find((row) => row.id === augmentId)
  if (!augment) return 1
  if (augment.cost.fixed != null) return augment.cost.fixed
  return augment.cost.min ?? 1
}

export function PsionicAugmentPicker({
  config,
  selections,
  onChange,
  psiLimit,
  readOnly = false,
}: PsionicAugmentPickerProps) {
  const selectedIds = useMemo(() => new Set(selections.map((row) => row.augmentId)), [selections])
  const totalCost = totalPsionicAugmentCost(config, selections)

  const toggleAugment = (augmentId: string) => {
    if (selectedIds.has(augmentId)) {
      onChange(selections.filter((row) => row.augmentId !== augmentId))
      return
    }
    if (!config.allowMultiple && selections.length >= 1) {
      onChange([{ augmentId, pointsSpent: defaultPointsForAugment(config, augmentId) }])
      return
    }
    onChange([
      ...selections,
      { augmentId, pointsSpent: defaultPointsForAugment(config, augmentId) },
    ])
  }

  const setPoints = (augmentId: string, pointsSpent: number) => {
    onChange(
      selections.map((row) => (row.augmentId === augmentId ? { ...row, pointsSpent } : row)),
    )
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Psi Augments
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {readOnly
              ? "Optional psi-point empower options for this power."
              : config.allowMultiple
                ? "Select one or more empower options before casting."
                : "Select one empower option before casting."}
          </p>
        </div>
        {selections.length ? (
          <p className="text-xs font-semibold text-foreground tabular-nums shrink-0">
            {totalCost} psi
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        {config.augments.map((augment) => {
          const selected = selections.find((row) => row.augmentId === augment.id)
          const isSelected = Boolean(selected)
          const variable =
            augment.cost.scalesPerPoint ||
            (augment.cost.min != null && augment.cost.max != null && augment.cost.fixed == null)
          const min = augment.cost.min ?? augment.cost.fixed ?? 0
          const max = augment.cost.max ?? (augment.cost.scalesPerPoint ? psiLimit ?? 9 : min)

          return (
            <div
              key={augment.id}
              className={`rounded-lg border px-3 py-2 transition-colors ${
                isSelected
                  ? "border-violet-500/50 bg-violet-500/10"
                  : "border-border/70 bg-background/60"
              }`}
            >
              <label className={`flex items-start gap-2 ${readOnly ? "" : "cursor-pointer"}`}>
                <input
                  type={config.allowMultiple ? "checkbox" : "radio"}
                  name={`psionic-augment-${config.resourceKey}`}
                  checked={isSelected}
                  disabled={readOnly}
                  onChange={() => toggleAugment(augment.id)}
                  className="mt-1 accent-violet-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{augment.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                      {formatPsionicAugmentCost(augment)}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">
                    {augment.description}
                  </span>
                </span>
              </label>

              {isSelected && variable ? (
                <div className="mt-2 ml-6 flex items-center gap-2 text-xs">
                  <label className="text-muted-foreground">Psi spent</label>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={selected?.pointsSpent ?? min}
                    disabled={readOnly}
                    onChange={(event) =>
                      setPoints(augment.id, parseInt(event.target.value, 10) || min)
                    }
                    className="w-16 px-2 py-1 rounded border border-border bg-background text-center"
                  />
                  <span className="text-muted-foreground">
                    = {augmentPointsCost(augment, selected?.pointsSpent ?? min)} psi
                  </span>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {selections.length ? (
        <p className="text-[11px] text-muted-foreground">
          {formatPsionicAugmentSelectionSummary(config, selections)}
        </p>
      ) : null}
    </div>
  )
}

"use client"

import type { CatalogFeatPickOption } from "@/lib/builder/catalog-feat-options"
import { CatalogOptionDescriptionHover } from "@/components/builder/catalog-option-description-hover"
import { resolveCatalogFeatPickLabel } from "@/lib/builder/catalog-feat-options"
import type { CustomAbility } from "@/lib/types"

type CatalogFeatMultiPickerProps = {
  className?: string
  label: string
  classPrefix?: string
  options: CatalogFeatPickOption[]
  maxCount: number
  selectedPickIds: string[]
  onChange: (pickIds: string[]) => void
  customAbilities: CustomAbility[]
  cardViewMode?: "dense" | "cinematic"
}

/** One multi-select grid for catalog feat picks (Eldritch Invocation, Metamagic, etc.). */
export function CatalogFeatMultiPicker({
  className,
  label,
  classPrefix,
  options,
  maxCount,
  selectedPickIds,
  onChange,
  customAbilities,
  cardViewMode = "cinematic",
}: CatalogFeatMultiPickerProps) {
  const toggle = (pickId: string) => {
    if (selectedPickIds.includes(pickId)) {
      onChange(selectedPickIds.filter((entry) => entry !== pickId))
      return
    }
    if (selectedPickIds.length >= maxCount) return
    onChange([...selectedPickIds, pickId])
  }

  const selectedLabels = selectedPickIds
    .map((pickId) => resolveCatalogFeatPickLabel(pickId, customAbilities))
    .filter((name): name is string => Boolean(name))

  return (
    <div className={className}>
      <p className="text-xs font-bold text-primary uppercase mb-2">
        {classPrefix ? `${classPrefix}: ` : ""}
        {label}
        {maxCount > 1 ? ` — choose ${maxCount}` : ""}
      </p>
      <div
        className={`grid grid-cols-1 ${
          cardViewMode === "cinematic"
            ? "sm:grid-cols-2 gap-2"
            : "sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
        }`}
      >
        {options.map((option) => {
          const isSelected = selectedPickIds.includes(option.pickId)
          const atCapacity = !isSelected && selectedPickIds.length >= maxCount
          return (
            <div key={option.pickId} className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => toggle(option.pickId)}
                disabled={atCapacity}
                className={`flex-1 rounded-lg border-2 text-left transition-all px-2.5 py-1.5 ${
                  isSelected
                    ? "border-secondary bg-secondary/10"
                    : atCapacity
                      ? "border-border/60 bg-card/50 opacity-50 cursor-not-allowed"
                      : "border-border bg-card hover:border-secondary/50"
                }`}
              >
                <p className="font-semibold text-foreground text-xs">{option.name}</p>
                {option.summary ? (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {option.summary}
                  </p>
                ) : null}
              </button>
              <CatalogOptionDescriptionHover
                name={option.name}
                description={option.description}
              />
            </div>
          )
        })}
      </div>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No options available. Seed SRD content or open Compendium → Abilities to verify Metamagic /
          Eldritch Invocation catalogs.
        </p>
      ) : null}
      {selectedLabels.length > 0 ? (
        <p className="text-xs text-muted-foreground mt-2">
          Selected ({selectedLabels.length}/{maxCount}):{" "}
          <span className="font-semibold text-foreground">{selectedLabels.join(", ")}</span>
        </p>
      ) : null}
    </div>
  )
}

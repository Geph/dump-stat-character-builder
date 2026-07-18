"use client"

import { Check } from "lucide-react"
import type { CatalogFeatPickOption } from "@/lib/builder/catalog-feat-options"
import { CatalogOptionDescriptionHover } from "@/components/builder/catalog-option-description-hover"
import { resolveCatalogFeatPickLabel } from "@/lib/builder/catalog-feat-options"
import type { CustomAbility } from "@/lib/types"
import { cn } from "@/lib/utils"

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
  const cinematic = cardViewMode === "cinematic"

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
        className={
          cinematic
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
        }
      >
        {options.map((option) => {
          const isSelected = selectedPickIds.includes(option.pickId)
          const atCapacity = !isSelected && selectedPickIds.length >= maxCount
          const hasDescription = Boolean(option.description?.trim())

          if (!cinematic) {
            return (
              <div key={option.pickId} className="flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => toggle(option.pickId)}
                  disabled={atCapacity}
                  className={cn(
                    "flex-1 rounded-lg border-2 text-left transition-all px-2.5 py-1.5",
                    isSelected
                      ? "border-secondary bg-secondary/10"
                      : atCapacity
                        ? "border-border/60 bg-card/50 opacity-50 cursor-not-allowed"
                        : "border-border bg-card hover:border-secondary/50",
                  )}
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
          }

          return (
            <div
              key={option.pickId}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-center transition-all",
                isSelected
                  ? "border-secondary bg-secondary/10"
                  : atCapacity
                    ? "border-border/60 bg-card/50 opacity-50"
                    : "border-border bg-card hover:border-secondary/50",
              )}
            >
              {isSelected ? (
                <span className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
              {hasDescription ? (
                <div className="absolute right-1 top-1">
                  <CatalogOptionDescriptionHover
                    name={option.name}
                    description={option.description}
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => toggle(option.pickId)}
                disabled={atCapacity}
                className="flex w-full flex-col items-center gap-1 pt-1 disabled:cursor-not-allowed"
              >
                <span className="text-xs font-semibold leading-tight text-foreground">
                  {option.name}
                </span>
                {option.summary ? (
                  <span className="line-clamp-2 text-[10px] text-muted-foreground leading-snug">
                    {option.summary}
                  </span>
                ) : null}
              </button>
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

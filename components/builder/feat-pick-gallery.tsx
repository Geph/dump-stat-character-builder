"use client"

import { Check, Info } from "lucide-react"
import { GameIcon } from "@/components/game-icon-picker"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import { cn } from "@/lib/utils"
import type { Feat } from "@/lib/types"

type FeatPickGalleryProps = {
  feats: Feat[]
  selectedId: string | null
  onSelect: (featId: string | null) => void
  onShowDetails?: (feat: Feat) => void
  /** Visual builder uses a denser mastery-style gallery. */
  layout?: "dense" | "cinematic"
  selectedClassName?: string
}

export function FeatPickGallery({
  feats,
  selectedId,
  onSelect,
  onShowDetails,
  layout = "cinematic",
  selectedClassName = "border-secondary bg-secondary/10",
}: FeatPickGalleryProps) {
  const cinematic = layout === "cinematic"
  // Collapse to the chosen feat; deselecting unfurls the full gallery again.
  const displayFeats =
    selectedId != null ? feats.filter((feat) => feat.id === selectedId) : feats

  return (
    <div
      className={
        cinematic
          ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
      }
    >
      {displayFeats.map((feat) => {
        const isSelected = feat.id === selectedId
        const canShowInfo = Boolean(onShowDetails && feat.description?.trim())
        const meta = featMetaParts(feat, cinematic)

        if (!cinematic) {
          return (
            <button
              key={feat.id}
              type="button"
              onClick={() => onSelect(isSelected ? null : feat.id)}
              className={cn(
                "w-full rounded-lg border-2 px-2.5 py-1.5 text-left transition-all",
                isSelected
                  ? selectedClassName
                  : "border-border bg-card hover:border-secondary/50",
              )}
            >
              <p className="text-xs font-semibold text-foreground">{feat.name}</p>
              {meta.length > 0 ? (
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  {meta.map((part) => (
                    <span
                      key={part}
                      className={part === "Repeatable" ? "text-primary" : undefined}
                    >
                      {part}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          )
        }

        return (
          <div
            key={feat.id}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-center transition-all",
              isSelected
                ? selectedClassName
                : "border-border bg-card hover:border-secondary/50",
            )}
          >
            {isSelected ? (
              <span className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Check className="h-3 w-3" />
              </span>
            ) : null}
            {canShowInfo ? (
              <button
                type="button"
                aria-label={`About ${feat.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onShowDetails?.(feat)
                }}
                className="absolute right-1 top-1 rounded-md border border-border/80 bg-background/80 p-1 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Info className="h-3 w-3" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onSelect(isSelected ? null : feat.id)}
              className="flex w-full flex-col items-center gap-1 pt-1"
            >
              <GameIcon
                name={getCompendiumItemIcon("feats", feat as unknown as Record<string, unknown>)}
                className="h-7 w-7 shrink-0 text-secondary"
              />
              <span className="text-xs font-semibold leading-tight text-foreground">
                {feat.name}
              </span>
              {meta.length > 0 ? (
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {meta.join(" · ")}
                </span>
              ) : null}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function featMetaParts(feat: Feat, cinematic: boolean): string[] {
  const isOrigin = feat.category?.toLowerCase().includes("origin")
  return [
    isOrigin
      ? "Origin"
      : feat.level_requirement && feat.level_requirement > 1
        ? cinematic
          ? `L${feat.level_requirement}+`
          : `Lvl ${feat.level_requirement}+`
        : null,
    feat.repeatable ? "Repeatable" : null,
  ].filter((part): part is string => Boolean(part))
}

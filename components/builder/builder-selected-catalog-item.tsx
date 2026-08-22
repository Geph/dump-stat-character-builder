"use client"

import type { ReactNode } from "react"
import { CompendiumDenseSelectionCard } from "@/components/compendium/compendium-dense-selection-card"
import { CompendiumSelectionCard } from "@/components/compendium/compendium-selection-card"
import {
  getCompendiumItemAccentColor,
} from "@/lib/compendium/theme-colors"
import type { CompendiumCardVisual } from "@/lib/compendium/card-image"
import type { BuilderCardViewMode } from "@/lib/site-settings/builder-layout"
import { cn } from "@/lib/utils"

type BuilderSelectedCatalogItemProps = {
  item: CompendiumCardVisual & { name: string; id: string; source?: string | null; icon?: string | null }
  subtitle?: string
  badge?: ReactNode
  cardViewMode: BuilderCardViewMode
  selectionVariant?: "primary" | "secondary"
  className?: string
  /** Portrait cards in a narrow pinned strip; wide cards stay full width. */
  portrait?: boolean
}

/** Compact “only the pick you made” preview for collapsed builder picker sections. */
export function BuilderSelectedCatalogItem({
  item,
  subtitle,
  badge,
  cardViewMode,
  selectionVariant = "primary",
  className,
  portrait = true,
}: BuilderSelectedCatalogItemProps) {
  const accent = getCompendiumItemAccentColor(item as unknown as Record<string, unknown>)
  const sourceLabel = subtitle?.trim() || item.source?.trim() || "Custom"

  if (cardViewMode === "dense") {
    return (
      <CompendiumDenseSelectionCard
        name={item.name}
        subtitle={sourceLabel}
        icon={item.icon}
        accentColor={accent}
        selected
        selectionVariant={selectionVariant}
        badge={badge}
        className={cn("max-w-sm", className)}
      />
    )
  }

  return (
    <div className={cn(portrait ? "max-w-[13.5rem]" : "max-w-xl", className)}>
      <CompendiumSelectionCard
        item={item}
        subtitle={sourceLabel}
        accentColor={accent}
        selected
        selectionVariant={selectionVariant}
        badge={badge}
        size="md"
        cardShape={portrait ? "portrait" : "wide"}
        imageCrop={portrait ? "top" : "center"}
        showBlurb={false}
      />
    </div>
  )
}

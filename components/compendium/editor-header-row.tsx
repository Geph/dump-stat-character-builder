"use client"

import type { ReactNode } from "react"
import { GameIconPicker } from "@/components/game-icon-picker"
import { useAppPresentationMode } from "@/components/settings/use-app-presentation-mode"
import { CompendiumThemeColorPicker } from "@/components/compendium/theme-color-picker"
import { SourceLinkField } from "@/components/compendium/source-link-field"
import { CardImageField } from "@/components/compendium/card-image-field"
import type { CompendiumCardImageCrop } from "@/lib/compendium/card-image"
import { compendiumFieldClass } from "@/lib/compendium/editor-field-styles"
import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"

const fieldClass = compendiumFieldClass

type CompendiumEditorHeaderRowProps = {
  nameLabel: string
  name: string
  onNameChange: (value: string) => void
  namePlaceholder?: string
  nameRequired?: boolean
  source: string
  onSourceChange: (value: string) => void
  creatorUrl: string
  onCreatorUrlChange: (value: string) => void
  icon: string | null
  onIconChange: (icon: string | null) => void
  accentColor?: CompendiumThemeColorId | null
  onAccentColorChange?: (color: CompendiumThemeColorId | null) => void
  cardImageUrl?: string | null
  onCardImageUrlChange?: (url: string | null) => void
  cardImageAspect?: "3/4" | "21/9"
  cardImageCrop?: CompendiumCardImageCrop
  /** When "none", card image is rendered elsewhere (e.g. beside description). */
  cardImagePlacement?: "below" | "none"
  /** Optional field between name and source (e.g. parent class). */
  afterName?: ReactNode
}

export function CompendiumEditorHeaderRow({
  nameLabel,
  name,
  onNameChange,
  namePlaceholder,
  nameRequired = true,
  source,
  onSourceChange,
  creatorUrl,
  onCreatorUrlChange,
  icon,
  onIconChange,
  accentColor = null,
  onAccentColorChange,
  cardImageUrl = null,
  onCardImageUrlChange,
  cardImageAspect = "21/9",
  cardImageCrop = "center",
  cardImagePlacement = "below",
  afterName,
}: CompendiumEditorHeaderRowProps) {
  const { isCompactOnly } = useAppPresentationMode()
  const gridCols = afterName
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
    : "grid-cols-1 md:grid-cols-3"

  return (
    <div className="space-y-4">
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className="shrink-0 flex flex-col gap-3">
        <div className="flex flex-col">
          <span className="hidden sm:block text-sm font-semibold text-foreground mb-2 invisible select-none" aria-hidden>
            Icon
          </span>
          <GameIconPicker value={icon} onChange={onIconChange} inline />
        </div>
        {onAccentColorChange ? (
          <CompendiumThemeColorPicker value={accentColor} onChange={onAccentColorChange} compact />
        ) : null}
      </div>
      <div className={`flex-1 w-full min-w-0 grid ${gridCols} gap-4`}>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">{nameLabel}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required={nameRequired}
            className={fieldClass}
            placeholder={namePlaceholder}
          />
        </div>
        {afterName}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Source</label>
          <input
            type="text"
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            className={fieldClass}
            placeholder="Player's Handbook"
          />
        </div>
        <SourceLinkField
          value={creatorUrl}
          onChange={onCreatorUrlChange}
          compact
        />
      </div>
    </div>
    {onCardImageUrlChange && cardImagePlacement === "below" && !isCompactOnly ? (
      <CardImageField
        value={cardImageUrl}
        onChange={onCardImageUrlChange}
        imageAspect={cardImageAspect}
        imageCrop={cardImageCrop}
      />
    ) : null}
    </div>
  )
}

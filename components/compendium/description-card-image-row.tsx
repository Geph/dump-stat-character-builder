"use client"

import type { ReactNode } from "react"
import { CardImageField } from "@/components/compendium/card-image-field"
import { CompendiumEditorPanel } from "@/components/compendium/compendium-editor-section"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { useAppPresentationMode } from "@/components/settings/use-app-presentation-mode"
import type { CompendiumCardImageCrop } from "@/lib/compendium/card-image"

type CompendiumDescriptionCardImageRowProps = {
  description: string
  onDescriptionChange: (value: string) => void
  descriptionPlaceholder?: string
  cardImageUrl: string | null
  onCardImageUrlChange: (url: string | null) => void
  cardImageCrop?: CompendiumCardImageCrop
  /** Extra controls under the description (e.g. complexity). */
  descriptionExtras?: ReactNode
  /** Extra controls inside the card-image panel (e.g. card blurb). */
  cardImageExtras?: ReactNode
}

/** Card art (collapsed by default) stacked above an open Description panel. */
export function CompendiumDescriptionCardImageRow({
  description,
  onDescriptionChange,
  descriptionPlaceholder,
  cardImageUrl,
  onCardImageUrlChange,
  cardImageCrop = "center",
  descriptionExtras,
  cardImageExtras,
}: CompendiumDescriptionCardImageRowProps) {
  const { isCompactOnly } = useAppPresentationMode()

  return (
    <div className="space-y-4">
      {!isCompactOnly ? (
        <CardImageField
          value={cardImageUrl}
          onChange={onCardImageUrlChange}
          imageAspect="3/4"
          imageCrop={cardImageCrop}
          collapsible
          defaultOpen={Boolean(cardImageExtras) || false}
          extras={cardImageExtras}
        />
      ) : cardImageExtras ? (
        <CompendiumEditorPanel title="Card blurb" defaultOpen>
          {cardImageExtras}
        </CompendiumEditorPanel>
      ) : null}
      <CompendiumEditorPanel title="Description" defaultOpen>
        <div className="min-h-[12rem]">
          <RichTextEditor
            value={description}
            onChange={onDescriptionChange}
            placeholder={descriptionPlaceholder}
          />
        </div>
        {descriptionExtras ? (
          <div className="space-y-3 border-t border-border/60 pt-3">{descriptionExtras}</div>
        ) : null}
      </CompendiumEditorPanel>
    </div>
  )
}

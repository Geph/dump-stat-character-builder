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
  /** Extra controls under the description (e.g. card blurb, complexity). */
  descriptionExtras?: ReactNode
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
          defaultOpen={false}
        />
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

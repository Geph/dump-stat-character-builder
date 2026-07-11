"use client"

import type { ReactNode } from "react"
import { CardImageField } from "@/components/compendium/card-image-field"
import { CompendiumEditorSection } from "@/components/compendium/compendium-editor-section"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
import { useAppPresentationMode } from "@/components/settings/use-app-presentation-mode"
import type { CompendiumCardImageCrop } from "@/lib/compendium/card-image"
import { pageOverlayPanelClass, pageOverlayPanelTitleClass } from "@/lib/compendium/editor-field-styles"
import { cn } from "@/lib/utils"

type CompendiumDescriptionCardImageRowProps = {
  description: string
  onDescriptionChange: (value: string) => void
  descriptionPlaceholder?: string
  cardImageUrl: string | null
  onCardImageUrlChange: (url: string | null) => void
  cardImageCrop?: CompendiumCardImageCrop
  /** Extra controls under the description in the left column (e.g. card blurb, complexity). */
  descriptionExtras?: ReactNode
}

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
    <CompendiumEditorSection
      title={isCompactOnly ? "Description" : "Description & card art"}
      collapsible
      defaultOpen
    >
      <div
        className={cn(
          "grid gap-4 items-stretch",
          isCompactOnly ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2",
        )}
      >
        <section
          className={cn(
            pageOverlayPanelClass,
            "p-4 flex flex-col min-h-0 min-w-0 h-full space-y-3",
          )}
        >
          <h3 className={pageOverlayPanelTitleClass}>Description</h3>
          <div className="flex min-h-[12rem] flex-1 flex-col">
            <RichTextEditor
              value={description}
              onChange={onDescriptionChange}
              placeholder={descriptionPlaceholder}
              fillHeight
            />
          </div>
          {descriptionExtras ? (
            <div className="shrink-0 space-y-3 border-t border-border/60 pt-3">
              {descriptionExtras}
            </div>
          ) : null}
        </section>
        {!isCompactOnly ? (
          <CardImageField
            value={cardImageUrl}
            onChange={onCardImageUrlChange}
            imageAspect="3/4"
            imageCrop={cardImageCrop}
            layout="paired"
            className="min-w-0"
          />
        ) : null}
      </div>
    </CompendiumEditorSection>
  )
}

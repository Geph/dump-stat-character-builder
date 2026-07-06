"use client"

import { CardImageField } from "@/components/compendium/card-image-field"
import { CompendiumEditorSection } from "@/components/compendium/compendium-editor-section"
import { RichTextEditor } from "@/components/compendium/rich-text-editor"
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
}

export function CompendiumDescriptionCardImageRow({
  description,
  onDescriptionChange,
  descriptionPlaceholder,
  cardImageUrl,
  onCardImageUrlChange,
  cardImageCrop = "center",
}: CompendiumDescriptionCardImageRowProps) {
  return (
    <CompendiumEditorSection title="Description & card art" collapsible defaultOpen>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <section
          className={cn(
            pageOverlayPanelClass,
            "p-4 flex flex-col min-h-0 min-w-0 h-full space-y-3",
          )}
        >
          <h3 className={pageOverlayPanelTitleClass}>Description</h3>
          <div className="flex-1 min-h-0 flex flex-col">
            <RichTextEditor
              value={description}
              onChange={onDescriptionChange}
              placeholder={descriptionPlaceholder}
              fillHeight
            />
          </div>
        </section>
        <CardImageField
          value={cardImageUrl}
          onChange={onCardImageUrlChange}
          imageAspect="3/4"
          imageCrop={cardImageCrop}
          layout="paired"
          className="min-w-0"
        />
      </div>
    </CompendiumEditorSection>
  )
}

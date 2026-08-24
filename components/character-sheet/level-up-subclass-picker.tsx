"use client"

import { useState } from "react"
import { CompendiumSelectionCard } from "@/components/compendium/compendium-selection-card"
import { CompendiumDetailOverlay } from "@/components/compendium/compendium-detail-overlay"
import { ClassDetailFeatureList } from "@/components/compendium/class-detail-feature-list"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { SwipeVisualPicker } from "@/components/builder/swipe-visual-picker"
import { getCinematicPickerContainerClass } from "@/lib/builder/picker-pagination"
import { subclassFeatureTitleRows } from "@/lib/builder/subclass-detail-display"
import { getCompendiumCardBlurb } from "@/lib/compendium/card-image"
import { getCompendiumDetailFlavor } from "@/lib/compendium/class-detail-flavor"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import { enrichSubclassDisplayDefaults } from "@/lib/compendium/enrich-subclass-display"
import {
  portraitDetailBody,
  portraitDetailEyebrow,
  portraitDetailHeading,
} from "@/lib/compendium/portrait-detail-typography"
import { compendiumAccentColorStyles, getCompendiumItemAccentColor } from "@/lib/compendium/theme-colors"
import { cn } from "@/lib/utils"
import type { Subclass } from "@/lib/types"

type LevelUpSubclassPickerProps = {
  subclasses: Subclass[]
  classId: string
  className: string
  unlockLevel: number
  selectedId: string | null
  onSelect: (id: string) => void
  /** Visual builder cards + details. Compact keeps the plain name list. */
  visual: boolean
  /** Portrait cards on `sm+`; swipe carousel on phones. */
  cinematicPortrait: boolean
  swipeOnPhone: boolean
}

export function LevelUpSubclassPicker({
  subclasses,
  classId,
  className,
  unlockLevel,
  selectedId,
  onSelect,
  visual,
  cinematicPortrait,
  swipeOnPhone,
}: LevelUpSubclassPickerProps) {
  const [details, setDetails] = useState<Subclass | null>(null)
  const options = subclasses.filter((sub) => sub.class_id === classId)

  return (
    <div>
      <p className="mb-2 text-sm font-semibold">
        Choose subclass (level {unlockLevel}+)
      </p>
      {visual ? (
        <SwipeVisualPicker enabled={swipeOnPhone} className={getCinematicPickerContainerClass(3)}>
          {options.map((subclass) => {
            const displaySubclass = enrichSubclassDisplayDefaults(subclass, className)
            const accent = getCompendiumItemAccentColor(
              displaySubclass as unknown as Record<string, unknown>,
            )
            const cardItem = {
              ...displaySubclass,
              icon:
                displaySubclass.icon?.trim() ||
                getCompendiumItemIcon("subclasses", {
                  ...(displaySubclass as unknown as Record<string, unknown>),
                  class_name: className,
                }),
            }
            return (
              <CompendiumSelectionCard
                key={subclass.id || subclass.name}
                item={cardItem}
                subtitle={displaySubclass.source || "Custom"}
                accentColor={accent}
                selected={selectedId === subclass.id}
                size="md"
                cardShape={cinematicPortrait ? "portrait" : "wide"}
                imageCrop="top"
                onSelect={() => onSelect(subclass.id)}
                onLearnMore={() => setDetails(displaySubclass)}
                showBlurb={false}
              />
            )
          })}
        </SwipeVisualPicker>
      ) : (
        <div className="grid gap-2">
          {options.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSelect(sub.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                selectedId === sub.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {details ? (
        <SubclassDetailsOverlay
          subclass={details}
          className={className}
          onClose={() => setDetails(null)}
        />
      ) : null}
    </div>
  )
}

function SubclassDetailsOverlay({
  subclass,
  className,
  onClose,
}: {
  subclass: Subclass
  className: string
  onClose: () => void
}) {
  const accent = getCompendiumItemAccentColor(subclass as unknown as Record<string, unknown>)
  const accentStyles = compendiumAccentColorStyles(accent)
  const features = subclassFeatureTitleRows(subclass.features ?? [])
  const flavor = getCompendiumDetailFlavor({ ...subclass, class_name: className }, "subclass")
  const cardItem = {
    ...subclass,
    icon:
      subclass.icon?.trim() ||
      getCompendiumItemIcon("subclasses", {
        ...(subclass as unknown as Record<string, unknown>),
        class_name: className,
      }),
  }

  return (
    <CompendiumDetailOverlay
      open
      onClose={onClose}
      item={cardItem}
      imageCrop="top"
      panelWidth="portrait"
      enableCardImage
      subtitle={className ? `${className} Subclass` : "Subclass"}
      tagline={getCompendiumCardBlurb(subclass).toUpperCase()}
      accentColor={accent}
      detailScroll
      backdropClassName="z-[220]"
    >
      <div className="space-y-6">
        <div>
          <p className={cn(portraitDetailEyebrow, accentStyles.cardFooterText)}>Subclass highlights</p>
          <h3 className={portraitDetailHeading}>What this path offers</h3>
          {flavor ? (
            <div className={cn("mt-1 text-white/75", portraitDetailBody)}>
              <RichTextContent html={flavor} />
            </div>
          ) : (
            <p className={cn("mt-1 text-white/75", portraitDetailBody)}>No description listed yet.</p>
          )}
        </div>
        <div>
          <h3 className={portraitDetailHeading}>Subclass features</h3>
          {features.length > 0 ? (
            <div className="mt-1">
              <ClassDetailFeatureList
                features={features}
                accentClassName={accentStyles.cardFooterText}
                comfortableFromMd
                showLevel
                accordion
              />
            </div>
          ) : (
            <p className={cn("mt-1 text-white/70", portraitDetailBody)}>No subclass features listed.</p>
          )}
        </div>
      </div>
    </CompendiumDetailOverlay>
  )
}

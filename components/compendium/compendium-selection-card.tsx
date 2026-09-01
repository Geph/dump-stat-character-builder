"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { GameIcon } from "@/components/game-icon-picker"
import {
  getCompendiumCardBlurb,
  getCompendiumCardImageUrl,
  compendiumCardHeroImageClass,
  CLASS_CARD_ASPECT_CLASS,
  WIDE_SELECTION_CARD_MIN_HEIGHT_CLASS,
  SELECTION_CARD_GRADIENT_CLASS,
  COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS,
  type CompendiumCardImageCrop,
  type CompendiumCardVisual,
} from "@/lib/compendium/card-image"
import {
  compendiumAccentColorStyles,
  type CompendiumThemeColorId,
} from "@/lib/compendium/theme-colors"
import { cn } from "@/lib/utils"

export type CompendiumCardTag = {
  label: string
  emphasis?: boolean
}

type CompendiumSelectionCardProps = {
  item: CompendiumCardVisual & { name: string }
  subtitle?: string
  description?: string | null
  tags?: CompendiumCardTag[]
  selected?: boolean
  /** When selected, primary = first class; secondary = additional multiclass levels. */
  selectionVariant?: "primary" | "secondary"
  disabled?: boolean
  badge?: ReactNode
  accentColor?: CompendiumThemeColorId | null
  onSelect?: () => void
  onLearnMore?: (e?: React.MouseEvent) => void
  learnMoreLabel?: string
  selectLabel?: string
  /** When false, hide the overlay blurb and lift the source label into that space. */
  showBlurb?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
  /** Wide landscape (default) or portrait 3:4 for visual builder grids from `sm` up. */
  cardShape?: "wide" | "portrait"
  /** @deprecated Always landscape; kept for call-site compatibility. */
  imageAspect?: "21/9"
  imageCrop?: CompendiumCardImageCrop
}

function CardContent({
  item,
  subtitle,
  tags,
  blurb,
  blurbLineClamp,
  showBlurb,
  selected,
  disabled,
  onSelect,
  onLearnMore,
  learnMoreLabel,
  selectLabel,
  accent,
  showLearnMoreButton,
}: {
  item: CompendiumCardVisual & { name: string }
  subtitle?: string
  tags: CompendiumCardTag[]
  blurb: string
  blurbLineClamp: string
  showBlurb: boolean
  selected: boolean
  disabled: boolean
  onSelect?: () => void
  onLearnMore?: (e?: React.MouseEvent) => void
  learnMoreLabel: string
  selectLabel: string
  accent: ReturnType<typeof compendiumAccentColorStyles>
  showLearnMoreButton: boolean
}) {
  const sourceLabel = subtitle?.trim() || item.source?.trim() || null

  return (
    <div className="relative z-10 flex flex-col">
      <h3 className="font-serif text-[1.35rem] font-black text-white leading-tight drop-shadow-md">
        {item.name}
      </h3>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className={cn(
                "rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                tag.emphasis
                  ? "border-primary/60 bg-primary/20 text-primary"
                  : "border-white/30 bg-black/30 text-white/90",
              )}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {showBlurb && blurb ? (
        <p
          className={cn(
            "mt-2 text-xs text-white/75 leading-relaxed max-sm:hidden",
            blurbLineClamp,
          )}
        >
          {blurb}
        </p>
      ) : sourceLabel ? (
        <p
          className={cn(
            "mt-2 truncate text-[10px] font-bold uppercase tracking-wider max-sm:hidden",
            accent.cardFooterText,
          )}
        >
          {sourceLabel}
        </p>
      ) : null}

      {(showBlurb || showLearnMoreButton || onSelect) ? (
      <div
        className={cn(
          "mt-3 flex items-center gap-3",
          showBlurb ? "justify-between max-sm:justify-end" : "justify-end",
        )}
      >
        {showBlurb && sourceLabel ? (
          <p
            className={cn(
              "min-w-0 truncate text-[10px] font-bold uppercase tracking-wider max-sm:hidden",
              accent.cardFooterText,
            )}
          >
            {sourceLabel}
          </p>
        ) : showBlurb ? (
          <span className="min-w-0 flex-1 max-sm:hidden" />
        ) : null}
        <div className="flex shrink-0 items-center gap-2">
          {showLearnMoreButton && onLearnMore && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onLearnMore(e)
              }}
              className="rounded border border-white/40 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 hover:bg-white/10 transition-colors"
            >
              {learnMoreLabel}
            </button>
          )}
          {onSelect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (!disabled) onSelect()
              }}
              className={cn(
                "rounded border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : cn(
                      "bg-black/30",
                      accent.cardFooterBorder,
                      accent.cardFooterText,
                      accent.cardFooterSelectHover,
                    ),
              )}
            >
              {selected ? "Selected" : selectLabel}
            </button>
          )}
        </div>
      </div>
      ) : null}
    </div>
  )
}

export function CompendiumSelectionCard({
  item,
  subtitle,
  description,
  tags = [],
  selected = false,
  selectionVariant = "primary",
  disabled = false,
  badge,
  accentColor = null,
  onSelect,
  onLearnMore,
  learnMoreLabel = "Details",
  selectLabel = "Select",
  className,
  size = "md",
  cardShape = "wide",
  imageAspect: _imageAspect = "21/9",
  imageCrop = "center",
  showBlurb = true,
}: CompendiumSelectionCardProps) {
  const imageUrl = getCompendiumCardImageUrl(item)
  const accent = compendiumAccentColorStyles(accentColor)
  const blurb = description ?? getCompendiumCardBlurb(item)
  const heroImageClass = compendiumCardHeroImageClass(imageCrop)
  const contentPaddingClass =
    size === "lg" ? "p-5 pt-3" : size === "md" ? "p-4 pt-3" : "p-3 pt-2"
  const blurbLineClamp = "line-clamp-3"
  const selectedBorderClass =
    selectionVariant === "secondary"
      ? "border-secondary ring-2 ring-secondary/40 shadow-secondary/20"
      : "border-primary ring-2 ring-primary/40 shadow-primary/20"

  const isPortrait = cardShape === "portrait"
  const detailsOnCard = Boolean(onLearnMore && !onSelect)
  const activateCard = onSelect ?? (detailsOnCard ? () => onLearnMore?.() : undefined)
  const cardShellClass = cn(
    "group relative flex w-full flex-col overflow-hidden rounded-lg text-left transition-shadow",
    "border-2 shadow-lg",
    isPortrait ? cn(CLASS_CARD_ASPECT_CLASS, "min-h-[240px]") : WIDE_SELECTION_CARD_MIN_HEIGHT_CLASS,
    selected
      ? selectedBorderClass
      : "border-primary/50 hover:border-primary/80 hover:shadow-xl",
    activateCard && !disabled && "cursor-pointer",
    disabled && "pointer-events-none opacity-50",
    className,
  )

  const cardShellProps = {
    role: activateCard ? ("button" as const) : undefined,
    tabIndex: activateCard && !disabled ? 0 : undefined,
    "aria-label": detailsOnCard ? `View ${item.name} details` : undefined,
    whileHover: disabled ? undefined : { scale: 1.02 },
    whileTap: disabled ? undefined : { scale: 0.98 },
    onClick: disabled ? undefined : activateCard,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!activateCard || disabled) return
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        activateCard()
      }
    },
    className: cardShellClass,
    style: {
      boxShadow: selected
        ? undefined
        : "inset 0 0 0 1px rgba(212, 175, 55, 0.15), 0 8px 32px rgba(0,0,0,0.45)",
    },
  }

  const contentProps = {
    item,
    subtitle,
    tags,
    blurb,
    blurbLineClamp,
    showBlurb,
    selected,
    disabled,
    onSelect,
    onLearnMore,
    learnMoreLabel,
    selectLabel,
    accent,
    showLearnMoreButton: Boolean(onLearnMore && onSelect),
  }

  return (
    <motion.div {...cardShellProps}>
      <div className="pointer-events-none absolute inset-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className={heroImageClass} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted/90 via-card to-background">
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.14] bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.9),transparent_42%),radial-gradient(circle_at_78%_78%,rgba(255,255,255,0.55),transparent_48%)]"
            />
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(135deg,transparent_40%,rgba(255,255,255,0.35)_50%,transparent_60%)]"
            />
          </div>
        )}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isPortrait ? COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS : SELECTION_CARD_GRADIENT_CLASS,
        )}
      />
      {item.icon && (
        <div className="absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/50 backdrop-blur-sm">
          <GameIcon name={item.icon} className={cn("h-6 w-6", accent.imageCardIconText)} />
        </div>
      )}
      {badge && <div className="absolute right-3 top-3 z-10">{badge}</div>}
      <div className={cn("relative z-10 flex flex-1 flex-col justify-end", contentPaddingClass)}>
        <CardContent {...contentProps} />
      </div>
    </motion.div>
  )
}

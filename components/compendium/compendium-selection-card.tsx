"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { GameIcon } from "@/components/game-icon-picker"
import {
  getCompendiumCardBlurb,
  getCompendiumCardImageUrl,
  CLASS_CARD_ASPECT_CLASS,
  WIDE_SELECTION_CARD_HERO_CLASS,
  WIDE_SELECTION_CARD_MIN_HEIGHT_CLASS,
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
  onLearnMore?: (e: React.MouseEvent) => void
  learnMoreLabel?: string
  selectLabel?: string
  className?: string
  size?: "sm" | "md" | "lg"
  /** Portrait 3:4 for classes; wide 21:9 hero + tall body for species and backgrounds. */
  imageAspect?: "3/4" | "21/9"
}

function CardContent({
  item,
  subtitle,
  tags,
  blurb,
  blurbLineClamp,
  selected,
  disabled,
  onSelect,
  onLearnMore,
  learnMoreLabel,
  selectLabel,
}: {
  item: CompendiumCardVisual & { name: string }
  subtitle?: string
  tags: CompendiumCardTag[]
  blurb: string
  blurbLineClamp: string
  selected: boolean
  disabled: boolean
  onSelect?: () => void
  onLearnMore?: (e: React.MouseEvent) => void
  learnMoreLabel: string
  selectLabel: string
}) {
  return (
    <div className="relative z-10 flex flex-col">
      {subtitle && (
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/90 mb-1">
          {subtitle}
        </p>
      )}
      <h3 className="font-serif text-2xl font-black text-white leading-tight drop-shadow-md">
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

      {blurb && (
        <p className={cn("mt-2 text-xs text-white/75 leading-relaxed", blurbLineClamp)}>{blurb}</p>
      )}

      {item.source && item.source !== subtitle && (
        <p className="mt-2 text-[10px] uppercase tracking-wide text-white/45">{item.source}</p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {onLearnMore && (
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
                : "border-primary/70 bg-black/40 text-primary hover:bg-primary/20",
            )}
          >
            {selected ? "Selected" : selectLabel}
          </button>
        )}
      </div>
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
  imageAspect = "3/4",
}: CompendiumSelectionCardProps) {
  const imageUrl = getCompendiumCardImageUrl(item)
  const accent = compendiumAccentColorStyles(accentColor)
  const blurb = description ?? getCompendiumCardBlurb(item)
  const isWideLayout = imageAspect === "21/9"
  const contentPaddingClass = isWideLayout
    ? size === "lg"
      ? "p-5 pt-3"
      : size === "md"
        ? "p-4 pt-3"
        : "p-3 pt-2"
    : size === "lg"
      ? "p-5 pt-14"
      : size === "md"
        ? "p-4 pt-12"
        : "p-3 pt-10"
  const blurbLineClamp = isWideLayout ? "line-clamp-3" : "line-clamp-2"
  const selectedBorderClass =
    selectionVariant === "secondary"
      ? "border-secondary ring-2 ring-secondary/40 shadow-secondary/20"
      : "border-primary ring-2 ring-primary/40 shadow-primary/20"

  const cardShellClass = cn(
    "group relative flex w-full flex-col overflow-hidden rounded-lg text-left transition-shadow",
    "border-2 shadow-lg",
    isWideLayout ? WIDE_SELECTION_CARD_MIN_HEIGHT_CLASS : CLASS_CARD_ASPECT_CLASS,
    selected
      ? selectedBorderClass
      : "border-primary/50 hover:border-primary/80 hover:shadow-xl",
    disabled && "pointer-events-none opacity-50",
    className,
  )

  const cardShellProps = {
    role: onSelect ? ("button" as const) : undefined,
    tabIndex: onSelect && !disabled ? 0 : undefined,
    whileHover: disabled ? undefined : { scale: 1.02 },
    whileTap: disabled ? undefined : { scale: 0.98 },
    onClick: disabled ? undefined : onSelect,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!onSelect || disabled) return
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onSelect()
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
    selected,
    disabled,
    onSelect,
    onLearnMore,
    learnMoreLabel,
    selectLabel,
  }

  if (isWideLayout) {
    return (
      <motion.div {...cardShellProps}>
        <div className={cn("relative w-full shrink-0 overflow-hidden", WIDE_SELECTION_CARD_HERO_CLASS)}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted/80 via-card to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-black" />
          {item.icon && (
            <div className="absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-black/50 backdrop-blur-sm">
              <GameIcon name={item.icon} className={cn("h-6 w-6", accent.iconText)} />
            </div>
          )}
          {badge && <div className="absolute right-3 top-3 z-10">{badge}</div>}
        </div>
        <div className={cn("relative flex flex-1 flex-col bg-gradient-to-b from-black via-black/95 to-black", contentPaddingClass)}>
          <CardContent {...contentProps} />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div {...cardShellProps}>
      <div className="absolute inset-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted/80 via-card to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
      </div>

      {item.icon && (
        <div className="absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-black/50 backdrop-blur-sm">
          <GameIcon name={item.icon} className={cn("h-6 w-6", accent.iconText)} />
        </div>
      )}

      {badge && <div className="absolute right-3 top-3 z-10">{badge}</div>}

      <div className={cn("relative z-10 mt-auto flex flex-1 flex-col justify-end", contentPaddingClass)}>
        <CardContent {...contentProps} />
      </div>
    </motion.div>
  )
}

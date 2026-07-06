"use client"

import {
  WIDE_CARD_ASPECT_CLASS,
  COMPENDIUM_LIST_CARD_GRADIENT_CLASS,
  DETAIL_OVERLAY_HERO_GRADIENT_CLASS,
  compendiumCardHeroImageClass,
  type CompendiumCardImageCrop,
} from "@/lib/compendium/card-image"
import { cn } from "@/lib/utils"

type CompendiumCardHeroProps = {
  imageUrl: string | null
  crop?: CompendiumCardImageCrop
  /** List cards fade into card body; overlays use a darker scrim. */
  variant?: "list" | "overlay"
  /** Fill parent height instead of fixed 21:9 aspect (detail overlay hero). */
  fillHeight?: boolean
  /** List card: image covers the entire card behind content. */
  fullBleed?: boolean
  /** Override list-card scrim (portrait vs landscape browse cards). */
  listGradientClass?: string
  className?: string
  minHeightClass?: string
  maxHeightClass?: string
}

export function CompendiumCardHero({
  imageUrl,
  crop = "center",
  variant = "list",
  fillHeight = false,
  fullBleed = false,
  listGradientClass,
  className,
  minHeightClass,
  maxHeightClass,
}: CompendiumCardHeroProps) {
  const imageClass = compendiumCardHeroImageClass(crop)

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        fullBleed ? "absolute inset-0" : "relative w-full shrink-0",
        !fullBleed && (fillHeight ? "h-full" : WIDE_CARD_ASPECT_CLASS),
        minHeightClass,
        maxHeightClass,
        className,
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className={imageClass} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/80 via-card to-background" />
      )}
      {variant === "list" ? (
        <div
          className={cn(
            "absolute inset-0",
            fullBleed
              ? (listGradientClass ?? COMPENDIUM_LIST_CARD_GRADIENT_CLASS)
              : "bg-gradient-to-t from-card via-card/60 to-transparent",
          )}
        />
      ) : (
        <div className={cn("absolute inset-0", DETAIL_OVERLAY_HERO_GRADIENT_CLASS)} />
      )}
    </div>
  )
}

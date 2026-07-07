"use client"

import type { ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { GameIcon } from "@/components/game-icon-picker"
import {
  getCompendiumCardImageUrl,
  type CompendiumCardImageCrop,
  type CompendiumCardVisual,
} from "@/lib/compendium/card-image"
import { CompendiumCardHero } from "@/components/compendium/compendium-card-hero"
import {
  compendiumAccentColorStyles,
  type CompendiumThemeColorId,
} from "@/lib/compendium/theme-colors"
import { cn } from "@/lib/utils"

/** Panel width derived from viewport height minus detail strip, at 3:4 hero ratio. */
const PORTRAIT_PANEL_WIDTH =
  "w-[min(90vw,calc((min(92vh,900px)-min(36vh,252px))*0.75))]"
/** Spell portrait previews — compact detail strip; hero and width expand accordingly. */
const PORTRAIT_SPELL_PANEL_WIDTH =
  "w-[min(90vw,calc((min(92vh,900px)-min(23.4vh,164px))*0.75))]"
/** Species portrait previews — detail strip is 20% shorter than class layout. */
const PORTRAIT_SPECIES_PANEL_WIDTH =
  "w-[min(90vw,calc((min(92vh,900px)-min(28.8vh,202px))*0.75))]"

const PORTRAIT_DETAIL_STRIP_CLASS = "h-[min(36vh,252px)] max-h-[min(36vh,252px)]"
const PORTRAIT_SPELL_DETAIL_STRIP_CLASS = "h-[min(23.4vh,164px)] max-h-[min(23.4vh,164px)]"
const PORTRAIT_SPECIES_DETAIL_STRIP_CLASS = "h-[min(28.8vh,202px)] max-h-[min(28.8vh,202px)]"

const PORTRAIT_PANEL_WIDTH_BY_VARIANT = {
  portrait: PORTRAIT_PANEL_WIDTH,
  "portrait-spell": PORTRAIT_SPELL_PANEL_WIDTH,
  "portrait-species": PORTRAIT_SPECIES_PANEL_WIDTH,
} as const

const PORTRAIT_DETAIL_STRIP_BY_VARIANT = {
  portrait: PORTRAIT_DETAIL_STRIP_CLASS,
  "portrait-spell": PORTRAIT_SPELL_DETAIL_STRIP_CLASS,
  "portrait-species": PORTRAIT_SPECIES_DETAIL_STRIP_CLASS,
} as const

type PortraitPanelWidth = keyof typeof PORTRAIT_PANEL_WIDTH_BY_VARIANT

export type CompendiumDetailTag = {
  label: string
  emphasis?: boolean
}

type CompendiumDetailOverlayProps = {
  open: boolean
  onClose: () => void
  item: CompendiumCardVisual & { name: string }
  subtitle?: string
  tagline?: string
  tags?: CompendiumDetailTag[]
  accentColor?: CompendiumThemeColorId | null
  /** When false, the detail strip clips instead of scrolling (compact class layout). */
  detailScroll?: boolean
  /** When false, hero/card art is hidden even if card_image_url is set. */
  enableCardImage?: boolean
  headerActions?: ReactNode
  children: ReactNode
  /** Portrait class art uses top crop inside the landscape banner. */
  imageCrop?: CompendiumCardImageCrop
  /** Default 80vw; narrow 64vw; slim 48vw; portrait variants tune detail strip height. */
  panelWidth?: "default" | "narrow" | "slim" | PortraitPanelWidth
}

export function CompendiumDetailOverlay({
  open,
  onClose,
  item,
  subtitle,
  tagline,
  tags = [],
  accentColor = null,
  headerActions,
  children,
  imageCrop = "center",
  detailScroll = true,
  enableCardImage = true,
  panelWidth = "default",
}: CompendiumDetailOverlayProps) {
  const imageUrl = enableCardImage ? getCompendiumCardImageUrl(item) : null
  const accent = compendiumAccentColorStyles(accentColor)
  const isPortraitPanel = panelWidth in PORTRAIT_PANEL_WIDTH_BY_VARIANT
  const portraitPanelVariant = isPortraitPanel ? (panelWidth as PortraitPanelWidth) : null
  const panelWidthClass = portraitPanelVariant
    ? PORTRAIT_PANEL_WIDTH_BY_VARIANT[portraitPanelVariant]
    : panelWidth === "slim"
      ? "w-[min(48vw,420px)] max-w-[min(48vw,420px)]"
      : panelWidth === "narrow"
        ? "w-[64vw] max-w-[64vw]"
        : "w-[80vw] max-w-[80vw]"
  const viewportPanelHeightClass = "h-[min(92vh,900px)] max-h-[min(92vh,900px)]"

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/80 p-2 sm:p-4 md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "relative flex flex-col overflow-hidden rounded-xl border-2 border-primary/50 bg-card shadow-2xl",
              viewportPanelHeightClass,
              panelWidthClass,
            )}
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "inset 0 0 0 1px rgba(212, 175, 55, 0.2), 0 24px 80px rgba(0,0,0,0.65)" }}
          >
            <div
              className={cn(
                "relative min-h-0 w-full overflow-hidden",
                isPortraitPanel ? "flex-1" : "flex-[3]",
              )}
            >
              <div className="relative h-full w-full overflow-hidden">
                <CompendiumCardHero
                  imageUrl={imageUrl}
                  crop={imageCrop}
                  variant="overlay"
                  fillHeight
                />

                <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    {item.icon && (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-black/50 backdrop-blur-sm">
                        <GameIcon name={item.icon} className={cn("h-7 w-7", accent.imageCardIconText)} />
                      </div>
                    )}
                    {headerActions}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-white/20 bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 sm:px-6 sm:pb-6">
                  {subtitle && (
                    <p
                      className={cn(
                        "text-xs font-bold uppercase tracking-[0.25em]",
                        accent.cardFooterText,
                      )}
                    >
                      {subtitle}
                    </p>
                  )}
                  <h2 className="mt-1 font-serif text-4xl sm:text-5xl font-black text-white drop-shadow-lg">
                    {item.name}
                  </h2>
                  {tagline && (
                    <p className="mt-2 text-sm sm:text-base font-semibold uppercase tracking-wide text-white/80">
                      {tagline}
                    </p>
                  )}
                  {tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag.label}
                          className={cn(
                            "rounded border px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
                            tag.emphasis
                              ? cn(accent.cardFooterBorder, "bg-black/35", accent.cardFooterText)
                              : "border-white/35 bg-black/35 text-white",
                          )}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              className={cn(
                "relative z-10 min-h-0 w-full shrink-0 border-t",
                isPortraitPanel && portraitPanelVariant
                  ? cn(
                      PORTRAIT_DETAIL_STRIP_BY_VARIANT[portraitPanelVariant],
                      "overflow-x-hidden overflow-y-auto",
                    )
                  : "flex-1",
                accent.detailStripBg,
                accent.detailStripBorder,
                !isPortraitPanel && detailScroll ? "overflow-y-auto" : undefined,
                !isPortraitPanel && !detailScroll ? "overflow-hidden" : undefined,
                isPortraitPanel && !detailScroll ? "overflow-hidden" : undefined,
              )}
            >
              <div
                className={cn(
                  "p-3 sm:p-4 text-white/90 [&_.text-muted-foreground]:text-white/70 [&_.text-foreground]:text-white",
                  isPortraitPanel && "p-2.5 sm:p-3",
                  !detailScroll && "h-full overflow-hidden",
                )}
              >
                {children}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

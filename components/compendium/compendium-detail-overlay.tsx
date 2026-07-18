"use client"

import { useEffect, useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, X } from "lucide-react"
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

/** Class/species portrait — full hero with slide-up detail below `lg`; art left + detail right from `lg` up. */
const PORTRAIT_COMPENDIUM_PANEL_WIDTH =
  "w-[min(90vw,calc(min(92vh,900px)*0.75))] lg:w-[min(90vw,calc(min(92vh,900px)*0.75+min(34vw,360px)))]"
/** Spell portrait previews — compact detail strip; hero and width expand accordingly. */
const PORTRAIT_SPELL_PANEL_WIDTH =
  "w-[min(90vw,calc((min(92vh,900px)-min(23.4vh,164px))*0.75))]"

const PORTRAIT_SPELL_DETAIL_STRIP_CLASS = "h-[min(23.4vh,164px)] max-h-[min(23.4vh,164px)]"

const PORTRAIT_PANEL_WIDTH_BY_VARIANT = {
  portrait: PORTRAIT_COMPENDIUM_PANEL_WIDTH,
  "portrait-species": PORTRAIT_COMPENDIUM_PANEL_WIDTH,
  "portrait-spell": PORTRAIT_SPELL_PANEL_WIDTH,
} as const

const PORTRAIT_DETAIL_STRIP_BY_VARIANT = {
  "portrait-spell": PORTRAIT_SPELL_DETAIL_STRIP_CLASS,
} as const

type PortraitPanelWidth = keyof typeof PORTRAIT_PANEL_WIDTH_BY_VARIANT

export type CompendiumDetailTag = {
  label: string
  emphasis?: boolean
  themeColor?: CompendiumThemeColorId
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
  /** Default 80vw; narrow 64vw; slim 48vw; compact = text-only dialog; portrait variants tune detail strip height. */
  panelWidth?: "default" | "narrow" | "slim" | "compact" | PortraitPanelWidth
  /** `balanced` splits hero and detail strip evenly (background wide cards). */
  heroLayout?: "default" | "balanced"
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
  heroLayout = "default",
}: CompendiumDetailOverlayProps) {
  const isCompactPanel = panelWidth === "compact"
  const imageUrl = !isCompactPanel && enableCardImage ? getCompendiumCardImageUrl(item) : null
  const accent = compendiumAccentColorStyles(accentColor)
  const isPortraitPanel = panelWidth in PORTRAIT_PANEL_WIDTH_BY_VARIANT
  const portraitPanelVariant = isPortraitPanel ? (panelWidth as PortraitPanelWidth) : null
  const isPortraitCompendiumPanel =
    portraitPanelVariant === "portrait" || portraitPanelVariant === "portrait-species"
  const panelWidthClass = isCompactPanel
    ? "w-[min(92vw,28rem)] max-w-[min(92vw,28rem)]"
    : portraitPanelVariant
      ? PORTRAIT_PANEL_WIDTH_BY_VARIANT[portraitPanelVariant]
      : panelWidth === "slim"
        ? "w-[min(48vw,420px)] max-w-[min(48vw,420px)]"
        : panelWidth === "narrow"
          ? "w-[64vw] max-w-[64vw]"
          : "w-[80vw] max-w-[80vw]"
  const isBalancedHero = heroLayout === "balanced"
  const [portraitDetailSheetOpen, setPortraitDetailSheetOpen] = useState(false)

  useEffect(() => {
    if (!open) setPortraitDetailSheetOpen(false)
  }, [open])

  const viewportPanelHeightClass = isCompactPanel
    ? "max-h-[min(80vh,36rem)]"
    : "h-[min(92vh,900px)] max-h-[min(92vh,900px)]"

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "relative flex overflow-hidden rounded-xl border-2 border-primary/50 bg-card shadow-2xl",
              isCompactPanel
                ? cn("my-auto flex-col", accent.detailStripBg, accent.detailStripBorder)
                : isPortraitCompendiumPanel
                  ? "flex-col lg:flex-row"
                  : "flex-col",
              viewportPanelHeightClass,
              panelWidthClass,
            )}
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "inset 0 0 0 1px rgba(212, 175, 55, 0.2), 0 24px 80px rgba(0,0,0,0.65)" }}
          >
            {isCompactPanel ? (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-white/15 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex items-start gap-3">
                    {item.icon ? (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/35 bg-black/40">
                        <GameIcon name={item.icon} className={cn("h-5 w-5", accent.imageCardIconText)} />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      {subtitle ? (
                        <p
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-[0.2em]",
                            accent.cardFooterText,
                          )}
                        >
                          {subtitle}
                        </p>
                      ) : null}
                      <h2 className="mt-0.5 font-serif text-xl font-black leading-tight text-white">
                        {item.name}
                      </h2>
                      {tagline ? (
                        <p className="mt-1 text-xs font-medium text-white/75">{tagline}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    {headerActions}
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-full border border-white/20 bg-black/40 p-1.5 text-white/80 transition-colors hover:bg-black/60 hover:text-white"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm text-white/90 sm:px-5 sm:py-4",
                    "[&_.text-muted-foreground]:text-white/70 [&_.text-foreground]:text-white",
                  )}
                >
                  {children}
                </div>
              </>
            ) : (
              <>
            {isPortraitCompendiumPanel ? (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-20 hidden rounded-full border border-white/20 bg-black/40 p-2 text-white/80 transition-colors hover:bg-black/60 hover:text-white sm:top-4 sm:right-4 lg:block"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
            <div
              className={cn(
                "relative min-h-0 overflow-hidden",
                isPortraitCompendiumPanel && "h-full w-full lg:h-full lg:w-auto lg:shrink-0 lg:flex-none",
                !isPortraitCompendiumPanel &&
                  (isPortraitPanel || isBalancedHero ? "w-full flex-1" : "w-full flex-[3]"),
              )}
            >
              <div
                className={cn(
                  "relative overflow-hidden",
                  isPortraitCompendiumPanel
                    ? "h-full w-full lg:aspect-[3/4] lg:h-full lg:max-h-full"
                    : "h-full w-full",
                )}
              >
                <CompendiumCardHero
                  imageUrl={imageUrl}
                  crop={imageCrop}
                  variant="overlay"
                  fillHeight
                />

                <div
                  className={cn(
                    "absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 sm:p-6",
                    isPortraitCompendiumPanel ? "z-50" : "z-10",
                  )}
                >
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
                    className={cn(
                      "rounded-full border border-white/20 bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white transition-colors",
                      isPortraitCompendiumPanel && "lg:hidden",
                    )}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 z-10 px-4 sm:px-6",
                    isPortraitCompendiumPanel ? "pb-4 max-lg:pb-20 lg:pb-6" : "pb-4 sm:pb-6",
                  )}
                >
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
                    <div
                      className={cn(
                        "mt-3 flex flex-wrap gap-2",
                        isPortraitCompendiumPanel && "max-lg:mb-2",
                      )}
                    >
                      {tags.map((tag) => {
                        const tagAccent = tag.themeColor
                          ? compendiumAccentColorStyles(tag.themeColor)
                          : accent
                        const emphasized = tag.emphasis || Boolean(tag.themeColor)
                        return (
                          <span
                            key={tag.label}
                            className={cn(
                              "rounded border px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
                              emphasized
                                ? cn(tagAccent.cardFooterBorder, "bg-black/35", tagAccent.cardFooterText)
                                : "border-white/35 bg-black/35 text-white",
                            )}
                          >
                            {tag.label}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isPortraitCompendiumPanel ? (
              <button
                type="button"
                onClick={() => setPortraitDetailSheetOpen((open) => !open)}
                className={cn(
                  "absolute left-1/2 z-40 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70 lg:hidden",
                  portraitDetailSheetOpen ? "top-4" : "bottom-3",
                )}
                aria-expanded={portraitDetailSheetOpen}
                aria-label={portraitDetailSheetOpen ? "Hide details" : "Show details"}
              >
                {portraitDetailSheetOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronUp className="h-5 w-5" />
                )}
              </button>
            ) : null}

            <div
              className={cn(
                "relative z-10 min-h-0 w-full shrink-0",
                isPortraitCompendiumPanel &&
                  cn(
                    "max-lg:absolute max-lg:inset-0 max-lg:z-30 max-lg:flex max-lg:flex-col max-lg:overflow-hidden max-lg:transition-transform max-lg:duration-300 max-lg:ease-out",
                    portraitDetailSheetOpen ? "max-lg:translate-y-0" : "max-lg:translate-y-full",
                  ),
                isPortraitCompendiumPanel &&
                  "lg:relative lg:min-w-0 lg:flex-1 lg:translate-y-0 lg:overflow-y-auto lg:border-l lg:border-t-0",
                isPortraitPanel &&
                  portraitPanelVariant &&
                  !isPortraitCompendiumPanel &&
                  cn(
                    PORTRAIT_DETAIL_STRIP_BY_VARIANT[portraitPanelVariant],
                    "overflow-x-hidden overflow-y-auto border-t",
                  ),
                !isPortraitPanel && "min-h-0 flex-1 border-t",
                isBalancedHero && "overflow-y-auto border-t",
                accent.detailStripBg,
                accent.detailStripBorder,
                !isPortraitPanel && !isPortraitCompendiumPanel && detailScroll ? "overflow-y-auto" : undefined,
                !isPortraitPanel && !isPortraitCompendiumPanel && !detailScroll ? "overflow-hidden" : undefined,
                isPortraitPanel && !isPortraitCompendiumPanel && !detailScroll ? "overflow-hidden" : undefined,
              )}
            >
              <div
                className={cn(
                  "text-white/90 [&_.text-muted-foreground]:text-white/70 [&_.text-foreground]:text-white",
                  isPortraitCompendiumPanel
                    ? "max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto max-lg:px-3 max-lg:pb-14 max-lg:pt-24 lg:px-3 lg:py-3 lg:pr-14 lg:pt-4"
                    : cn(isPortraitPanel && "p-2.5 sm:p-3", !isPortraitPanel && "p-3 sm:p-4"),
                  !detailScroll && "h-full overflow-hidden",
                )}
              >
                {children}
              </div>
            </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

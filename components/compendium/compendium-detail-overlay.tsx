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
}: CompendiumDetailOverlayProps) {
  const imageUrl = enableCardImage ? getCompendiumCardImageUrl(item) : null
  const accent = compendiumAccentColorStyles(accentColor)

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
            className="relative flex h-[min(92vh,900px)] max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border-2 border-primary/50 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "inset 0 0 0 1px rgba(212, 175, 55, 0.2), 0 24px 80px rgba(0,0,0,0.65)" }}
          >
            <div className="relative min-h-0 flex-[3] overflow-hidden">
              <CompendiumCardHero
                imageUrl={imageUrl}
                crop={imageCrop}
                variant="overlay"
                fillHeight
              />

              <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  {item.icon && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-black/50 backdrop-blur-sm">
                      <GameIcon name={item.icon} className={cn("h-7 w-7", accent.iconText)} />
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
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary/90">
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
                            ? "border-primary/60 bg-primary/25 text-primary"
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

            {/* Detail strip — 25% of overlay height */}
            <div
              className={cn(
                "relative z-10 min-h-0 flex-[1] border-t",
                accent.detailStripBg,
                accent.detailStripBorder,
                detailScroll ? "overflow-y-auto" : "overflow-hidden",
              )}
            >
              <div
                className={cn(
                  "p-3 sm:p-4 text-white/90 [&_.text-muted-foreground]:text-white/70 [&_.text-foreground]:text-white",
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

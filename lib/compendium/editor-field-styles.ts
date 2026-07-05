/** Shared single-line control styling for compendium editors. */
export const compendiumFieldClass =
  "w-full px-4 py-3 bg-card border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary"

/** Square icon picker button — matches compendiumFieldClass control height. */
export const compendiumIconButtonClass =
  "size-[50px] shrink-0 rounded-xl border-2 border-border bg-card flex items-center justify-center hover:border-primary transition-colors overflow-hidden"

/** Semi-opaque panel over the decorative page background. */
export const pageOverlayPanelClass =
  "rounded-xl border-2 border-border/90 bg-card/92 backdrop-blur-md shadow-sm"

export const pageOverlayPanelTitleClass = "text-sm font-semibold text-foreground"

export const pageOverlayPanelHintClass = "text-xs text-foreground/80 mt-1 leading-relaxed"

export const pageOverlayPanelMetaClass = "text-xs text-foreground/72"

/** Stat/count line under page titles. */
export const pageHeaderStatBadgeClass = "text-muted-foreground text-lg"

/** Back/navigation link on content pages. */
export const pageBackLinkClass =
  "inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"

/** Descriptive subtitle under top-level page titles. */
export const pageHeaderSubtitleClass = "text-muted-foreground text-lg max-w-3xl"

/** Smaller hint/helper copy under page titles. */
export const pageFloatingHintClass = "text-sm text-muted-foreground leading-relaxed max-w-3xl"

/** Builder step nav container (no background strip). */
export const pageStepStripClass = "mb-2"

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

/** Stat/count chip for page headers over decorative backgrounds. */
export const pageHeaderStatBadgeClass =
  "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-sky/30 text-foreground border border-sky/45 backdrop-blur-sm shadow-sm"

/** Back/navigation link chip readable over decorative page backgrounds. */
export const pageBackLinkClass =
  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-foreground bg-card/92 border border-border/90 backdrop-blur-md shadow-sm hover:bg-card transition-colors"

const pageFloatingTextBase =
  "inline-block px-3 py-1.5 rounded-lg font-medium text-foreground bg-card/92 border border-border/90 backdrop-blur-md shadow-sm"

/** Descriptive subtitle under top-level page titles. */
export const pageHeaderSubtitleClass =
  `${pageFloatingTextBase} max-w-3xl text-base sm:text-lg leading-snug`

/** Smaller hint/helper copy floating over decorative page backgrounds. */
export const pageFloatingHintClass = `${pageFloatingTextBase} max-w-3xl text-sm leading-relaxed`

/** Full-width horizontal strip over decorative page backgrounds (e.g. builder step nav). */
export const pageStepStripClass =
  "w-full bg-card/92 backdrop-blur-md border-b border-border/90 shadow-sm"

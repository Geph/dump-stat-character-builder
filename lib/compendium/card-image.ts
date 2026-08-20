import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"
import { getCompendiumItemAccentColor } from "@/lib/compendium/theme-colors"
import { SRD_CLASS_CARD_BLURBS } from "@/lib/srd/class-card-blurbs"
import { KIBBLES_CLASS_CARD_BLURBS } from "@/lib/seed-packs/kibbles-tasty/class-card-blurbs"

import { filterAvailableDefaultCardImageUrl } from "@/lib/compendium/available-card-art"
import type { CompendiumContentType } from "@/lib/compendium/content-types"
import { isCommonModifiersCatalogAbility } from "@/lib/compendium/modifier-catalog"
import { areCompendiumImagesEnabled, shouldAssignBundledCardArt } from "@/lib/site-settings/app-presentation-mode"
import { areDefaultMidjourneyGraphicsDisabled } from "@/lib/site-settings/default-midjourney-graphics"
import { getBuilderLayout } from "@/lib/site-settings/builder-layout"
import { isSrdSource } from "@/lib/srd/source"

/** Card / detail hero art — URL or data URL. */
export const CLASS_CARD_IMAGE_ASPECT = "3:4 portrait (classes — top-cropped in banner)"
export const WIDE_CARD_IMAGE_ASPECT = "21:9 landscape"
export const CLASS_CARD_ASPECT_CLASS = "aspect-[3/4]"
export const WIDE_CARD_ASPECT_CLASS = "aspect-[21/9]"
/** Hero band for compendium list cards, selection cards, and detail overlays. */
export const WIDE_SELECTION_CARD_HERO_CLASS = "aspect-[21/9]"
export const WIDE_SELECTION_CARD_MIN_HEIGHT_CLASS = "min-h-[300px]"
/** Compendium browse cards — image fills the card; bottom half scrims for text legibility. */
export const COMPENDIUM_LIST_CARD_MIN_HEIGHT_CLASS = "min-h-[280px]"
/** Classes tab — 25% taller when card art is present (280 → 350). */
export const COMPENDIUM_CLASS_LIST_CARD_MIN_HEIGHT_CLASS = "min-h-[350px]"
/** Landscape browse cards — bottom scrim for text legibility. */
export const COMPENDIUM_LIST_CARD_GRADIENT_CLASS =
  "bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.85)_40%,rgba(0,0,0,0.45)_46%,transparent_50%)]"
/** Portrait / graphic browse cards — top 65% clear; 15% ramp; bottom 20% at 80% black (20% transparent). */
export const COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS =
  "bg-[linear-gradient(to_top,rgba(0,0,0,0.8)_0%,rgba(0,0,0,0.8)_20%,transparent_35%)]"
/** Spell and background graphic browse cards — top 60% clear; 20% ramp; bottom 20% at 80% black. */
export const COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS =
  "bg-[linear-gradient(to_top,rgba(0,0,0,0.8)_0%,rgba(0,0,0,0.8)_20%,transparent_40%)]"
/** Builder selection cards — clear top 40%, then ramp to 80% black at the bottom. */
export const SELECTION_CARD_GRADIENT_CLASS =
  "bg-[linear-gradient(to_bottom,transparent_0%,transparent_40%,rgba(0,0,0,0.45)_54%,rgba(0,0,0,0.8)_100%)]"
/** Detail overlay hero — dark band for title/tags; taller scrim below `lg` for phone portrait. */
export const DETAIL_OVERLAY_HERO_GRADIENT_CLASS =
  "bg-[linear-gradient(to_top,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.7)_18%,rgba(0,0,0,0.32)_22%,transparent_25%)] max-lg:bg-[linear-gradient(to_top,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.7)_30%,rgba(0,0,0,0.38)_40%,transparent_48%)]"
export const CARD_IMAGE_ASPECT_LABEL = `${WIDE_CARD_IMAGE_ASPECT} (recommended); ${CLASS_CARD_IMAGE_ASPECT}`
export const CARD_IMAGE_RECOMMENDED = "840×360px landscape, or 600×800px portrait for classes (top crop in banner)"
export const PORTRAIT_CARD_IMAGE_HINT = `${CLASS_CARD_IMAGE_ASPECT} · 600×800px recommended`

export type CompendiumCardImageCrop = "top" | "center" | "height"


/** Max characters for the two-line card blurb (`line-clamp-2 text-xs`). */
export const COMPENDIUM_CARD_BLURB_MAX_LENGTH = 120

export type CompendiumCardVisual = {
  name?: string
  description?: string | null
  card_blurb?: string | null
  source?: string | null
  icon?: string | null
  accent_color?: string | null
  card_image_url?: string | null
}

export function normalizeCardImageUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url.trim()) return null
  const trimmed = rewriteLegacyDumpstatCardImageUrl(url.trim())
  if (trimmed.startsWith("data:image/")) {
    return trimmed.length <= 4_000_000 ? trimmed : null
  }
  return trimmed.length <= 4096 ? trimmed : null
}

/**
 * Older Mage Hand Press stamps omitted `/images/` in the dumpstat path.
 * Rewrite to the live hosting location so cards resolve.
 */
export function rewriteLegacyDumpstatCardImageUrl(url: string): string {
  return url.replace(
    /^(https?:\/\/jeffginger\.com\/dumpstat)\/magehandpress\//i,
    "$1/images/magehandpress/",
  )
}

export function getCompendiumCardImageUrl(item: CompendiumCardVisual): string | null {
  const url = normalizeCardImageUrl(item.card_image_url)
  if (!url) return null
  if (
    areDefaultMidjourneyGraphicsDisabled() &&
    (isBundledCompendiumCardImagePath(url) || isHostedDumpstatCardImageUrl(url))
  ) {
    return null
  }
  // PHB / setting portraits only render when present locally (not on GitHub seed clones).
  return filterAvailableDefaultCardImageUrl(url)
}

/** Compendium tabs that may show card background art in browse/detail surfaces. */
export function compendiumTabSupportsCardImage(tab: CompendiumContentType): boolean {
  return (
    tab === "classes" ||
    tab === "subclasses" ||
    tab === "species" ||
    tab === "backgrounds" ||
    tab === "spells" ||
    tab === "magic_items" ||
    tab === "abilities"
  )
}

/** Whether a row in a given tab should render card background art. */
export function compendiumItemSupportsCardImage(
  tab: CompendiumContentType,
  item: Record<string, unknown>,
): boolean {
  if (!compendiumTabSupportsCardImage(tab)) return false
  if (
    tab === "abilities" &&
    isCommonModifiersCatalogAbility(item as { id?: string; is_system?: boolean })
  ) {
    return false
  }
  return true
}

/**
 * Browse/detail card art follows Compact Only (splash) and the shared Visual/Compact
 * layout preference used by the builder and compendium.
 */
export function areBrowseCardImagesEnabled(): boolean {
  if (typeof window === "undefined") return true
  if (!areCompendiumImagesEnabled()) return false
  return getBuilderLayout() === "visual"
}

export function resolveCompendiumCardImageUrl(
  item: CompendiumCardVisual & Record<string, unknown>,
  tab: CompendiumContentType | null | undefined,
): string | null {
  if (!areBrowseCardImagesEnabled()) return null
  if (tab != null && !compendiumItemSupportsCardImage(tab, item)) return null
  return getCompendiumCardImageUrl(item)
}

/** True when the URL is app-bundled card art under /images/compendium/ (safe to upgrade). */
export function isBundledCompendiumCardImagePath(url: string): boolean {
  return /(?:^|\/)images\/compendium\//.test(url)
}

/**
 * Leftover auto-import dumpstat hosts that should yield to bundled `/images/compendium` art.
 * Intentional custom art under `/dumpstat/images/` is kept (after legacy path rewrites).
 */
export function isHostedDumpstatCardImageUrl(url: string): boolean {
  if (!/jeffginger\.com\/dumpstat\//i.test(url)) return false
  return !/jeffginger\.com\/dumpstat\/images\//i.test(url)
}

function isUpgradeableDefaultCardImage(url: string): boolean {
  return isBundledCompendiumCardImagePath(url) || isHostedDumpstatCardImageUrl(url)
}

/**
 * Keep true custom card art; otherwise apply defaults by item name for SRD-sourced rows.
 * Bundled `/images/compendium/…` paths and leftover dumpstat hosts outside `/dumpstat/images/`
 * are treated as upgradeable defaults.
 * Compact Only skips assigning bundled defaults (and clears upgradeable URLs).
 */
export function applySrdCardImage(
  row: Record<string, unknown>,
  defaults: Record<string, string>,
): Record<string, unknown> {
  const existing = normalizeCardImageUrl(row.card_image_url)
  if (!shouldAssignBundledCardArt()) {
    if (existing && isUpgradeableDefaultCardImage(existing)) {
      return { ...row, card_image_url: null }
    }
    return existing ? { ...row, card_image_url: existing } : row
  }
  const card_image_url = filterAvailableDefaultCardImageUrl(
    defaults[String(row.name ?? "").trim()] ?? null,
  )
  if (existing && !isUpgradeableDefaultCardImage(existing)) {
    return { ...row, card_image_url: existing }
  }
  if (!isSrdSource(row.source as string | null | undefined)) {
    if (existing && isHostedDumpstatCardImageUrl(existing)) {
      return { ...row, card_image_url: null }
    }
    return existing ? { ...row, card_image_url: existing } : row
  }
  if (card_image_url) return { ...row, card_image_url }
  if (existing && isHostedDumpstatCardImageUrl(existing)) {
    return { ...row, card_image_url: null }
  }
  // Drop stale local-only defaults when the file is not on this install.
  if (existing && isBundledCompendiumCardImagePath(existing) && !filterAvailableDefaultCardImageUrl(existing)) {
    return { ...row, card_image_url: null }
  }
  return existing ? { ...row, card_image_url: existing } : row
}

/**
 * Keep true custom card art; otherwise apply bundled defaults by item **name** (any source).
 * Source labels are ignored so Ravenloft/Planescape rows mis-tagged as PHB still match.
 * Leftover dumpstat hosts outside `/dumpstat/images/` are replaced by a local default or cleared.
 * Compact Only skips assigning bundled defaults (and clears upgradeable URLs).
 * Local-only portraits (PHB, Eberron, …) assign only when the optimized file exists here.
 */
export function applyBundledCardImage(
  row: Record<string, unknown>,
  defaults: Record<string, string>,
): Record<string, unknown> {
  const existing = normalizeCardImageUrl(row.card_image_url)
  if (!shouldAssignBundledCardArt()) {
    if (existing && isUpgradeableDefaultCardImage(existing)) {
      return { ...row, card_image_url: null }
    }
    return existing ? { ...row, card_image_url: existing } : row
  }
  const card_image_url = filterAvailableDefaultCardImageUrl(
    defaults[String(row.name ?? "").trim()] ?? null,
  )
  if (existing && !isUpgradeableDefaultCardImage(existing)) {
    return { ...row, card_image_url: existing }
  }
  if (card_image_url) return { ...row, card_image_url }
  if (existing && isHostedDumpstatCardImageUrl(existing)) {
    return { ...row, card_image_url: null }
  }
  if (existing && isBundledCompendiumCardImagePath(existing) && !filterAvailableDefaultCardImageUrl(existing)) {
    return { ...row, card_image_url: null }
  }
  return existing ? { ...row, card_image_url: existing } : row
}

/** Compendium tabs that use portrait (3:4) card art in browse grids. */
export const COMPENDIUM_PORTRAIT_CARD_TABS = new Set<CompendiumContentType>([
  "classes",
  "species",
  "subclasses",
  "spells",
])

export function compendiumUsesPortraitCardArt(tab: CompendiumContentType): boolean {
  return COMPENDIUM_PORTRAIT_CARD_TABS.has(tab)
}

/** Browse card with portrait (3:4) art when card_image_url is set. */
export function isCompendiumPortraitGraphicCard(
  tab: CompendiumContentType,
  cardImage: string | null | undefined,
): boolean {
  return Boolean(cardImage) && compendiumUsesPortraitCardArt(tab)
}

/** Graphic cards that use the 65/15/20 bottom scrim (portrait tabs + backgrounds with art). */
export function usesCompendiumGraphicCardGradient(
  tab: CompendiumContentType,
  cardImage: string | null | undefined,
): boolean {
  if (!cardImage) return false
  if (compendiumUsesPortraitCardArt(tab)) return true
  return tab === "backgrounds"
}

export function hidesCompendiumBrowseCardIcon(
  tab: CompendiumContentType,
  cardImage: string | null | undefined,
): boolean {
  return usesCompendiumGraphicCardGradient(tab, cardImage)
}

export function compendiumGraphicCardListGradientClass(
  tab: CompendiumContentType,
  cardImage: string | null | undefined,
): string {
  if (!usesCompendiumGraphicCardGradient(tab, cardImage)) {
    return COMPENDIUM_LIST_CARD_GRADIENT_CLASS
  }
  if (tab === "spells" || tab === "backgrounds") {
    return COMPENDIUM_SPELL_BACKGROUND_CARD_GRADIENT_CLASS
  }
  return COMPENDIUM_PORTRAIT_CARD_GRADIENT_CLASS
}

/** @deprecated Use compendiumGraphicCardListGradientClass */
export function compendiumPortraitListGradientClass(
  tab: CompendiumContentType,
  cardImage: string | null | undefined,
): string {
  return compendiumGraphicCardListGradientClass(tab, cardImage)
}

/** Browse grid: 1 col on phones; more columns only from tablet widths up. */
export function compendiumBrowseGridClass(_tab: CompendiumContentType): string {
  return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
}

/** Portrait class/species/spell art is top-cropped; widescreen tabs use center framing. */
export function compendiumCardImageCropForType(
  tab: CompendiumContentType,
  cardImage?: string | null,
): CompendiumCardImageCrop {
  if (cardImage && compendiumUsesPortraitCardArt(tab)) return "top"
  return tab === "classes" || tab === "subclasses" || tab === "species" || tab === "spells"
    ? "top"
    : "center"
}

export function compendiumCardHeroImageClass(crop: CompendiumCardImageCrop = "center"): string {
  if (crop === "top") {
    return "absolute inset-0 h-full w-full object-cover object-top"
  }
  if (crop === "height") {
    // Scale to the frame height so the full graphic is visible; overflow clips the sides.
    return "absolute inset-y-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2"
  }
  return "absolute inset-0 h-full w-full object-cover object-center"
}

export function compendiumCardAccent(item: CompendiumCardVisual): CompendiumThemeColorId | null {
  return getCompendiumItemAccentColor(item as unknown as Record<string, unknown>)
}

/** First plain-text sentence for card blurbs. */
export function compendiumCardBlurb(description: string | null | undefined, maxLen = COMPENDIUM_CARD_BLURB_MAX_LENGTH): string {
  if (!description?.trim()) return ""
  const plain = description
    .replace(/<[^>]+>/g, " ")
    .replace(/\*\*|__|_/g, "")
    .replace(/\s+/g, " ")
    .trim()
  const sentence = plain.split(/(?<=[.!?])\s+/)[0] ?? plain
  if (sentence.length <= maxLen) return sentence
  return `${sentence.slice(0, maxLen - 1).trim()}…`
}

export function truncateCompendiumCardBlurb(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ""
  if (trimmed.length <= COMPENDIUM_CARD_BLURB_MAX_LENGTH) return trimmed
  return `${trimmed.slice(0, COMPENDIUM_CARD_BLURB_MAX_LENGTH - 1).trim()}…`
}

/** Preferred card copy: explicit blurb → SRD preset → truncated description. */
export function getCompendiumCardBlurb(item: CompendiumCardVisual): string {
  if (item.card_blurb?.trim()) {
    return truncateCompendiumCardBlurb(item.card_blurb)
  }
  if (item.name && SRD_CLASS_CARD_BLURBS[item.name]) {
    return SRD_CLASS_CARD_BLURBS[item.name]
  }
  if (item.name && KIBBLES_CLASS_CARD_BLURBS[item.name]) {
    return KIBBLES_CLASS_CARD_BLURBS[item.name]
  }
  return compendiumCardBlurb(item.description)
}

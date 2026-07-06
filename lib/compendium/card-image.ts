import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"
import { getCompendiumItemAccentColor } from "@/lib/compendium/theme-colors"
import { SRD_CLASS_CARD_BLURBS } from "@/lib/srd/class-card-blurbs"

import type { CompendiumContentType } from "@/lib/compendium/content-types"
import { isCommonModifiersCatalogAbility } from "@/lib/compendium/modifier-catalog"
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
/** Top half stays clear; bottom 40% holds at 85% black, then a sharp 10% ramp. */
export const COMPENDIUM_LIST_CARD_GRADIENT_CLASS =
  "bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.85)_40%,rgba(0,0,0,0.45)_46%,transparent_50%)]"
/** Builder selection cards — clear top 40%, then ramp to 80% black at the bottom. */
export const SELECTION_CARD_GRADIENT_CLASS =
  "bg-[linear-gradient(to_bottom,transparent_0%,transparent_40%,rgba(0,0,0,0.45)_54%,rgba(0,0,0,0.8)_100%)]"
/** Detail overlay hero — dark band in bottom 25% for title/tags. */
export const DETAIL_OVERLAY_HERO_GRADIENT_CLASS =
  "bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.85)_18%,rgba(0,0,0,0.45)_22%,transparent_25%)]"
export const CARD_IMAGE_ASPECT_LABEL = `${WIDE_CARD_IMAGE_ASPECT} (recommended); ${CLASS_CARD_IMAGE_ASPECT}`
export const CARD_IMAGE_RECOMMENDED = "840×360px landscape, or 600×800px portrait for classes (top crop in banner)"
export const PORTRAIT_CARD_IMAGE_HINT = `${CLASS_CARD_IMAGE_ASPECT} · 600×800px recommended`

export type CompendiumCardImageCrop = "top" | "center"

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
  const trimmed = url.trim()
  if (trimmed.startsWith("data:image/")) {
    return trimmed.length <= 4_000_000 ? trimmed : null
  }
  return trimmed.length <= 4096 ? trimmed : null
}

export function getCompendiumCardImageUrl(item: CompendiumCardVisual): string | null {
  return normalizeCardImageUrl(item.card_image_url)
}

/** Compendium tabs that may show card background art in browse/detail surfaces. */
export function compendiumTabSupportsCardImage(tab: CompendiumContentType): boolean {
  return (
    tab === "classes" ||
    tab === "subclasses" ||
    tab === "species" ||
    tab === "backgrounds" ||
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

export function resolveCompendiumCardImageUrl(
  item: CompendiumCardVisual & Record<string, unknown>,
  tab: CompendiumContentType | null | undefined,
): string | null {
  if (tab != null && !compendiumItemSupportsCardImage(tab, item)) return null
  return getCompendiumCardImageUrl(item)
}

/** Keep custom card art; otherwise apply bundled SRD defaults by item name. */
export function applySrdCardImage(
  row: Record<string, unknown>,
  defaults: Record<string, string>,
): Record<string, unknown> {
  const existing = normalizeCardImageUrl(row.card_image_url)
  if (existing) return { ...row, card_image_url: existing }
  if (!isSrdSource(row.source as string | null | undefined)) return row
  const card_image_url = defaults[String(row.name ?? "")] ?? null
  return card_image_url ? { ...row, card_image_url } : row
}

/** Keep custom card art; otherwise apply bundled defaults by item name (any source). */
export function applyBundledCardImage(
  row: Record<string, unknown>,
  defaults: Record<string, string>,
): Record<string, unknown> {
  const existing = normalizeCardImageUrl(row.card_image_url)
  if (existing) return { ...row, card_image_url: existing }
  const card_image_url = defaults[String(row.name ?? "")] ?? null
  return card_image_url ? { ...row, card_image_url } : row
}

/** Compendium tabs that use portrait (3:4) card art in browse grids. */
export const COMPENDIUM_PORTRAIT_CARD_TABS = new Set<CompendiumContentType>([
  "classes",
  "species",
  "subclasses",
])

export function compendiumUsesPortraitCardArt(tab: CompendiumContentType): boolean {
  return COMPENDIUM_PORTRAIT_CARD_TABS.has(tab)
}

/** Browse grid: portrait tabs show 4 columns from lg breakpoint up. */
export function compendiumBrowseGridClass(tab: CompendiumContentType): string {
  if (compendiumUsesPortraitCardArt(tab)) {
    return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
  }
  return "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
}

/** Portrait class/species art is top-cropped; other types use full landscape framing. */
export function compendiumCardImageCropForType(tab: CompendiumContentType): CompendiumCardImageCrop {
  return tab === "classes" || tab === "subclasses" || tab === "species" ? "top" : "center"
}

export function compendiumCardHeroImageClass(crop: CompendiumCardImageCrop = "center"): string {
  return crop === "top"
    ? "absolute inset-0 h-full w-full object-cover object-top"
    : "absolute inset-0 h-full w-full object-cover object-center"
}

export function compendiumCardAccent(item: CompendiumCardVisual): CompendiumThemeColorId | null {
  return getCompendiumItemAccentColor(item as Record<string, unknown>)
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
  return compendiumCardBlurb(item.description)
}

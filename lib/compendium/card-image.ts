import type { CompendiumThemeColorId } from "@/lib/compendium/theme-colors"
import { getCompendiumItemAccentColor } from "@/lib/compendium/theme-colors"
import { SRD_CLASS_CARD_BLURBS } from "@/lib/srd/class-card-blurbs"

/** Card / detail hero art — URL or data URL. */
export const CARD_IMAGE_ASPECT_LABEL = "3:4 portrait or 16:9 landscape"
export const CARD_IMAGE_RECOMMENDED = "800×600px or wider"

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

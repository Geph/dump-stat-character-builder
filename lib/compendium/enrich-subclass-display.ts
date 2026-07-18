import { applyBundledCardImage } from "@/lib/compendium/card-image"
import { applyNamedItemIcon } from "@/lib/compendium/srd-item-icons-defaults"
import { SRD_SUBCLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/subclass-card-images-defaults"
import { SRD_SUBCLASS_ICONS_BY_NAME } from "@/lib/compendium/subclass-icons-defaults"
import type { Subclass } from "@/lib/types"

/**
 * Apply bundled icon + card-art defaults for builder/compendium display.
 * Keeps stored custom values; fills gaps by subclass name (any source).
 */
export function enrichSubclassDisplayDefaults<T extends Pick<Subclass, "name" | "icon" | "card_image_url">>(
  row: T,
): T {
  const withIcon = applyNamedItemIcon(
    row as unknown as Record<string, unknown>,
    SRD_SUBCLASS_ICONS_BY_NAME,
  )
  const withArt = applyBundledCardImage(withIcon, SRD_SUBCLASS_CARD_IMAGES_BY_NAME)
  return withArt as T
}

export function enrichSubclassDisplayList<T extends Pick<Subclass, "name" | "icon" | "card_image_url">>(
  rows: T[],
): T[] {
  return rows.map(enrichSubclassDisplayDefaults)
}

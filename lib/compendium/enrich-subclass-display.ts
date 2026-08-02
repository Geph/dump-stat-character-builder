import { applyBundledCardImage } from "@/lib/compendium/card-image"
import { applyNamedItemIcon } from "@/lib/compendium/srd-item-icons-defaults"
import {
  applyBundledSubclassCardImage,
  SRD_SUBCLASS_CARD_IMAGES_BY_NAME,
} from "@/lib/compendium/subclass-card-images-defaults"
import { SRD_SUBCLASS_ICONS_BY_NAME } from "@/lib/compendium/subclass-icons-defaults"
import type { Subclass } from "@/lib/types"

/**
 * Apply bundled icon + card-art defaults for builder/compendium display.
 * Prefer parent class when known so same-named subclasses do not share art.
 */
export function enrichSubclassDisplayDefaults<
  T extends Pick<Subclass, "name" | "icon" | "card_image_url">,
>(row: T, className?: string | null): T {
  const withIcon = applyNamedItemIcon(
    row as unknown as Record<string, unknown>,
    SRD_SUBCLASS_ICONS_BY_NAME,
  )
  const withArt = className?.trim()
    ? applyBundledSubclassCardImage(withIcon, className)
    : applyBundledCardImage(withIcon, SRD_SUBCLASS_CARD_IMAGES_BY_NAME)
  return withArt as T
}

export function enrichSubclassDisplayList<
  T extends Pick<Subclass, "name" | "icon" | "card_image_url"> & { class_id?: string },
>(rows: T[], classNameById?: Map<string, string> | Record<string, string>): T[] {
  return rows.map((row) => {
    const classId = row.class_id ? String(row.class_id) : ""
    const className =
      classNameById instanceof Map
        ? classNameById.get(classId)
        : classNameById && classId
          ? classNameById[classId]
          : undefined
    return enrichSubclassDisplayDefaults(row, className)
  })
}

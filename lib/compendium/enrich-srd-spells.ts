import { applyBundledCardImage, applySrdCardImage } from "@/lib/compendium/card-image"
import { BUNDLED_SPELL_CARD_IMAGES_BY_NAME } from "@/lib/compendium/spell-card-images-defaults"

/** Apply bundled SRD spell card art on seed (does not add spells). */
export function enrichSrdSpellRow(row: Record<string, unknown>): Record<string, unknown> {
  return applySrdCardImage(row, BUNDLED_SPELL_CARD_IMAGES_BY_NAME)
}

/** Name-match bundled spell card art for any imported or custom spell row. */
export function enrichSpellRowWithBundledCardImage(
  row: Record<string, unknown>,
): Record<string, unknown> {
  return applyBundledCardImage(row, BUNDLED_SPELL_CARD_IMAGES_BY_NAME)
}

export function enrichSrdSpellList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdSpellRow)
}

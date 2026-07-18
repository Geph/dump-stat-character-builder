import {
  applyFeatMechanicalDetection,
  applyFeatNamePreset,
  featHasNamePreset,
  resolveFeatNamePreset,
} from "@/lib/compendium/apply-feat-name-preset"
import type { FeatModifierPreset } from "@/lib/compendium/feat-modifier-presets"
import { applyNamedItemIcon, SRD_FEAT_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"
import { isSrdSource } from "@/lib/srd/source"

export { featHasNamePreset, resolveFeatNamePreset }

/** Apply bundled non-SRD feat modifier presets when not already configured. */
export function enrichCustomFeatRow(row: Record<string, unknown>): Record<string, unknown> {
  if (isSrdSource(row.source as string | null | undefined)) return row
  const name = String(row.name ?? "")
  const enriched = !featHasNamePreset(name)
    ? applyFeatMechanicalDetection(row)
    : applyFeatNamePreset(row)
  return applyNamedItemIcon(enriched, SRD_FEAT_ICONS_BY_NAME)
}

export function enrichCustomFeatList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichCustomFeatRow)
}

/** Resolve custom/SRD preset by feat name (for tests / tooling). */
export function presetForCustomFeatName(name: string): FeatModifierPreset | undefined {
  return resolveFeatNamePreset(name)
}

import { enrichSubclassFeaturesWithResources } from "@/lib/compendium/class-resource-features"
import { applySrdCardImage } from "@/lib/compendium/card-image"
import { enrichSubclassFeaturesWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { enrichSubclassSpellTableFeatures } from "@/lib/compendium/enrich-subclass-spell-features"
import { applyFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import { applySrdItemIcon } from "@/lib/compendium/srd-item-icons-defaults"
import type { NamedSourceRow } from "@/lib/compendium/prefer-same-source"
import { SRD_SUBCLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/subclass-card-images-defaults"
import { SRD_SUBCLASS_ICONS_BY_NAME } from "@/lib/compendium/subclass-icons-defaults"

/** Apply SRD defaults to subclass feature rows (class resource links, modifier presets, icons, card art). */
export function enrichSrdSubclassRow(
  row: Record<string, unknown>,
  parentClassName: string,
  spellCatalog: NamedSourceRow[] = [],
  preferredSource?: string | null,
): Record<string, unknown> {
  const subclassName = String(row.name ?? "")
  const features = enrichSubclassFeaturesWithResources(parentClassName, row.features)
  const withPresets = {
    ...row,
    features: enrichSubclassFeaturesWithModifierPresets(
      parentClassName,
      subclassName,
      features,
    ).map(applyFeatureSheetDisplay),
  }
  const withSpells = spellCatalog.length
    ? enrichSubclassSpellTableFeatures(withPresets, spellCatalog, preferredSource)
    : withPresets
  return applySrdCardImage(
    applySrdItemIcon(withSpells, SRD_SUBCLASS_ICONS_BY_NAME),
    SRD_SUBCLASS_CARD_IMAGES_BY_NAME,
  )
}

export function enrichSrdSubclassList(
  rows: Record<string, unknown>[],
  classNameById: Map<string, string>,
  spellCatalog: NamedSourceRow[] = [],
  preferredSource?: string | null,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const classId = String(row.class_id ?? "")
    const parentClassName = classNameById.get(classId) ?? ""
    return enrichSrdSubclassRow(row, parentClassName, spellCatalog, preferredSource)
  })
}

import { enrichSubclassFeaturesWithResources } from "@/lib/compendium/class-resource-features"
import { enrichSubclassFeaturesWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { applyFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import { applySrdItemIcon } from "@/lib/compendium/srd-item-icons-defaults"
import { SRD_SUBCLASS_ICONS_BY_NAME } from "@/lib/compendium/subclass-icons-defaults"

/** Apply SRD defaults to subclass feature rows (class resource links, modifier presets, icons). */
export function enrichSrdSubclassRow(
  row: Record<string, unknown>,
  parentClassName: string,
): Record<string, unknown> {
  const subclassName = String(row.name ?? "")
  const features = enrichSubclassFeaturesWithResources(parentClassName, row.features)
  return applySrdItemIcon(
    {
      ...row,
      features: enrichSubclassFeaturesWithModifierPresets(
        parentClassName,
        subclassName,
        features,
      ).map(applyFeatureSheetDisplay),
    },
    SRD_SUBCLASS_ICONS_BY_NAME,
  )
}

export function enrichSrdSubclassList(
  rows: Record<string, unknown>[],
  classNameById: Map<string, string>,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const classId = String(row.class_id ?? "")
    const parentClassName = classNameById.get(classId) ?? ""
    return enrichSrdSubclassRow(row, parentClassName)
  })
}

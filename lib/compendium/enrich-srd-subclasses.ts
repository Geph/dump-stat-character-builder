import { enrichSubclassFeaturesWithResources } from "@/lib/compendium/class-resource-features"
import { enrichSubclassFeaturesWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { applyFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"

/** Apply SRD defaults to subclass feature rows (class resource links, modifier presets). */
export function enrichSrdSubclassRow(
  row: Record<string, unknown>,
  parentClassName: string,
): Record<string, unknown> {
  const subclassName = String(row.name ?? "")
  const features = enrichSubclassFeaturesWithResources(parentClassName, row.features)
  return {
    ...row,
    features: enrichSubclassFeaturesWithModifierPresets(
      parentClassName,
      subclassName,
      features,
    ).map(applyFeatureSheetDisplay),
  }
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

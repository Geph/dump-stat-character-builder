import { enrichSubclassFeaturesWithResources } from "@/lib/compendium/class-resource-features"

/** Apply SRD defaults to subclass feature rows (class resource links, modifier presets). */
export function enrichSrdSubclassRow(
  row: Record<string, unknown>,
  parentClassName: string,
): Record<string, unknown> {
  return {
    ...row,
    features: enrichSubclassFeaturesWithResources(parentClassName, row.features),
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

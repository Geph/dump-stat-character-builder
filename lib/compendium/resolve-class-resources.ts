import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import { resourcesForClass } from "@/lib/compendium/class-resource-rows"
import type { ClassResource, ClassResourceRow, DndClass } from "@/lib/types"

/** Resolve spendable/display resources for a class (table rows → embedded JSON → SRD defaults). */
export function resolveClassResourcesForClass(
  cls: Pick<DndClass, "id" | "name" | "class_resources">,
  tableRows?: ClassResourceRow[],
): ClassResource[] {
  const raw = (() => {
    if (tableRows?.length && cls.id) {
      const fromTable = resourcesForClass(cls.id, tableRows)
      if (fromTable.length) return fromTable
    }

    const embedded = cls.class_resources
    if (Array.isArray(embedded) && embedded.length > 0) return embedded

    return SRD_CLASS_RESOURCES_BY_NAME[cls.name] ?? []
  })()

  const seen = new Set<string>()
  const deduped: ClassResource[] = []
  for (const resource of raw) {
    const key = resource.id?.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(resource)
  }
  return deduped
}

export function attachClassResourcesToClass(
  cls: DndClass,
  tableRows: ClassResourceRow[],
): DndClass {
  const resources = resourcesForClass(cls.id, tableRows)
  if (!resources.length) return cls
  return { ...cls, class_resources: resources }
}

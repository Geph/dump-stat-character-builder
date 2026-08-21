import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import { sanitizeAlchemistClassResources } from "@/lib/compendium/alchemist-feature-wiring"
import { resourcesForClass } from "@/lib/compendium/class-resource-rows"
import { inferLegacyClassResourceSubclass } from "@/lib/compendium/subclass-gated-class-resources"
import type { ClassResource, ClassResourceRow, DndClass } from "@/lib/types"

function normalizeClassResource(resource: ClassResource, className: string): ClassResource {
  const legacy = resource as ClassResource & {
    subclass_name?: string | null
    subclassName?: string | null
  }
  const subclassName =
    legacy.subclassName ??
    legacy.subclass_name ??
    inferLegacyClassResourceSubclass(className, resource.id)
  return subclassName ? { ...resource, subclassName } : resource
}

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
    if (Array.isArray(embedded) && embedded.length > 0) {
      return embedded.map((resource) => normalizeClassResource(resource, cls.name))
    }

    return SRD_CLASS_RESOURCES_BY_NAME[cls.name] ?? []
  })()

  const seen = new Set<string>()
  const deduped: ClassResource[] = []
  for (const rawResource of raw) {
    const resource = normalizeClassResource(rawResource, cls.name)
    const key = resource.id?.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(resource)
  }
  return /alchemist/i.test(cls.name) ? sanitizeAlchemistClassResources(deduped) : deduped
}

export function attachClassResourcesToClass(
  cls: DndClass,
  tableRows: ClassResourceRow[],
): DndClass {
  const resources = resourcesForClass(cls.id, tableRows)
  if (!resources.length) return cls
  return { ...cls, class_resources: resources }
}

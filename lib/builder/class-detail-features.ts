import type { DndClass, Feature } from "@/lib/types"

export type ClassDetailFeatureRow = {
  level: number
  name: string
  resourceRelated: boolean
}

function isResourceRelatedFeature(feature: Feature, cls: DndClass): boolean {
  if (feature.limitedUses?.type === "class_resource") return true
  if (feature.resourceId) return true
  const resourceNames = new Set(
    (cls.class_resources ?? []).map((r) => r.name.toLowerCase()),
  )
  if (resourceNames.has(feature.name.toLowerCase())) return true
  return (cls.class_resources ?? []).some((resource) =>
    feature.description.toLowerCase().includes(resource.name.toLowerCase()),
  )
}

/** Features through level 3 for builder detail overlay — names only, resource features flagged. */
export function getClassDetailFeatures(cls: DndClass): ClassDetailFeatureRow[] {
  return (cls.features ?? [])
    .filter((f) => f.level >= 1 && f.level <= 3)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((feature) => ({
      level: feature.level,
      name: feature.name,
      resourceRelated: isResourceRelatedFeature(feature, cls),
    }))
}

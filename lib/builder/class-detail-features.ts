import type { DndClass, Feature } from "@/lib/types"
import { compendiumCardBlurb } from "@/lib/compendium/card-image"
import { isSubclassUnlockFeature } from "@/lib/builder/subclass-unlock"

export type ClassDetailFeatureRow = {
  level: number
  name: string
  resourceRelated: boolean
  summary: string
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
      summary: compendiumCardBlurb(feature.description),
    }))
}

/** Base class features only — excludes subclass/archetype selection gates. */
export function getClassDetailBaseFeatures(cls: DndClass): ClassDetailFeatureRow[] {
  const subclassGateKeys = new Set(
    (cls.features ?? [])
      .filter(isSubclassUnlockFeature)
      .map((feature) => `${feature.level}:${feature.name}`),
  )
  return getClassDetailFeatures(cls).filter(
    (row) => !subclassGateKeys.has(`${row.level}:${row.name}`),
  )
}

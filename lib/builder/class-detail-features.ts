import type { DndClass, Feature } from "@/lib/types"
import { compendiumCardBlurb } from "@/lib/compendium/card-image"
import { SUBCLASS_LEVEL } from "@/lib/builder/choices"

export type ClassDetailFeatureRow = {
  level: number
  name: string
  resourceRelated: boolean
  summary: string
}

const SUBCLASS_GATE_TEXT =
  /\b(subclass|bard college|primal path|arcane tradition|divine domain|sacred oath|roguish archetype|martial archetype|druid circle|sorcerous origin|otherworldly patron|monastic tradition|wizard school)\b/i

const SUBCLASS_CHOICE_CATEGORY =
  /\b(college|path|tradition|domain|patron|archetype|circle|school|oath|philosophy|way of|subclass)\b/i

function isSubclassGateFeature(feature: Feature): boolean {
  if (feature.level !== SUBCLASS_LEVEL) return false
  const text = `${feature.name} ${feature.description ?? ""}`
  if (SUBCLASS_GATE_TEXT.test(text)) return true
  if (feature.isChoice && SUBCLASS_CHOICE_CATEGORY.test(feature.choices?.category ?? "")) {
    return true
  }
  return false
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

/** Base class features only — excludes level-3 subclass selection gates. */
export function getClassDetailBaseFeatures(cls: DndClass): ClassDetailFeatureRow[] {
  const subclassGateKeys = new Set(
    (cls.features ?? [])
      .filter(isSubclassGateFeature)
      .map((feature) => `${feature.level}:${feature.name}`),
  )
  return getClassDetailFeatures(cls).filter(
    (row) => !subclassGateKeys.has(`${row.level}:${row.name}`),
  )
}

import type { Feature, FeatureActivation } from "@/lib/types"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"

export function normalizeFeatureName(name: string | null | undefined): string {
  return (name ?? "").replace(/\s+/g, " ").trim().toLowerCase()
}

export function featureReplacesNames(feature: {
  linkedModifiers?: LinkedModifierInstance[] | null
}): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const instance of feature.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type !== "replace_feature") continue
      for (const raw of characteristic.replacedFeatureNames ?? []) {
        const key = normalizeFeatureName(raw)
        if (!key || seen.has(key)) continue
        seen.add(key)
        names.push(raw.trim())
      }
    }
  }
  return names
}

export function featureHasReplaceModifier(feature: {
  linkedModifiers?: LinkedModifierInstance[] | null
}): boolean {
  return featureReplacesNames(feature).length > 0
}

/** Names (normalized) of features superseded by an unlocked replacement. */
export function collectReplacedFeatureNames(
  features: Array<{
    name?: string | null
    level?: number | null
    linkedModifiers?: LinkedModifierInstance[] | null
  }>,
  levelCap: number,
): Set<string> {
  const replaced = new Set<string>()
  for (const feature of features) {
    if ((feature.level ?? 1) > levelCap) continue
    for (const name of featureReplacesNames(feature)) {
      replaced.add(normalizeFeatureName(name))
    }
  }
  return replaced
}

export function featureIsReplaced(
  feature: { name?: string | null },
  replacedNames: Set<string>,
): boolean {
  const key = normalizeFeatureName(feature.name)
  return Boolean(key) && replacedNames.has(key)
}

export function resolveFirstUseNoAction(
  activation: FeatureActivation | null | undefined,
  classLevel: number,
): boolean {
  if (!activation?.firstUseNoAction) return false
  const fromLevel = activation.firstUseNoActionFromLevel
  if (fromLevel != null && fromLevel > 0 && classLevel < fromLevel) return false
  return true
}

export function collectReplacedFeatureNamesFromClassDetails(
  classDetails: Array<{
    row?: { level?: number | null }
    class?: { features?: Feature[] | null } | null
    subclass?: { features?: Feature[] | null } | null
  }>,
): Set<string> {
  const replaced = new Set<string>()
  for (const entry of classDetails) {
    const level = entry.row?.level ?? 1
    const features = [
      ...((entry.class?.features ?? []) as Feature[]),
      ...((entry.subclass?.features ?? []) as Feature[]),
    ]
    for (const name of collectReplacedFeatureNames(features, level)) {
      replaced.add(name)
    }
  }
  return replaced
}

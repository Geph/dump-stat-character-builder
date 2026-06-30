import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import { resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"
import type { ClassResource, FeatureChoice } from "@/lib/types"

function resourcesForClassName(className: string, classResources?: ClassResource[]): ClassResource[] {
  if (classResources?.length) return classResources
  return SRD_CLASS_RESOURCES_BY_NAME[className] ?? []
}

/** Resolve how many picks a FeatureChoice grants at a given class level. */
export function resolveFeatureChoiceCount(
  choices: FeatureChoice,
  classLevel: number,
  className: string,
  classResources?: ClassResource[],
): number {
  const fallback = choices.count > 0 ? choices.count : 1
  const resourceKey = choices.resourceKey?.trim()
  if (!resourceKey) return fallback

  const resource = resourcesForClassName(className, classResources).find(
    (entry) => entry.id === resourceKey,
  )
  if (!resource?.uses) return fallback

  const resolved = resolveUsesAtLevel(resource.uses, classLevel)
  return resolved != null && resolved > 0 ? resolved : fallback
}

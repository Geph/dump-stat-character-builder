import type { ClassResource, FeatureChoice } from "@/lib/types"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import { resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"

function resourcesForClassName(
  className: string,
  classResources?: ClassResource[],
  classRow?: { id: string; name: string; class_resources?: ClassResource[] | null },
): ClassResource[] {
  if (classResources?.length) return classResources
  if (classRow) return resolveClassResourcesForClass(classRow)
  return resolveClassResourcesForClass({ id: "", name: className, class_resources: null })
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

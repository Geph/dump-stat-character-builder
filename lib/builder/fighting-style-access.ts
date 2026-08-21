import { normalizeFeatCategory } from "@/lib/builder/feat-selection"
import type { DndClass, Feat, Feature, Subclass } from "@/lib/types"

function featureGrantsFightingStyle(feature: Feature): boolean {
  if (/fighting style/i.test(feature.name)) return true
  return (feature.linkedModifiers ?? []).some((instance) =>
    (instance.characteristics ?? []).some((char) => {
      if (char.type !== "grant_feat") return false
      return (char.featCategories ?? []).some(
        (category) => normalizeFeatCategory(category) === "Fighting Style",
      )
    }),
  )
}

function unlockedFeaturesGrantFightingStyle(
  features: Feature[] | null | undefined,
  classLevel: number,
): boolean {
  return (features ?? []).some(
    (feature) => (feature.level ?? 0) <= classLevel && featureGrantsFightingStyle(feature),
  )
}

export function characterHasFightingStyleAccess(params: {
  classLevels?: { classId: string; level: number }[]
  classes?: DndClass[]
  subclasses?: Subclass[]
  subclassByClassId?: Record<string, string>
  classDetails?: {
    row: { class_id: string; level: number; subclass_id?: string | null }
    class?: { features?: Feature[] } | null
    subclass?: { features?: Feature[] } | null
  }[]
  ownedFeatIds?: string[]
  feats?: Feat[]
}): boolean {
  if (params.classDetails?.length) {
    for (const entry of params.classDetails) {
      const level = entry.row.level
      if (unlockedFeaturesGrantFightingStyle(entry.class?.features, level)) return true
      if (unlockedFeaturesGrantFightingStyle(entry.subclass?.features, level)) return true
    }
  }

  const classes = params.classes ?? []
  const subclassByClassId = params.subclassByClassId ?? {}
  const subclasses = params.subclasses ?? []
  for (const row of params.classLevels ?? []) {
    const cls = classes.find((entry) => entry.id === row.classId)
    if (unlockedFeaturesGrantFightingStyle(cls?.features, row.level)) return true
    const subclassId = subclassByClassId[row.classId]
    const subclass = subclassId
      ? subclasses.find((entry) => entry.id === subclassId)
      : undefined
    if (unlockedFeaturesGrantFightingStyle(subclass?.features, row.level)) return true
  }

  const feats = params.feats ?? []
  return (params.ownedFeatIds ?? []).some((id) => {
    const feat = feats.find((entry) => entry.id === id)
    return feat != null && normalizeFeatCategory(feat.category) === "Fighting Style"
  })
}

/** Categories for an ASI / level-up feat pick. */
export function levelUpFeatCategories(hasFightingStyleAccess: boolean): string[] {
  return hasFightingStyleAccess ? ["General", "Fighting Style"] : ["General"]
}

import { FEAT_MILESTONES } from "@/lib/builder/feat-selection"
import { featureChoiceKey } from "@/lib/builder/choices"
import type { DndClass, Feature } from "@/lib/types"

export function isFeatChoiceFeature(feature: Feature): boolean {
  return feature.isChoice === true && feature.choices?.kind === "feats"
}

export type FeatPickSlot = {
  key: string
  classId: string
  className: string
  feature: Feature
  milestoneLevel: number
  featCategories: string[]
  label: string
}

export function getFeatPickSlots(
  classLevels: { classId: string; level: number }[],
  classes: DndClass[],
  totalLevel: number,
): FeatPickSlot[] {
  const fromFeatures: FeatPickSlot[] = []

  for (const entry of classLevels) {
    const cls = classes.find((c) => c.id === entry.classId)
    if (!cls) continue

    for (const feature of cls.features ?? []) {
      if (feature.level > entry.level || !isFeatChoiceFeature(feature) || !feature.choices) continue
      const categories = feature.choices.featCategories?.length
        ? feature.choices.featCategories
        : [feature.choices.category || "General"]

      fromFeatures.push({
        key: featureChoiceKey(entry.classId, feature.name),
        classId: entry.classId,
        className: cls.name,
        feature,
        milestoneLevel: feature.level,
        featCategories: categories,
        label: feature.choices.category || feature.name,
      })
    }
  }

  if (fromFeatures.length > 0) {
    return fromFeatures.sort(
      (a, b) =>
        a.milestoneLevel - b.milestoneLevel ||
        a.className.localeCompare(b.className) ||
        a.feature.name.localeCompare(b.feature.name),
    )
  }

  return FEAT_MILESTONES.filter((lvl) => lvl <= totalLevel).map((lvl) => ({
    key: `milestone:${lvl}`,
    classId: classLevels[0]?.classId ?? "",
    className: "",
    feature: {
      level: lvl,
      name: lvl === 19 ? "Epic Boon" : "General Feat",
      description: "",
      isChoice: true,
      choices: {
        kind: "feats" as const,
        category: lvl === 19 ? "Epic Boon" : "General Feat",
        count: 1,
        featCategories: [lvl === 19 ? "Epic Boon" : "General"],
        options: [],
      },
    },
    milestoneLevel: lvl,
    featCategories: [lvl === 19 ? "Epic Boon" : "General"],
    label: lvl === 19 ? "Epic Boon (Level 19)" : `General Feat (Level ${lvl})`,
  }))
}

export function usesClassFeatureFeats(classLevels: { classId: string; level: number }[], classes: DndClass[]): boolean {
  return classLevels.some((entry) => {
    const cls = classes.find((c) => c.id === entry.classId)
    if (!cls) return false
    return (cls.features ?? []).some(
      (feature) => feature.level <= entry.level && isFeatChoiceFeature(feature),
    )
  })
}

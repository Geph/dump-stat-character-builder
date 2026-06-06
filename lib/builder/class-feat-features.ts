import { FEAT_MILESTONES } from "@/lib/builder/feat-selection"
import { featureChoiceKey, SUBCLASS_LEVEL } from "@/lib/builder/choices"
import {
  featureGrantsFeats,
  grantFeatsFromFeature,
  GRANT_FEAT_CATALOG_IDS,
} from "@/lib/compendium/grant-feat-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { DndClass, Feature, Subclass } from "@/lib/types"

export type FeatPickSlot = {
  key: string
  classId: string
  className: string
  feature: Feature
  milestoneLevel: number
  featCategories: string[]
  label: string
}

function collectFeatPickSlotsFromFeatures(params: {
  classId: string
  className: string
  features: Feature[]
  maxLevel: number
  catalog: ModifierCatalogEntry[]
}): FeatPickSlot[] {
  const { classId, className, features, maxLevel, catalog } = params
  const slots: FeatPickSlot[] = []

  for (const feature of features) {
    if (feature.level > maxLevel) continue
    const grants = grantFeatsFromFeature(feature, catalog)
    if (!grants.length) continue

    grants.forEach((grant, grantIndex) => {
      const key =
        grants.length === 1
          ? featureChoiceKey(classId, feature.name)
          : featureChoiceKey(classId, `${feature.name}:${grant.catalogEntryId}:${grantIndex}`)

      for (let n = 0; n < grant.count; n++) {
        slots.push({
          key: grant.count === 1 ? key : `${key}:${n}`,
          classId,
          className,
          feature,
          milestoneLevel: feature.level,
          featCategories: grant.featCategories,
          label: grant.count === 1 ? grant.label : `${grant.label} (${n + 1}/${grant.count})`,
        })
      }
    })
  }

  return slots
}

export function getFeatPickSlots(
  classLevels: { classId: string; level: number }[],
  classes: DndClass[],
  catalog: ModifierCatalogEntry[],
  totalLevel: number,
  subclasses: Subclass[] = [],
  subclassByClassId: Record<string, string> = {},
): FeatPickSlot[] {
  const fromFeatures: FeatPickSlot[] = []

  for (const entry of classLevels) {
    const cls = classes.find((c) => c.id === entry.classId)
    if (!cls) continue

    fromFeatures.push(
      ...collectFeatPickSlotsFromFeatures({
        classId: entry.classId,
        className: cls.name,
        features: cls.features ?? [],
        maxLevel: entry.level,
        catalog,
      }),
    )

    const subclassId = subclassByClassId[entry.classId]
    if (subclassId && entry.level >= SUBCLASS_LEVEL) {
      const subclass = subclasses.find((s) => s.id === subclassId)
      if (subclass) {
        fromFeatures.push(
          ...collectFeatPickSlotsFromFeatures({
            classId: entry.classId,
            className: cls.name,
            features: subclass.features ?? [],
            maxLevel: entry.level,
            catalog,
          }),
        )
      }
    }
  }

  if (fromFeatures.length > 0) {
    return fromFeatures.sort(
      (a, b) =>
        a.milestoneLevel - b.milestoneLevel ||
        a.className.localeCompare(b.className) ||
        a.feature.name.localeCompare(b.feature.name) ||
        a.label.localeCompare(b.label),
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
      modifierRefs: [lvl === 19 ? GRANT_FEAT_CATALOG_IDS.epicBoon : GRANT_FEAT_CATALOG_IDS.general],
    },
    milestoneLevel: lvl,
    featCategories: [lvl === 19 ? "Epic Boon" : "General"],
    label: lvl === 19 ? "Epic Boon (Level 19)" : `General Feat (Level ${lvl})`,
  }))
}

export function usesClassFeatureFeats(
  classLevels: { classId: string; level: number }[],
  classes: DndClass[],
  catalog: ModifierCatalogEntry[],
  subclasses: Subclass[] = [],
  subclassByClassId: Record<string, string> = {},
): boolean {
  for (const entry of classLevels) {
    const cls = classes.find((c) => c.id === entry.classId)
    if (!cls) continue
    for (const feature of cls.features ?? []) {
      if (feature.level <= entry.level && featureGrantsFeats(feature, catalog)) return true
    }
  }
  return false
}

/** @deprecated Use featureGrantsFeats from grant-feat-catalog */
export function isFeatChoiceFeature(feature: Feature): boolean {
  return feature.isChoice === true && feature.choices?.kind === "feats"
}

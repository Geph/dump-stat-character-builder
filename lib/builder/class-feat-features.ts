import { FEAT_MILESTONES } from "@/lib/builder/feat-selection"
import { scaledClassFeatGrantCount } from "@/lib/builder/scaled-feat-grant-counts"
import { featureChoiceKey, resolveSubclassUnlockLevel } from "@/lib/builder/choices"
import {
  abilityNameIsSelected,
  collectSelectedCustomAbilityNames,
  isPickGatedCustomAbility,
} from "@/lib/builder/picked-custom-abilities"
import {
  featureGrantsFeats,
  grantFeatsFromFeature,
  grantFeatsFromLinkedModifiers,
  GRANT_FEAT_CATALOG_ID,
} from "@/lib/compendium/grant-feat-catalog"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { CustomAbility, DndClass, Feature, Subclass } from "@/lib/types"

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
          ? featureChoiceKey(classId, feature.name, feature.level)
          : featureChoiceKey(classId, `${feature.name}:${grant.catalogEntryId}:${grantIndex}`, feature.level)

      const grantCount = scaledClassFeatGrantCount(
        className,
        feature.name,
        maxLevel,
        grant.count,
      )

      for (let n = 0; n < grantCount; n++) {
        slots.push({
          key: grantCount === 1 ? key : `${key}:${n}`,
          classId,
          className,
          feature,
          milestoneLevel: feature.level,
          featCategories: grant.featCategories,
          label: grantCount === 1 ? grant.label : `${grant.label} (${n + 1}/${grantCount})`,
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
    if (subclassId && entry.level >= resolveSubclassUnlockLevel(cls)) {
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
      modifierRefs: [GRANT_FEAT_CATALOG_ID],
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

function featureFromCustomAbility(ability: CustomAbility): Feature {
  return {
    name: ability.name,
    level: ability.level_requirement ?? 1,
    description: ability.description ?? "",
    linkedModifiers: ability.linked_modifiers ?? undefined,
    modifierRefs: ability.modifierRefs ?? undefined,
  }
}

function owningClassIdForAbility(params: {
  abilityName: string
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  featureChoicePicks: Record<string, string[]>
}): string {
  const { abilityName, classLevels, classes, featureChoicePicks } = params
  for (const [key, picks] of Object.entries(featureChoicePicks)) {
    if (!picks.some((pick) => abilityNameIsSelected(abilityName, [pick]))) continue
    const owner = classLevels.find(
      (entry) => key === entry.classId || key.startsWith(`${entry.classId}:`),
    )
    if (owner) return owner.classId
  }
  const occultist = classes.find((cls) => /^occultist$/i.test(cls.name))
  if (occultist && classLevels.some((entry) => entry.classId === occultist.id)) {
    return occultist.id
  }
  return classLevels[0]?.classId ?? ""
}

/**
 * Feat picks granted by selected (or all) custom abilities — e.g. Hedge Mage
 * Manipulate Magic → one pick from the PHB Metamagic Options catalog.
 */
export function getCustomAbilityFeatPickSlots(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  catalog: ModifierCatalogEntry[]
  customAbilities: CustomAbility[]
  featureChoicePicks?: Record<string, string[]>
  /** When true, include grants from pick-gated abilities even if not selected (max-level prune set). */
  includeUnselected?: boolean
}): FeatPickSlot[] {
  const {
    classLevels,
    classes,
    catalog,
    customAbilities,
    featureChoicePicks = {},
    includeUnselected = false,
  } = params
  if (!classLevels.length || !customAbilities.length) return []

  const selectedNames = collectSelectedCustomAbilityNames({ featureChoicePicks })
  const slots: FeatPickSlot[] = []

  for (const ability of customAbilities) {
    if (
      isPickGatedCustomAbility(ability) &&
      !includeUnselected &&
      !abilityNameIsSelected(ability.name, selectedNames)
    ) {
      continue
    }
    const grants = grantFeatsFromLinkedModifiers(
      catalog,
      ability.linked_modifiers,
      ability.modifierRefs,
    )
    if (!grants.length) continue

    const classId = owningClassIdForAbility({
      abilityName: ability.name,
      classLevels,
      classes,
      featureChoicePicks,
    })
    const cls = classes.find((row) => row.id === classId)
    const className = cls?.name ?? ""
    const feature = featureFromCustomAbility(ability)
    const level = feature.level

    grants.forEach((grant, grantIndex) => {
      const key =
        grants.length === 1
          ? featureChoiceKey(classId, ability.name, level)
          : featureChoiceKey(
              classId,
              `${ability.name}:${grant.catalogEntryId}:${grantIndex}`,
              level,
            )
      const count = Math.max(1, grant.count)
      for (let n = 0; n < count; n++) {
        slots.push({
          key: count === 1 ? key : `${key}:${n}`,
          classId,
          className,
          feature,
          milestoneLevel: level,
          featCategories: grant.featCategories,
          label: count === 1 ? grant.label : `${grant.label} (${n + 1}/${count})`,
        })
      }
    })
  }

  return slots.sort(
    (a, b) =>
      a.milestoneLevel - b.milestoneLevel ||
      a.className.localeCompare(b.className) ||
      a.feature.name.localeCompare(b.feature.name) ||
      a.label.localeCompare(b.label),
  )
}

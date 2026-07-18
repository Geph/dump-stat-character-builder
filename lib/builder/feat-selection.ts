import { slotUsesCatalogFeatPicks } from "@/lib/builder/catalog-feat-options"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import {
  baseCompendiumLookupKey,
  sourcesEqual,
} from "@/lib/compendium/prefer-same-source"
import {
  collectMechanicalFeatPrerequisiteRules,
  hasArmorTraining,
  meetsAbilityScorePrerequisite,
} from "@/lib/import/resolve-feat-prerequisites"
import type { Feat } from "@/lib/types"

export const FEAT_MILESTONES = [4, 8, 12, 16, 19] as const

/** Feat categories where a character may only own one feat at a time. */
export const MUTUALLY_EXCLUSIVE_FEAT_CATEGORIES = new Set<string>(["Planar Pact"])

export type FeatSlotContext = {
  totalLevel: number
  classIds: string[]
  feats: Feat[]
  /** All feat ids the character currently owns (picks + fixed grants). */
  ownedFeatIds: string[]
  speciesId: string | null
  backgroundId: string | null
  /** Feat id already chosen for this slot (excluded from taken / exclusivity checks). */
  currentSlotFeatId?: string | null
  /**
   * When set (from classes with prefer_same_source_replacements), alsoFeatNames and
   * category lists prefer same-source replacements over SRD duplicates.
   */
  preferredSources?: string[]
  /** Effective armor training/proficiencies (class + feats + extras). */
  armorProficiencies?: string[]
  /** Effective ability scores after ASIs and racial bonuses. */
  abilityScores?: Partial<Record<AbilityScoreKey, number>>
}

export function buildOwnedFeatIds(params: {
  featureChoicePicks: Record<string, string[]>
  pickSlotKeys: string[]
  grantedFeatIds: string[]
}): string[] {
  const picked = params.pickSlotKeys
    .map((key) => params.featureChoicePicks[key]?.[0])
    .filter((id): id is string => Boolean(id))
  return [...new Set([...picked, ...params.grantedFeatIds])]
}

export function normalizeFeatCategory(category: string | null | undefined): string {
  if (!category) return "General"
  const lower = category.toLowerCase()
  if (lower.includes("epic boon")) return "Epic Boon"
  if (lower.includes("fighting style")) return "Fighting Style"
  if (lower.includes("dark gift")) return "Dark Gift"
  if (lower.includes("origin")) return "Origin"
  if (lower.includes("general")) return "General"
  if (lower.includes("planar pact")) return "Planar Pact"
  return category.trim()
}

/** Origin-slot picks (background / Human Versatile / etc.) also accept Dark Gift feats. */
export function isOriginSelectableCategory(category: string | null | undefined): boolean {
  const normalized = normalizeFeatCategory(category)
  return normalized === "Origin" || normalized === "Dark Gift"
}

export function isMutuallyExclusiveFeatCategory(category: string): boolean {
  return MUTUALLY_EXCLUSIVE_FEAT_CATEGORIES.has(normalizeFeatCategory(category))
}

function featById(feats: Feat[], id: string): Feat | undefined {
  return feats.find((feat) => feat.id === id)
}

function hasExclusiveCategoryConflict(feat: Feat, context: FeatSlotContext): boolean {
  const category = normalizeFeatCategory(feat.category)
  if (!isMutuallyExclusiveFeatCategory(category)) return false

  return context.ownedFeatIds
    .filter((id) => id && id !== context.currentSlotFeatId)
    .some((id) => {
      const other = featById(context.feats, id)
      return other != null && normalizeFeatCategory(other.category) === category
    })
}

export function isEpicBoonFeat(feat: Feat): boolean {
  return normalizeFeatCategory(feat.category) === "Epic Boon"
}

export function requiredFeatSlotCount(totalLevel: number): number {
  return FEAT_MILESTONES.filter((lvl) => lvl <= totalLevel).length
}

export function isFeatEligibleForSlot(
  feat: Feat,
  milestoneLevel: number,
  context: FeatSlotContext,
): boolean {
  return isFeatEligibleForCategories(
    feat,
    milestoneLevel === 19 ? ["Epic Boon"] : ["General"],
    milestoneLevel,
    context,
  )
}

export function isFeatEligibleForCategories(
  feat: Feat,
  categories: string[],
  milestoneLevel: number,
  context: FeatSlotContext,
  alsoFeatNames: string[] = [],
): boolean {
  const normalizedCategories = new Set(categories.map(normalizeFeatCategory))
  const category = normalizeFeatCategory(feat.category)
  const isOriginSlot = [...normalizedCategories].some((entry) => isOriginSelectableCategory(entry))
  const preferredSources = context.preferredSources ?? []
  const nameAllowed = alsoFeatNames.some((name) => {
    if (name.trim().toLowerCase() === feat.name.trim().toLowerCase()) return true
    if (!preferredSources.length) return false
    if (baseCompendiumLookupKey(name) !== baseCompendiumLookupKey(feat.name)) return false
    return preferredSources.some((source) => sourcesEqual(source, feat.source))
  })

  // Origin slots accept Origin + Dark Gift. General ASI slots also accept Origin feats
  // (2024: any feat you're eligible for). Dark Gift stays Origin/Dark Gift–slot only.
  const categoryMatches =
    normalizedCategories.has(category) ||
    (isOriginSlot && isOriginSelectableCategory(category)) ||
    (normalizedCategories.has("General") && category === "Origin")
  if (!categoryMatches && !nameAllowed) return false

  const taken = new Set(
    context.ownedFeatIds.filter((id) => id && id !== context.currentSlotFeatId),
  )

  if (
    category === "Dark Gift" &&
    !isOriginSlot &&
    !normalizedCategories.has("Dark Gift") &&
    !nameAllowed
  ) {
    return false
  }
  if (!feat.repeatable && taken.has(feat.id)) return false
  if (hasExclusiveCategoryConflict(feat, context)) return false

  const minLevel =
    feat.level_requirement ??
    (category === "Epic Boon"
      ? 19
      : isOriginSelectableCategory(category) ||
          category === "Fighting Style" ||
          category === "Planar Pact" ||
          nameAllowed ||
          slotUsesCatalogFeatPicks(categories.map(normalizeFeatCategory))
        ? 1
        : 4)
  if (minLevel > context.totalLevel || (minLevel > milestoneLevel && !nameAllowed)) return false

  if (feat.prerequisite_class_ids?.length) {
    if (!feat.prerequisite_class_ids.some((id) => context.classIds.includes(id))) return false
  }
  if (feat.prerequisite_species_ids?.length) {
    if (!context.speciesId || !feat.prerequisite_species_ids.includes(context.speciesId)) return false
  }
  if (feat.prerequisite_background_ids?.length) {
    if (!context.backgroundId || !feat.prerequisite_background_ids.includes(context.backgroundId)) {
      return false
    }
  }
  if (feat.prerequisite_feat_ids?.length) {
    if (!feat.prerequisite_feat_ids.every((id) => context.ownedFeatIds.includes(id))) return false
  }

  const mechanicalRules = collectMechanicalFeatPrerequisiteRules(feat)
  for (const rule of mechanicalRules) {
    if (rule.category === "armor_training") {
      if (!hasArmorTraining(context.armorProficiencies, rule.value)) return false
      continue
    }
    if (rule.category === "ability_score") {
      if (!meetsAbilityScorePrerequisite(context.abilityScores, rule)) return false
    }
  }

  return true
}

export function isFeatValidSelection(
  feat: Feat,
  milestoneLevel: number,
  context: FeatSlotContext,
): boolean {
  return isFeatEligibleForSlot(feat, milestoneLevel, {
    ...context,
    currentSlotFeatId: feat.id,
  })
}

import type { Feat } from "@/lib/types"

export const FEAT_MILESTONES = [4, 8, 12, 16, 19] as const

export type FeatSlotContext = {
  totalLevel: number
  classIds: string[]
  selectedFeatIds: string[]
  speciesId: string | null
  backgroundId: string | null
  /** Feat id already chosen for this slot (excluded from taken set). */
  currentSlotFeatId?: string | null
}

export function normalizeFeatCategory(category: string | null | undefined): string {
  if (!category) return "General"
  const lower = category.toLowerCase()
  if (lower.includes("epic boon")) return "Epic Boon"
  if (lower.includes("fighting style")) return "Fighting Style"
  if (lower.includes("origin")) return "Origin"
  if (lower.includes("general")) return "General"
  return category
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
): boolean {
  const normalizedCategories = new Set(categories.map(normalizeFeatCategory))
  const category = normalizeFeatCategory(feat.category)
  if (!normalizedCategories.has(category)) return false

  const taken = new Set(
    context.selectedFeatIds.filter((id) => id && id !== context.currentSlotFeatId),
  )

  // Origin feats are only valid when the slot explicitly asks for them (e.g. species
  // grants like Human's Versatile, or background origin-feat slots). Milestone/General
  // slots never include "Origin" in their categories, so they are already filtered above.
  const isOriginSlot = normalizedCategories.has("Origin")
  if (category === "Origin" && !isOriginSlot) return false
  if (!feat.repeatable && taken.has(feat.id)) return false

  // Origin and Fighting Style feats are gated by the granting source (species,
  // background, or a class's Fighting Style feature), not by a level-4 milestone,
  // so they default to level 1 when no explicit requirement is set.
  const minLevel =
    feat.level_requirement ??
    (category === "Epic Boon"
      ? 19
      : category === "Origin" || category === "Fighting Style"
        ? 1
        : 4)
  if (minLevel > context.totalLevel || minLevel > milestoneLevel) return false

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
    if (!feat.prerequisite_feat_ids.every((id) => context.selectedFeatIds.includes(id))) return false
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

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
  const category = normalizeFeatCategory(feat.category)
  const taken = new Set(
    context.selectedFeatIds.filter((id) => id && id !== context.currentSlotFeatId),
  )

  if (category === "Origin") return false
  if (taken.has(feat.id)) return false

  if (milestoneLevel === 19) {
    if (category !== "Epic Boon") return false
  } else {
    if (category !== "General") return false
  }

  const minLevel = feat.level_requirement ?? (category === "Epic Boon" ? 19 : 4)
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

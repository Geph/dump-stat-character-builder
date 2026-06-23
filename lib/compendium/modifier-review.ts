import type { Feature } from "@/lib/types"

export type ModifierReviewCarrier = Feature & {
  modifierReviewPending?: boolean
}

/** Imported feature flagged for modifier wiring and still has no linked modifiers. */
export function featureNeedsModifierReview(feature: ModifierReviewCarrier): boolean {
  return Boolean(feature.modifierReviewPending) && (feature.linkedModifiers?.length ?? 0) === 0
}

export function clearModifierReviewPending<T extends ModifierReviewCarrier>(feature: T): T {
  if (!feature.modifierReviewPending) return feature
  const { modifierReviewPending: _flag, ...rest } = feature
  return rest as T
}

export function markFeatureModifierReviewForPersist(feature: Feature): Feature {
  if ((feature.linkedModifiers?.length ?? 0) > 0) {
    return clearModifierReviewPending(feature as ModifierReviewCarrier)
  }
  return { ...feature, modifierReviewPending: true }
}

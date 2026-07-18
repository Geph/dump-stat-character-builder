import {
  isSubclassFeatureGrant,
  isSubclassUnlockFeature,
} from "@/lib/builder/subclass-unlock"
import type { Feature } from "@/lib/types"

export type ModifierReviewCarrier = Feature & {
  modifierReviewPending?: boolean
}

/**
 * Class features that are intentionally structural / narrative — subclass unlock
 * choices, later “subclass feature” placeholders, and similar shells that do not
 * need common modifiers (same idea as SRD progression table rows).
 */
export function isStructuralOrNarrativeFeature(
  feature: Pick<Feature, "name" | "description" | "isChoice" | "choices"> & {
    level?: number
  },
): boolean {
  const name = (feature.name ?? "").trim()
  if (!name) return false

  const asFeature = feature as Feature
  if (isSubclassFeatureGrant(asFeature)) return true
  if (isSubclassUnlockFeature(asFeature)) return true

  // First discipline comes from the archetype grant, not a free pick.
  if (/^primary\s+discipline$/i.test(name)) return true
  // Capstone shells that are prose / transformation rather than a roll modifier.
  if (/^ascension$/i.test(name)) return true

  return false
}

/** Imported feature flagged for modifier wiring and still has no linked modifiers. */
export function featureNeedsModifierReview(feature: ModifierReviewCarrier): boolean {
  if (isStructuralOrNarrativeFeature(feature)) return false
  return Boolean(feature.modifierReviewPending) && (feature.linkedModifiers?.length ?? 0) === 0
}

export function clearModifierReviewPending<T extends ModifierReviewCarrier>(feature: T): T {
  if (!feature.modifierReviewPending) return feature
  const { modifierReviewPending: _flag, ...rest } = feature
  return rest as T
}

export function markFeatureModifierReviewForPersist(feature: Feature): Feature {
  if (isStructuralOrNarrativeFeature(feature)) {
    return clearModifierReviewPending(feature as ModifierReviewCarrier)
  }
  if ((feature.linkedModifiers?.length ?? 0) > 0) {
    return clearModifierReviewPending(feature as ModifierReviewCarrier)
  }
  return { ...feature, modifierReviewPending: true }
}

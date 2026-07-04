import {
  detectFeatureModifiers,
  mergeDetectionsIntoFeature,
  type DetectFeatureContext,
} from "@/lib/import/detect-feature-modifiers"
import { featureAlreadyGrantsCheckRoll } from "@/lib/character/collect-feature-roll-modes"
import type { Feature } from "@/lib/types"

function filterRedundantCheckDetections(
  feature: Feature,
  detections: ReturnType<typeof detectFeatureModifiers>,
) {
  return detections.filter((detection) => {
    if (!detection.ruleId.startsWith("check.") && !detection.ruleId.startsWith("save.")) {
      return true
    }
    const effect = detection.instance.activation?.effects?.[0]
    if (!effect) return true
    if (featureAlreadyGrantsCheckRoll(feature, effect.checkCategory ?? null, effect.checkAbility)) {
      return false
    }
    return true
  })
}

/** Name-independent mechanical detection after preset/name-based enrichment. */
export function enrichFeatureWithMechanicalDetection(
  feature: Feature,
  ctx: DetectFeatureContext,
): Feature {
  let detections = detectFeatureModifiers(feature.description ?? "", ctx)
  if (!detections.length) return feature

  detections = filterRedundantCheckDetections(feature, detections)
  if (!detections.length) return feature

  // Choice features describe per-option grants in their body text. Proficiency
  // auto-detection on the full description would apply every sub-option reward
  // at once (e.g. Druid Primal Order → Warden martial weapons without a pick).
  if (feature.isChoice && (feature.choices?.options?.length ?? 0) > 0) {
    detections = detections.filter(
      (detection) =>
        !detection.ruleId.startsWith("proficiency.") && !detection.ruleId.startsWith("spell."),
    )
  }
  if (!detections.length) return feature

  return mergeDetectionsIntoFeature(feature, detections)
}

export function enrichFeaturesWithMechanicalDetection(
  features: Feature[],
  ctx: Omit<DetectFeatureContext, "featureName" | "level">,
): Feature[] {
  return features.map((feature) =>
    enrichFeatureWithMechanicalDetection(feature, {
      ...ctx,
      featureName: feature.name,
      level: feature.level,
    }),
  )
}

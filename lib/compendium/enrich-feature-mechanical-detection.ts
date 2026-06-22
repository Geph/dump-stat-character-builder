import {
  detectFeatureModifiers,
  mergeDetectionsIntoFeature,
  type DetectFeatureContext,
} from "@/lib/import/detect-feature-modifiers"
import type { Feature } from "@/lib/types"

/** Name-independent mechanical detection after preset/name-based enrichment. */
export function enrichFeatureWithMechanicalDetection(
  feature: Feature,
  ctx: DetectFeatureContext,
): Feature {
  const detections = detectFeatureModifiers(feature.description ?? "", ctx)
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

import type { ImportContent, NewToggleImport } from "@/lib/import/content-schema"
import { markFeatureModifierReviewForPersist } from "@/lib/compendium/modifier-review"
import { alignImportParentClassNames } from "@/lib/import/resolve-parent-class"
import type { Feature } from "@/lib/types"

type StagingFeature = Feature & {
  mechanics?: unknown[]
  importModifierMeta?: unknown[]
  new_toggles?: NewToggleImport[]
}

/**
 * new_toggles belongs at the class/subclass level (sibling of features[]), but the LLM
 * sometimes nests it inside the individual feature that needs it instead — hoist any of
 * those up rather than silently dropping them (ClassFeatureSchema has no new_toggles field,
 * so they'd otherwise vanish once the feature is normalized).
 */
function hoistNewTogglesFromFeatures(
  features: unknown[] | undefined,
  existing: NewToggleImport[] | undefined,
): NewToggleImport[] | undefined {
  const collected: NewToggleImport[] = [...(existing ?? [])]
  for (const raw of features ?? []) {
    const feature = raw as StagingFeature
    for (const toggle of feature.new_toggles ?? []) {
      if (!collected.some((entry) => entry.key === toggle.key)) {
        collected.push(toggle)
      }
    }
  }
  return collected.length > 0 ? collected : existing
}

function stripFeatureStagingFields<T extends StagingFeature>(
  feature: T,
): Omit<T, "mechanics" | "importModifierMeta" | "new_toggles"> {
  const { mechanics: _mechanics, importModifierMeta: _meta, new_toggles: _toggles, ...rest } = feature
  return rest
}

function stripFeatures(features: unknown[] | undefined): unknown[] | undefined {
  if (!features?.length) return features
  return features.map((raw) =>
    markFeatureModifierReviewForPersist(stripFeatureStagingFields(raw as StagingFeature) as unknown as Feature),
  )
}

/** Remove import-only staging fields before writing to the compendium. */
export function sanitizeImportContentForPersist(content: ImportContent): ImportContent {
  const aligned = alignImportParentClassNames(content)
  const next: ImportContent = { ...aligned }

  if (aligned.classes?.length) {
    next.classes = aligned.classes.map((cls) => ({
      ...cls,
      features: stripFeatures(cls.features) as typeof cls.features,
      new_toggles: hoistNewTogglesFromFeatures(cls.features, cls.new_toggles),
    }))
  }

  if (aligned.subclasses?.length) {
    next.subclasses = aligned.subclasses.map((subclass) => ({
      ...subclass,
      features: stripFeatures(subclass.features) as typeof subclass.features,
      new_toggles: hoistNewTogglesFromFeatures(subclass.features, subclass.new_toggles),
    }))
  }

  if (aligned.species?.length) {
    next.species = aligned.species.map((species) => ({
      ...species,
      traits: stripFeatures(species.traits) as typeof species.traits,
    }))
  }

  if (aligned.backgrounds?.length) {
    next.backgrounds = aligned.backgrounds.map((background) => {
      if (!background.feature) return background
      return {
        ...background,
        feature: markFeatureModifierReviewForPersist(
          stripFeatureStagingFields(background.feature as StagingFeature) as unknown as Feature,
        ),
      }
    })
  }

  if (aligned.feats?.length) {
    next.feats = aligned.feats.map((feat) =>
      markFeatureModifierReviewForPersist(stripFeatureStagingFields(feat as StagingFeature) as unknown as Feature),
    ) as typeof content.feats
  }

  return next as unknown as ImportContent
}

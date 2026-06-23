import type { ImportContent } from "@/lib/import/content-schema"
import { markFeatureModifierReviewForPersist } from "@/lib/compendium/modifier-review"
import type { Feature } from "@/lib/types"

type StagingFeature = Feature & {
  mechanics?: unknown[]
  importModifierMeta?: unknown[]
}

function stripFeatureStagingFields<T extends StagingFeature>(
  feature: T,
): Omit<T, "mechanics" | "importModifierMeta"> {
  const { mechanics: _mechanics, importModifierMeta: _meta, ...rest } = feature
  return rest
}

function stripFeatures(features: unknown[] | undefined): unknown[] | undefined {
  if (!features?.length) return features
  return features.map((raw) =>
    markFeatureModifierReviewForPersist(stripFeatureStagingFields(raw as StagingFeature) as Feature),
  )
}

/** Remove import-only staging fields before writing to the compendium. */
export function sanitizeImportContentForPersist(content: ImportContent): ImportContent {
  const next: ImportContent = { ...content }

  if (content.classes?.length) {
    next.classes = content.classes.map((cls) => ({
      ...cls,
      features: stripFeatures(cls.features) as typeof cls.features,
    }))
  }

  if (content.subclasses?.length) {
    next.subclasses = content.subclasses.map((subclass) => ({
      ...subclass,
      features: stripFeatures(subclass.features) as typeof subclass.features,
    }))
  }

  if (content.species?.length) {
    next.species = content.species.map((species) => ({
      ...species,
      traits: stripFeatures(species.traits) as typeof species.traits,
    }))
  }

  if (content.backgrounds?.length) {
    next.backgrounds = content.backgrounds.map((background) => {
      if (!background.feature) return background
      return {
        ...background,
        feature: stripFeatureStagingFields(background.feature as StagingFeature),
      }
    })
  }

  if (content.feats?.length) {
    next.feats = content.feats.map((feat) =>
      stripFeatureStagingFields(feat as StagingFeature),
    ) as typeof content.feats
  }

  return next
}

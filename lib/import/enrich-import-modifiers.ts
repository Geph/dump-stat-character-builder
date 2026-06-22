import type { ImportContent } from "@/lib/import/content-schema"
import {
  detectFeatureModifiers,
  mergeFeatureModifierDetections,
  type DetectFeatureContext,
  type ImportModifierMeta,
} from "@/lib/import/detect-feature-modifiers"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import type { Feature, Trait } from "@/lib/types"

type ImportFeatRow = ImportContent["feats"] extends (infer T)[] | undefined ? T : never

type ImportMechanicsCarrier = {
  name: string
  description: string
  mechanics?: import("@/lib/import/content-schema").ImportMechanic[]
  linkedModifiers?: Feature["linkedModifiers"]
  modifierRefs?: Feature["modifierRefs"]
  importModifierMeta?: ImportModifierMeta[]
}

function enrichFeatureLike<T extends ImportMechanicsCarrier>(
  item: T,
  ctx: DetectFeatureContext,
): T {
  const aiDetections = aiMechanicsToDetections(item.mechanics, ctx)
  const detectorDetections = detectFeatureModifiers(item.description ?? "", ctx)
  if (!aiDetections.length && !detectorDetections.length) return item

  const merged = mergeFeatureModifierDetections(
    item as Feature,
    aiDetections,
    detectorDetections,
  )

  return {
    ...item,
    linkedModifiers: merged.linkedModifiers,
    modifierRefs: merged.modifierRefs,
    importModifierMeta: merged.importModifierMeta,
  }
}

function enrichFeatures(
  features: Feature[] | undefined,
  ctx: Omit<DetectFeatureContext, "featureName">,
): Feature[] | undefined {
  if (!features?.length) return features
  return features.map((feature) =>
    enrichFeatureLike(feature as ImportMechanicsCarrier, {
      ...ctx,
      featureName: feature.name,
      level: feature.level,
    }),
  ) as Feature[]
}

function enrichTraits(
  traits: Trait[] | undefined,
  sourceName: string,
): Trait[] | undefined {
  if (!traits?.length) return traits
  return traits.map((trait) =>
    enrichFeatureLike(trait as ImportMechanicsCarrier, {
      contentKind: "species_trait",
      sourceName,
      featureName: trait.name,
      level: trait.level,
    }),
  ) as Trait[]
}

function enrichFeats(feats: ImportFeatRow[] | undefined): ImportFeatRow[] | undefined {
  if (!feats?.length) return feats
  return feats.map((feat) => {
    const description = feat.description ?? ""
    const enriched = enrichFeatureLike(
      {
        ...feat,
        description,
        linkedModifiers: (feat as { linkedModifiers?: Feature["linkedModifiers"] }).linkedModifiers,
        modifierRefs: (feat as { modifierRefs?: Feature["modifierRefs"] }).modifierRefs,
      },
      {
        contentKind: "feat",
        sourceName: feat.name,
        featureName: feat.name,
      },
    )
    return {
      ...feat,
      linkedModifiers: enriched.linkedModifiers,
      modifierRefs: enriched.modifierRefs,
      importModifierMeta: enriched.importModifierMeta,
    } as ImportFeatRow
  })
}

/** Run AI mechanics parsing + mechanical phrase detection on importable features. */
export function enrichImportContentModifiers(content: ImportContent): ImportContent {
  const next: ImportContent = { ...content }

  if (content.classes?.length) {
    next.classes = content.classes.map((cls) => ({
      ...cls,
      features: enrichFeatures(cls.features as Feature[], {
        contentKind: "class_feature",
        sourceName: cls.name,
      }) as typeof cls.features,
    }))
  }

  if (content.subclasses?.length) {
    next.subclasses = content.subclasses.map((subclass) => ({
      ...subclass,
      features: enrichFeatures(subclass.features as Feature[], {
        contentKind: "subclass_feature",
        sourceName: subclass.name,
      }) as typeof subclass.features,
    }))
  }

  if (content.species?.length) {
    next.species = content.species.map((species) => ({
      ...species,
      traits: enrichTraits(species.traits as Trait[], species.name) as typeof species.traits,
    }))
  }

  if (content.backgrounds?.length) {
    next.backgrounds = content.backgrounds.map((background) => {
      if (!background.feature?.description) return background
      const enriched = enrichFeatureLike(background.feature, {
        contentKind: "background_feature",
        sourceName: background.name,
        featureName: background.feature.name,
      })
      return {
        ...background,
        feature: syncModifierRefs({
          ...background.feature,
          linkedModifiers: enriched.linkedModifiers,
          modifierRefs: enriched.modifierRefs,
          importModifierMeta: enriched.importModifierMeta,
        }),
      }
    })
  }

  if (content.feats?.length) {
    next.feats = enrichFeats(content.feats)
  }

  return next
}

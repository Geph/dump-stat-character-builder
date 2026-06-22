import type { ImportContent } from "@/lib/import/content-schema"
import {
  modifierSummaryFromInstance,
  type ImportModifierMeta,
} from "@/lib/import/detect-feature-modifiers"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { Feature } from "@/lib/types"

export type ImportModifierPreviewEntry = {
  id: string
  sourceLabel: string
  featureName: string
  featureLevel?: number
  summary: string
  confidence: ImportModifierMeta["confidence"]
  matchedPhrase: string
  source: ImportModifierMeta["source"]
  ruleId: string
}

type FeatureCarrier = Feature & {
  importModifierMeta?: ImportModifierMeta[]
}

function previewFromFeature(
  sourceLabel: string,
  feature: FeatureCarrier,
): ImportModifierPreviewEntry[] {
  const linked = feature.linkedModifiers ?? []
  const metaByInstance = new Map(
    (feature.importModifierMeta ?? []).map((entry) => [entry.instanceId, entry]),
  )

  return linked.map((instance, index) => {
    const meta = metaByInstance.get(instance.instanceId)
    return {
      id: `${sourceLabel}::${feature.name}::${instance.instanceId || index}`,
      sourceLabel,
      featureName: feature.name,
      featureLevel: feature.level,
      summary: modifierSummaryFromInstance(instance),
      confidence: meta?.confidence ?? "medium",
      matchedPhrase: meta?.matchedPhrase ?? "Auto-wired modifier",
      source: meta?.source ?? "detector",
      ruleId: meta?.ruleId ?? "unknown",
    }
  })
}

/** Collect auto-wired modifier previews for the import review UI. */
export function collectImportModifierPreviews(content: ImportContent): ImportModifierPreviewEntry[] {
  const previews: ImportModifierPreviewEntry[] = []

  for (const cls of content.classes ?? []) {
    for (const feature of (cls.features ?? []) as FeatureCarrier[]) {
      previews.push(...previewFromFeature(`Class: ${cls.name}`, feature))
    }
  }

  for (const subclass of content.subclasses ?? []) {
    for (const feature of (subclass.features ?? []) as FeatureCarrier[]) {
      previews.push(
        ...previewFromFeature(`Subclass: ${subclass.name} (${subclass.class_name})`, feature),
      )
    }
  }

  for (const species of content.species ?? []) {
    for (const trait of (species.traits ?? []) as FeatureCarrier[]) {
      previews.push(...previewFromFeature(`Species: ${species.name}`, trait))
    }
  }

  for (const background of content.backgrounds ?? []) {
    if (background.feature) {
      previews.push(
        ...previewFromFeature(`Background: ${background.name}`, background.feature as FeatureCarrier),
      )
    }
  }

  for (const feat of content.feats ?? []) {
    previews.push(...previewFromFeature(`Feat: ${feat.name}`, feat as FeatureCarrier))
  }

  return previews
}

function removeModifierFromFeature(
  feature: FeatureCarrier,
  instanceId: string,
): FeatureCarrier {
  const linkedModifiers = (feature.linkedModifiers ?? []).filter(
    (instance) => instance.instanceId !== instanceId,
  ) as LinkedModifierInstance[]
  const importModifierMeta = (feature.importModifierMeta ?? []).filter(
    (entry) => entry.instanceId !== instanceId,
  )
  return syncModifierRefs({
    ...feature,
    linkedModifiers,
    importModifierMeta,
  })
}

/** Remove one auto-wired modifier from staged import content by preview entry id. */
export function removeImportModifierPreview(
  content: ImportContent,
  previewId: string,
): ImportContent {
  const [sourceLabel, featureName, instanceId] = previewId.split("::")
  if (!sourceLabel || !featureName || !instanceId) return content

  const next: ImportContent = { ...content }

  if (sourceLabel.startsWith("Class: ")) {
    const className = sourceLabel.slice("Class: ".length)
    next.classes = content.classes?.map((cls) =>
      cls.name !== className
        ? cls
        : {
            ...cls,
            features: (cls.features ?? []).map((feature) =>
              feature.name === featureName
                ? removeModifierFromFeature(feature as FeatureCarrier, instanceId)
                : feature,
            ),
          },
    )
    return next
  }

  if (sourceLabel.startsWith("Subclass: ")) {
    const subclassLabel = sourceLabel.slice("Subclass: ".length)
    const subclassName = subclassLabel.replace(/\s+\([^)]+\)$/, "")
    next.subclasses = content.subclasses?.map((subclass) =>
      subclass.name !== subclassName
        ? subclass
        : {
            ...subclass,
            features: (subclass.features ?? []).map((feature) =>
              feature.name === featureName
                ? removeModifierFromFeature(feature as FeatureCarrier, instanceId)
                : feature,
            ),
          },
    )
    return next
  }

  if (sourceLabel.startsWith("Species: ")) {
    const speciesName = sourceLabel.slice("Species: ".length)
    next.species = content.species?.map((species) =>
      species.name !== speciesName
        ? species
        : {
            ...species,
            traits: (species.traits ?? []).map((trait) =>
              trait.name === featureName
                ? removeModifierFromFeature(trait as FeatureCarrier, instanceId)
                : trait,
            ),
          },
    )
    return next
  }

  if (sourceLabel.startsWith("Background: ")) {
    const backgroundName = sourceLabel.slice("Background: ".length)
    next.backgrounds = content.backgrounds?.map((background) => {
      if (background.name !== backgroundName || !background.feature) return background
      if (background.feature.name !== featureName) return background
      return {
        ...background,
        feature: removeModifierFromFeature(background.feature as FeatureCarrier, instanceId),
      }
    })
    return next
  }

  if (sourceLabel.startsWith("Feat: ")) {
    const featName = sourceLabel.slice("Feat: ".length)
    next.feats = content.feats?.map((feat) =>
      feat.name !== featName
        ? feat
        : removeModifierFromFeature(feat as FeatureCarrier, instanceId),
    )
  }

  return next
}

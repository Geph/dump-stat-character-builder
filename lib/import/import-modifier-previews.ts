import type { ImportContent } from "@/lib/import/content-schema"
import {
  modifierSummaryFromInstance,
  type ImportModifierMeta,
} from "@/lib/import/detect-feature-modifiers"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import {
  isSubclassSpellTableFeature,
  parseSubclassSpellTable,
} from "@/lib/import/subclass-spell-table"
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

export type ImportUnmatchedFeatureEntry = {
  id: string
  sourceLabel: string
  featureName: string
  featureLevel?: number
}

type FeatureCarrier = Feature & {
  importModifierMeta?: ImportModifierMeta[]
}

function featureHasLinkedModifiers(feature: Feature): boolean {
  if ((feature.linkedModifiers?.length ?? 0) > 0) return true
  if (feature.isChoice && (feature.choices?.options?.length ?? 0) > 0) return true
  if (feature.companion_stat_block) return true
  const name = feature.name ?? ""
  const description = feature.description ?? ""
  if (isSubclassSpellTableFeature(name, description)) {
    return Boolean(parseSubclassSpellTable(description))
  }
  return false
}

function collectUnmatchedFromFeature(
  sourceLabel: string,
  feature: Feature,
  entries: ImportUnmatchedFeatureEntry[],
): void {
  const name = feature.name?.trim()
  if (!name || featureHasLinkedModifiers(feature)) return
  entries.push({
    id: `${sourceLabel}::${name}::${feature.level ?? 0}`,
    sourceLabel,
    featureName: name,
    featureLevel: feature.level,
  })
}

/** Features with no auto-wired linked modifiers after enrichment. */
export function collectUnmatchedModifierFeatures(
  content: ImportContent,
): ImportUnmatchedFeatureEntry[] {
  const entries: ImportUnmatchedFeatureEntry[] = []

  for (const cls of content.classes ?? []) {
    for (const feature of cls.features ?? []) {
      collectUnmatchedFromFeature(`Class: ${cls.name}`, feature as unknown as Feature, entries)
    }
  }

  for (const subclass of content.subclasses ?? []) {
    for (const feature of subclass.features ?? []) {
      collectUnmatchedFromFeature(
        `Subclass: ${subclass.name} (${subclass.class_name})`,
        feature as unknown as Feature,
        entries,
      )
    }
  }

  for (const species of content.species ?? []) {
    for (const trait of species.traits ?? []) {
      collectUnmatchedFromFeature(`Species: ${species.name}`, trait as unknown as Feature, entries)
    }
  }

  for (const background of content.backgrounds ?? []) {
    if (background.feature) {
      collectUnmatchedFromFeature(
        `Background: ${background.name}`,
        background.feature as unknown as Feature,
        entries,
      )
    }
  }

  for (const feat of content.feats ?? []) {
    collectUnmatchedFromFeature(`Feat: ${feat.name}`, feat as unknown as Feature, entries)
  }

  return entries
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

export type ImportModifierReviewRow = {
  id: string
  sourceLabel: string
  featureName: string
  featureLevel?: number
  status: "wired" | "unwired"
  modifiers: ImportModifierPreviewEntry[]
}

function reviewRowId(sourceLabel: string, featureName: string, featureLevel?: number): string {
  return `${sourceLabel}::${featureName}::${featureLevel ?? 0}`
}

function pushReviewRow(
  rows: ImportModifierReviewRow[],
  sourceLabel: string,
  feature: FeatureCarrier,
  previews: ImportModifierPreviewEntry[],
): void {
  const wiredByStructure = featureHasLinkedModifiers(feature)
  rows.push({
    id: reviewRowId(sourceLabel, feature.name, feature.level),
    sourceLabel,
    featureName: feature.name,
    featureLevel: feature.level,
    status: previews.length > 0 || wiredByStructure ? "wired" : "unwired",
    modifiers: previews,
  })
}

/** Per-feature modifier wiring status for import review. */
export function collectImportModifierReview(content: ImportContent): ImportModifierReviewRow[] {
  const rows: ImportModifierReviewRow[] = []

  for (const cls of content.classes ?? []) {
    for (const feature of (cls.features ?? []) as FeatureCarrier[]) {
      pushReviewRow(rows, `Class: ${cls.name}`, feature, previewFromFeature(`Class: ${cls.name}`, feature))
    }
  }

  for (const subclass of content.subclasses ?? []) {
    for (const feature of (subclass.features ?? []) as FeatureCarrier[]) {
      const label = `Subclass: ${subclass.name} (${subclass.class_name})`
      pushReviewRow(rows, label, feature, previewFromFeature(label, feature))
    }
  }

  for (const species of content.species ?? []) {
    for (const trait of (species.traits ?? []) as FeatureCarrier[]) {
      pushReviewRow(rows, `Species: ${species.name}`, trait, previewFromFeature(`Species: ${species.name}`, trait))
    }
  }

  for (const background of content.backgrounds ?? []) {
    if (!background.feature) continue
    pushReviewRow(
      rows,
      `Background: ${background.name}`,
      background.feature as FeatureCarrier,
      previewFromFeature(`Background: ${background.name}`, background.feature as FeatureCarrier),
    )
  }

  for (const feat of content.feats ?? []) {
    pushReviewRow(
      rows,
      `Feat: ${feat.name}`,
      feat as FeatureCarrier,
      previewFromFeature(`Feat: ${feat.name}`, feat as FeatureCarrier),
    )
  }

  return rows
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
    ) as ImportContent["classes"]
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
    ) as ImportContent["subclasses"]
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
    ) as ImportContent["species"]
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

  return next as unknown as ImportContent
}

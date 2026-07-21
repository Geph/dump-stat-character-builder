import type { ImportContent } from "@/lib/import/content-schema"
import {
  modifierSummaryFromInstance,
  type ImportModifierMeta,
} from "@/lib/import/detect-feature-modifiers"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { isStructuralOrNarrativeFeature } from "@/lib/compendium/modifier-review"
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

type FeatureCarrier = Omit<Feature, "level"> & {
  /** Class/subclass features use level; abilities may use level_requirement instead. */
  level?: number
  importModifierMeta?: ImportModifierMeta[]
  psionic_augments?: import("@/lib/compendium/parse-psionic-augments").PsionicAugmentsConfig | null
}

function abilityAsFeatureCarrier(
  ability: NonNullable<ImportContent["abilities"]>[number],
): FeatureCarrier {
  const augments = (ability as { psionic_augments?: FeatureCarrier["psionic_augments"] })
    .psionic_augments
  return {
    ...(ability as unknown as FeatureCarrier),
    name: ability.name,
    description: ability.description,
    level: ability.level_requirement ?? undefined,
    ...(augments ? { psionic_augments: augments } : {}),
  }
}

function psionicAugmentCount(feature: FeatureCarrier): number {
  const augments = (feature as { psionic_augments?: { augments?: unknown[] } | null }).psionic_augments
  return augments?.augments?.length ?? 0
}

function featureHasLinkedModifiers(feature: FeatureCarrier): boolean {
  if ((feature.linkedModifiers?.length ?? 0) > 0) return true
  if (feature.limitedUses) return true
  if (
    feature.activation &&
    (feature.activation.action ||
      feature.activation.bonusAction ||
      feature.activation.reaction ||
      feature.activation.onInitiative ||
      feature.activation.onDropToZeroHp)
  ) {
    return true
  }
  if (feature.isChoice && (feature.choices?.options?.length ?? 0) > 0) return true
  if (feature.isChoice && feature.choices?.optionsSource) return true
  if (feature.companion_stat_block) return true
  if (psionicAugmentCount(feature) > 0) return true
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
  if (isStructuralOrNarrativeFeature(feature)) return
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

  for (const ability of content.abilities ?? []) {
    const label = ability.source_name
      ? `Ability: ${ability.name} (${ability.source_name})`
      : `Ability: ${ability.name}`
    collectUnmatchedFromFeature(label, abilityAsFeatureCarrier(ability) as unknown as Feature, entries)
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

  const previews = linked.map((instance, index) => {
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

  const augmentCount = psionicAugmentCount(feature)
  if (augmentCount > 0) {
    previews.push({
      id: `${sourceLabel}::${feature.name}::psionic_augments`,
      sourceLabel,
      featureName: feature.name,
      featureLevel: feature.level,
      summary: `${augmentCount} psi augment${augmentCount === 1 ? "" : "s"}`,
      confidence: "high",
      matchedPhrase: "Parsed from augment list (spend psi points up to your per-use limit…)",
      source: "detector",
      ruleId: "psionic.augments",
    })
  }

  if (feature.companion_stat_block && !previews.some((entry) => /companion/i.test(entry.summary))) {
    previews.push({
      id: `${sourceLabel}::${feature.name}::companion_stat_block`,
      sourceLabel,
      featureName: feature.name,
      featureLevel: feature.level,
      summary: "Companion stat block",
      confidence: "high",
      matchedPhrase: "Parsed companion / construct statistics",
      source: "detector",
      ruleId: "companion.stat_block",
    })
  }

  return previews
}

export type ImportModifierReviewRow = {
  id: string
  sourceLabel: string
  featureName: string
  featureLevel?: number
  status: "wired" | "unwired" | "structural"
  modifiers: ImportModifierPreviewEntry[]
  note?: string
}

function reviewRowId(sourceLabel: string, featureName: string, featureLevel?: number): string {
  return `${sourceLabel}::${featureName}::${featureLevel ?? 0}`
}

function featureHasChoicePool(feature: FeatureCarrier): boolean {
  const isChoice = Boolean(
    feature.isChoice ?? (feature as { is_choice?: boolean }).is_choice,
  )
  if (!isChoice) return false
  const choices = feature.choices as
    | { options?: unknown[]; optionsSource?: string | null; category?: string }
    | null
    | undefined
  if (!choices) return false
  if (choices.optionsSource) return true
  return Array.isArray(choices.options) && choices.options.length > 0
}

function pushReviewRow(
  rows: ImportModifierReviewRow[],
  sourceLabel: string,
  feature: FeatureCarrier,
  previews: ImportModifierPreviewEntry[],
): void {
  const wiredByStructure = featureHasLinkedModifiers(feature) || featureHasChoicePool(feature)
  if (previews.length > 0 || wiredByStructure) {
    rows.push({
      id: reviewRowId(sourceLabel, feature.name, feature.level),
      sourceLabel,
      featureName: feature.name,
      featureLevel: feature.level,
      status: "wired",
      modifiers: previews.length
        ? previews
        : featureHasChoicePool(feature)
          ? [
              {
                id: `${sourceLabel}::${feature.name}::choice_pool`,
                sourceLabel,
                featureName: feature.name,
                featureLevel: feature.level,
                summary: `Choice pool (${(feature.choices as { optionsSource?: string; category?: string })?.optionsSource ?? (feature.choices as { category?: string })?.category ?? "options"})`,
                confidence: "high",
                matchedPhrase: "Name preset / choice shell",
                source: "detector",
                ruleId: "feat.choice_pool",
              },
            ]
          : [],
    })
    return
  }
  if (isStructuralOrNarrativeFeature(feature)) {
    rows.push({
      id: reviewRowId(sourceLabel, feature.name, feature.level),
      sourceLabel,
      featureName: feature.name,
      featureLevel: feature.level,
      status: "structural",
      modifiers: [],
      note: "Structural / narrative — no common modifiers expected (subclass pick, placeholder, or sheet-side transformation).",
    })
    return
  }
  rows.push({
    id: reviewRowId(sourceLabel, feature.name, feature.level),
    sourceLabel,
    featureName: feature.name,
    featureLevel: feature.level,
    status: "unwired",
    modifiers: [],
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

  for (const ability of content.abilities ?? []) {
    const label = ability.source_name
      ? `Ability: ${ability.name} (${ability.source_name})`
      : `Ability: ${ability.name}`
    const carrier = abilityAsFeatureCarrier(ability)
    pushReviewRow(rows, label, carrier, previewFromFeature(label, carrier))
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

  for (const ability of content.abilities ?? []) {
    const label = ability.source_name
      ? `Ability: ${ability.name} (${ability.source_name})`
      : `Ability: ${ability.name}`
    previews.push(...previewFromFeature(label, abilityAsFeatureCarrier(ability)))
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
    ) as ImportContent["feats"]
    return next
  }

  if (sourceLabel.startsWith("Ability: ")) {
    const abilityLabel = sourceLabel.slice("Ability: ".length)
    const abilityName = abilityLabel.replace(/\s+\([^)]+\)$/, "")
    next.abilities = content.abilities?.map((ability) =>
      ability.name !== abilityName
        ? ability
        : removeModifierFromFeature(abilityAsFeatureCarrier(ability), instanceId),
    ) as ImportContent["abilities"]
  }

  return next as unknown as ImportContent
}

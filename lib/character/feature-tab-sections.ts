import { chosenOptionNames } from "@/lib/character/chosen-option-label"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { featureShowsOnSheetTab } from "@/lib/compendium/feature-sheet-display"
import type { Feat, Feature, Trait } from "@/lib/types"

export type FeatureTabItem = {
  id: string
  name: string
  level?: number | null
  levels?: number[]
  description?: string | null
  chosenNames: string[]
  classId?: string
  feature?: Feature
  collapsedLines?: number
}

export type FeatureTabSection = {
  id: string
  title: string
  items: FeatureTabItem[]
}

function dedupeFeaturesByName(features: Feature[]): { feature: Feature; levels: number[] }[] {
  const byName = new Map<string, { feature: Feature; levels: number[] }>()
  const order: string[] = []
  for (const feature of features) {
    const existing = byName.get(feature.name)
    if (existing) {
      if (!existing.levels.includes(feature.level)) existing.levels.push(feature.level)
    } else {
      byName.set(feature.name, { feature, levels: [feature.level] })
      order.push(feature.name)
    }
  }
  for (const entry of byName.values()) entry.levels.sort((a, b) => a - b)
  return order.map((name) => byName.get(name)!)
}

export function buildFeatureTabSections(params: {
  classDetails: CharacterClassDetail[]
  species?: { name: string; traits?: Trait[] | null } | null
  backgroundFeature?: { name: string; description?: string | null } | null
  originFeat?: Feat | null
  originFeatFallbackName?: string | null
  originFeatFallbackDescription?: string | null
  feats: Feat[]
  featureChoicePicks: Record<string, string[]>
}): FeatureTabSection[] {
  const sections: FeatureTabSection[] = []
  const picks = params.featureChoicePicks

  for (const entry of params.classDetails) {
    const classFeatures = ((entry.class?.features as Feature[] | undefined) ?? []).filter(
      (feature) => feature.level <= entry.row.level && featureShowsOnSheetTab(feature),
    )
    if (!classFeatures.length) continue
    const sectionId = `class:${entry.row.class_id}`
    sections.push({
      id: sectionId,
      title: `${entry.class?.name ?? "Class"} Features${params.classDetails.length > 1 ? ` (Level ${entry.row.level})` : ""}`,
      items: dedupeFeaturesByName(classFeatures).map(({ feature, levels }) => ({
        id: `${sectionId}:${feature.name}`,
        name: feature.name,
        level: feature.level,
        levels: levels.length > 1 ? levels : undefined,
        description: feature.description,
        chosenNames: chosenOptionNames(feature, entry.row.class_id, picks),
        classId: entry.row.class_id,
        feature,
      })),
    })
  }

  for (const entry of params.classDetails) {
    const subclassFeatures = ((entry.subclass?.features as Feature[] | undefined) ?? []).filter(
      (feature) => feature.level <= entry.row.level && featureShowsOnSheetTab(feature),
    )
    if (!subclassFeatures.length || !entry.subclass) continue
    const sectionId = `subclass:${entry.row.class_id}`
    sections.push({
      id: sectionId,
      title: `${entry.subclass.name} Features`,
      items: subclassFeatures.map((feature) => ({
        id: `${sectionId}:${feature.name}:${feature.level}`,
        name: feature.name,
        level: feature.level,
        description: feature.description,
        chosenNames: chosenOptionNames(feature, entry.row.class_id, picks),
        classId: entry.row.class_id,
        feature,
      })),
    })
  }

  if (params.species?.traits?.length) {
    const sectionId = "species"
    sections.push({
      id: sectionId,
      title: `${params.species.name} Traits`,
      items: params.species.traits.map((trait) => ({
        id: `${sectionId}:${trait.name}`,
        name: trait.name,
        description: trait.description,
        chosenNames: chosenOptionNames(trait, null, picks),
      })),
    })
  }

  if (params.backgroundFeature) {
    const sectionId = "background"
    sections.push({
      id: sectionId,
      title: "Background Feature",
      items: [
        {
          id: `${sectionId}:feature`,
          name: params.backgroundFeature.name,
          description: params.backgroundFeature.description,
          chosenNames: chosenOptionNames(params.backgroundFeature, null, picks),
        },
      ],
    })
  }

  const featItems: FeatureTabItem[] = []
  if (params.originFeat || params.originFeatFallbackName) {
    featItems.push({
      id: "feat:origin",
      name: params.originFeat?.name ?? params.originFeatFallbackName ?? "Origin Feat",
      description: params.originFeat?.description ?? params.originFeatFallbackDescription ?? "Granted by your background at 1st level.",
      chosenNames: params.originFeat ? chosenOptionNames(params.originFeat, null, picks) : [],
      collapsedLines: 4,
    })
  }
  for (const feat of params.feats) {
    featItems.push({
      id: `feat:${feat.id}`,
      name: feat.name,
      description: feat.description,
      chosenNames: chosenOptionNames(feat, null, picks),
      collapsedLines: 4,
    })
  }
  if (featItems.length) {
    sections.push({ id: "feats", title: "Feats & Boons", items: featItems })
  }

  return sections
}

export function featureTabNavLabel(title: string): string {
  return title
    .replace(/ Features(?: \(Level \d+\))?$/i, "")
    .replace(/ Traits$/i, "")
    .replace(/ Feature$/i, "")
    .replace(/^Feats & Boons$/i, "Feats")
}

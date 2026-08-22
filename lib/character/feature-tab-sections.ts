import { chosenOptionNames } from "@/lib/character/chosen-option-label"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  formatAsiAllocationSummary,
  getCombinedMilestoneAsiAllocation,
  getAsiPointsUsed,
  isAsiFeat,
  type AsiAllocation,
  type AsiAllocationsByFeatId,
} from "@/lib/builder/asi-allocation"
import { featChoicePickKey } from "@/lib/builder/feat-choices"
import { isSubclassFeatureGrant, isSubclassUnlockFeature } from "@/lib/builder/subclass-unlock"
import { collectAsiPoolsFromFeat } from "@/lib/character/feat-asi-pools"
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

/** True when a background row has a narrative feature worth listing on Features. */
export function backgroundFeatureShowsOnFeaturesTab(
  feature: { name?: string | null; description?: string | null } | null | undefined,
): boolean {
  if (!feature) return false
  const name = feature.name?.trim() ?? ""
  if (!name) return false
  const description = feature.description?.trim() ?? ""
  // Synthetic shell from proficiency-choice wiring — not a real feature.
  if (/^background\s+proficiencies$/i.test(name) && !description) return false
  return Boolean(description) || !/^background\s+proficiencies$/i.test(name)
}

/** Class ASI / Feat / Epic Boon milestones — listed under Feats & Boons instead. */
function isFeatMilestoneClassFeature(feature: Pick<Feature, "name">): boolean {
  return /ability\s*score\s*improvement|feat\s*or\s*asi|^asi$|^feat$|^epic\s*boon$|^general\s*feat$/i.test(
    feature.name.trim(),
  )
}

function featureHasGrantFeatModifier(feature: Feature): boolean {
  return (feature.linkedModifiers ?? []).some((instance) => {
    if (/grant_feat/i.test(instance.catalogRefId ?? "")) return true
    return (instance.characteristics ?? []).some((char) => char.type === "grant_feat")
  })
}

/**
 * Class features that are only pick shells — feats live under Feats & Boons, and
 * subclass selection is shown as its own subclass section (or builder pick).
 */
export function classFeatureRedundantOnFeaturesTab(feature: Feature): boolean {
  if (isSubclassUnlockFeature(feature)) return true
  if (isSubclassFeatureGrant(feature)) return true
  if (isFeatMilestoneClassFeature(feature)) return true
  if (featureHasGrantFeatModifier(feature)) return true
  return false
}

function classFeatureShowsOnFeaturesTab(feature: Feature): boolean {
  return featureShowsOnSheetTab(feature) && !classFeatureRedundantOnFeaturesTab(feature)
}

/** ASI / half-feat score picks to show beside the feat name on the Features tab. */
export function featAsiChosenSummary(
  feat: Feat,
  allocations: AsiAllocationsByFeatId | null | undefined,
  options?: {
    featIds?: string[]
    feats?: Feat[]
    featureChoicePicks?: Record<string, string[]>
  },
): string {
  const map = allocations ?? {}
  const merged: AsiAllocation = {}

  const merge = (allocation: AsiAllocation | undefined) => {
    if (!allocation) return
    for (const [ability, bonus] of Object.entries(allocation)) {
      if (typeof bonus !== "number" || bonus <= 0) continue
      merged[ability as keyof AsiAllocation] =
        (merged[ability as keyof AsiAllocation] ?? 0) + bonus
    }
  }

  if (isAsiFeat(feat)) {
    const combined = getCombinedMilestoneAsiAllocation(
      map,
      options?.featIds ?? [feat.id],
      options?.feats ?? [feat],
    )
    if (getAsiPointsUsed(combined) > 0) {
      merge(combined)
    } else {
      for (const [key, allocation] of Object.entries(map)) {
        if (
          key.includes(feat.id) ||
          /ability\s*score\s*improvement/i.test(key) ||
          /^feat_slot_/i.test(key)
        ) {
          merge(allocation)
        }
      }
    }
  } else {
    merge(map[feat.id])
    for (const [key, allocation] of Object.entries(map)) {
      if (key === feat.id) continue
      if (key.includes(feat.id)) merge(allocation)
    }
    for (const [slotKey, picks] of Object.entries(options?.featureChoicePicks ?? {})) {
      if (!picks.includes(feat.id)) continue
      for (const grant of collectAsiPoolsFromFeat(feat, featChoicePickKey(slotKey))) {
        merge(map[grant.allocationKey])
      }
    }
  }

  if (getAsiPointsUsed(merged) <= 0) return ""
  return formatAsiAllocationSummary(merged)
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
  asiAllocations?: AsiAllocationsByFeatId | null
  /** All selected feat ids (including ASI slots) for combined milestone ASI. */
  featIds?: string[]
  /** Feat / catalog pick id → display name for Fighting Style chrome, etc. */
  choiceLabelByPickId?: Record<string, string> | null
}): FeatureTabSection[] {
  const sections: FeatureTabSection[] = []
  const picks = params.featureChoicePicks
  const choiceLabelByPickId = params.choiceLabelByPickId

  for (const entry of params.classDetails) {
    const classFeatures = ((entry.class?.features as Feature[] | undefined) ?? []).filter(
      (feature) => feature.level <= entry.row.level && classFeatureShowsOnFeaturesTab(feature),
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
        chosenNames: chosenOptionNames(feature, entry.row.class_id, picks, {
          labelByPickId: choiceLabelByPickId,
        }),
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
        chosenNames: chosenOptionNames(feature, entry.row.class_id, picks, {
          labelByPickId: choiceLabelByPickId,
        }),
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
        chosenNames: chosenOptionNames(trait, null, picks, { labelByPickId: choiceLabelByPickId }),
      })),
    })
  }

  if (backgroundFeatureShowsOnFeaturesTab(params.backgroundFeature)) {
    const sectionId = "background"
    const backgroundFeature = params.backgroundFeature!
    sections.push({
      id: sectionId,
      title: "Background Feature",
      items: [
        {
          id: `${sectionId}:feature`,
          name: backgroundFeature.name,
          description: backgroundFeature.description,
          chosenNames: chosenOptionNames(backgroundFeature, null, picks, {
            labelByPickId: choiceLabelByPickId,
          }),
        },
      ],
    })
  }

  const featItems: FeatureTabItem[] = []
  if (params.originFeat || params.originFeatFallbackName) {
    featItems.push({
      id: "feat:origin",
      name: params.originFeat?.name ?? params.originFeatFallbackName ?? "Origin Feat",
      description:
        params.originFeat?.description ??
        params.originFeatFallbackDescription ??
        "Granted by your background at 1st level.",
      chosenNames: params.originFeat
        ? chosenOptionNames(params.originFeat, null, picks, { labelByPickId: choiceLabelByPickId })
        : [],
      collapsedLines: 4,
    })
  }
  for (const feat of params.feats) {
    const choiceNames = chosenOptionNames(feat, null, picks, { labelByPickId: choiceLabelByPickId })
    const asiSummary = featAsiChosenSummary(feat, params.asiAllocations, {
      featIds: params.featIds,
      feats: params.feats,
      featureChoicePicks: picks,
    })
    featItems.push({
      id: `feat:${feat.id}`,
      name: feat.name,
      description: feat.description,
      chosenNames: asiSummary ? [...choiceNames, asiSummary] : choiceNames,
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

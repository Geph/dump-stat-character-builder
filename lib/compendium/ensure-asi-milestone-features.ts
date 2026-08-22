import { applyFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"
import {
  GRANT_FEAT_CATALOG_ID,
  grantFeatCharacteristic,
  migrateFeatureFeatChoiceToModifierRefs,
} from "@/lib/compendium/grant-feat-catalog"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import type { Feature } from "@/lib/types"

const DEFAULT_ASI_LEVELS = [4, 8, 12, 16] as const

function uniqueRefs(refs: string[]): string[] {
  return [...new Set(refs)]
}

function featureHasGrantFeat(feature: Feature): boolean {
  return (feature.linkedModifiers?.length ?? 0) > 0 || (feature.modifierRefs ?? []).length > 0
}

function applyGrantRef(feature: Feature, featCategories: FeatPickCategory[]): Feature {
  const next = migrateFeatureFeatChoiceToModifierRefs(feature)
  const hasMatchingGrant = (next.linkedModifiers ?? []).some((instance) =>
    instance.characteristics?.some(
      (mod) =>
        mod.type === "grant_feat" &&
        JSON.stringify(mod.featCategories ?? []) === JSON.stringify(featCategories),
    ),
  )
  if (hasMatchingGrant) return { ...next, isChoice: false, choices: undefined }

  const linkedModifier = {
    instanceId: createModifierInstanceId(),
    catalogRefId: GRANT_FEAT_CATALOG_ID,
    characteristics: [grantFeatCharacteristic(featCategories)],
  }

  return {
    ...next,
    isChoice: false,
    choices: undefined,
    linkedModifiers: [...(next.linkedModifiers ?? []), linkedModifier],
    modifierRefs: uniqueRefs([...(next.modifierRefs ?? []), GRANT_FEAT_CATALOG_ID]),
  }
}

/** Wire ASI / Epic Boon / Fighting Style features to grant_feat when named that way. */
export function ensureNamedFeatGrantFeatures(features: Feature[]): Feature[] {
  return features.map((feature) => {
    let next = migrateFeatureFeatChoiceToModifierRefs(feature)
    if (/ability score improvement/i.test(next.name ?? "")) {
      next = applyGrantRef(next, ["General"])
    } else if (/epic boon/i.test(next.name ?? "")) {
      next = applyGrantRef(next, ["Epic Boon"])
    } else if (/fighting style/i.test(next.name ?? "")) {
      next = applyGrantRef(next, ["Fighting Style"])
    }
    return next
  })
}

function levelsFromPhrase(phrase: string): number[] {
  const levels: number[] = []
  for (const match of phrase.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\b/g)) {
    const level = Number(match[1])
    if (level >= 4 && level <= 20 && level !== 19) levels.push(level)
  }
  return levels
}

/**
 * Parse "again at … levels 8, 12, and 16" (or similar) from an ASI feature description.
 * Falls back to the standard 4/8/12/16 schedule when the first ASI exists but no repeat
 * levels are listed — matching SRD and the import guidance that emits ASI once at level 4.
 */
export function resolveAsiMilestoneLevels(asiFeature: Feature | undefined): number[] {
  if (!asiFeature) return [...DEFAULT_ASI_LEVELS]
  const levels = new Set<number>([asiFeature.level])
  const description = asiFeature.description ?? ""

  // Prefer an explicit "again at …" clause so "by 2" / "by 1" in ASI prose is ignored.
  const againClause = description.match(/again\s+at\b[^.!?]{0,160}/i)?.[0]
  const fromAgain = againClause ? levelsFromPhrase(againClause) : []
  if (fromAgain.length) {
    for (const level of fromAgain) levels.add(level)
    return [...levels].sort((a, b) => a - b)
  }

  // "at 4th, 8th, 12th, and 16th level" without "again"
  const ordinalList = description.match(
    /\b(?:at\s+)?(?:\d{1,2}(?:st|nd|rd|th)?[\s,]*(?:and|&)?,?\s*){2,}levels?\b/i,
  )?.[0]
  const fromOrdinals = ordinalList ? levelsFromPhrase(ordinalList) : []
  if (fromOrdinals.length >= 2) {
    for (const level of fromOrdinals) levels.add(level)
    return [...levels].sort((a, b) => a - b)
  }

  for (const level of DEFAULT_ASI_LEVELS) levels.add(level)
  return [...levels].sort((a, b) => a - b)
}

/**
 * Expand a single Ability Score Improvement / Epic Boon feature into the later
 * milestone levels so builder feat slots and level-up picks appear. Homebrew
 * classes (and AI imports) typically emit ASI once at 4 with prose naming 8/12/16.
 */
export function ensureMilestoneGrantFeatFeatures(features: Feature[]): Feature[] {
  const withGrants = ensureNamedFeatGrantFeatures(features)
  const result = withGrants.map((feature) => ({ ...feature }))
  const asiTemplate = result.find((feature) => /ability score improvement/i.test(feature.name ?? ""))
  const epicTemplate = result.find((feature) => /epic boon/i.test(feature.name ?? ""))

  for (const level of resolveAsiMilestoneLevels(asiTemplate)) {
    const existing = result.some(
      (feature) => feature.level === level && featureHasGrantFeat(feature),
    )
    if (existing) continue
    if (!asiTemplate && level !== 4) continue

    result.push({
      level,
      name: asiTemplate?.name ?? "Ability Score Improvement",
      description:
        asiTemplate?.description ??
        "Increase one ability score by 2 or two ability scores by 1, or choose a General feat.",
      modifierRefs: [GRANT_FEAT_CATALOG_ID],
      linkedModifiers: [
        {
          instanceId: createModifierInstanceId(),
          catalogRefId: GRANT_FEAT_CATALOG_ID,
          characteristics: [grantFeatCharacteristic(["General"])],
        },
      ],
    })
  }

  if (
    epicTemplate &&
    !result.some((feature) => feature.level === 19 && featureHasGrantFeat(feature))
  ) {
    result.push({
      level: 19,
      name: epicTemplate.name,
      description: epicTemplate.description,
      modifierRefs: [GRANT_FEAT_CATALOG_ID],
      linkedModifiers: [
        {
          instanceId: createModifierInstanceId(),
          catalogRefId: GRANT_FEAT_CATALOG_ID,
          characteristics: [grantFeatCharacteristic(["Epic Boon"])],
        },
      ],
    })
  }

  return result
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((feature) => (feature.sheetDisplay ? feature : applyFeatureSheetDisplay(feature)))
}

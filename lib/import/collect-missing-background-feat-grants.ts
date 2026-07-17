import type { ImportContent } from "@/lib/import/content-schema"
import {
  parseBackgroundFeatGrantChoice,
  parseBackgroundOriginFeat,
} from "@/lib/compendium/background-origin-feat"
import { normalizeFeatCategory } from "@/lib/builder/feat-selection"
import featsSeed from "@/lib/srd/seed-data/feats.json"

export type KnownFeat = { name: string; category?: string | null }

/** A background feat grant whose dependent feats are not available yet. */
export type BackgroundFeatGrantGap = {
  backgroundName: string
  grantText: string
  /** Named feats referenced by the grant that are missing (fixed grants or "X or …" choices). */
  missingFeatNames: string[]
  /** Choice category (e.g. "Dark Gift") with zero available feats, if any. */
  missingCategory: string | null
}

function normalizeFeatNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function collectKnownFeats(content: ImportContent, libraryFeats: KnownFeat[] = []): KnownFeat[] {
  const known: KnownFeat[] = []
  for (const feat of featsSeed as { name: string; category?: string | null }[]) {
    known.push({ name: feat.name, category: feat.category ?? null })
  }
  for (const feat of content.feats ?? []) {
    if (feat.name?.trim()) known.push({ name: feat.name, category: feat.category ?? null })
  }
  for (const feat of libraryFeats) {
    if (feat.name?.trim()) known.push(feat)
  }
  return known
}

/**
 * Background feat grants whose dependencies are missing from the batch, the SRD seed,
 * and the caller-provided library — named feats (e.g. "Mark of Making", "Survivor") and
 * choice categories with no feats to pick from (e.g. "Dark Gift" before Dark Gifts import).
 */
export function collectBackgroundFeatGrantGaps(
  content: ImportContent,
  libraryFeats: KnownFeat[] = [],
): BackgroundFeatGrantGap[] {
  const known = collectKnownFeats(content, libraryFeats)
  const knownNames = new Set(known.map((feat) => normalizeFeatNameKey(feat.name)))
  const knownCategories = new Set(
    known
      .map((feat) => (feat.category ? normalizeFeatCategory(feat.category) : null))
      .filter((category): category is string => Boolean(category)),
  )

  const gaps: BackgroundFeatGrantGap[] = []

  for (const background of content.backgrounds ?? []) {
    const raw = background.feat_granted?.trim()
    if (!raw) continue

    const choice = parseBackgroundFeatGrantChoice(raw)
    if (choice) {
      const missingFeatNames = (choice.alsoFeatNames ?? []).filter(
        (name) => !knownNames.has(normalizeFeatNameKey(name)),
      )
      const category = normalizeFeatCategory(choice.category)
      const missingCategory = knownCategories.has(category) ? null : category
      if (missingFeatNames.length || missingCategory) {
        gaps.push({
          backgroundName: background.name,
          grantText: raw,
          missingFeatNames,
          missingCategory,
        })
      }
      continue
    }

    const parsed = parseBackgroundOriginFeat(raw)
    const featName = parsed?.featName?.trim()
    if (!featName) continue
    if (knownNames.has(normalizeFeatNameKey(featName))) continue
    gaps.push({
      backgroundName: background.name,
      grantText: raw,
      missingFeatNames: [featName],
      missingCategory: null,
    })
  }

  return gaps
}

/**
 * Downgrade the feat grants of the given backgrounds to narrative text: the grant wording
 * moves into the background feature description and feat_granted is cleared so no
 * (unfulfillable) feat pick slot is wired.
 */
export function applyBackgroundFeatGrantNarrative(
  content: ImportContent,
  backgroundNames: string[],
): ImportContent {
  const targets = new Set(backgroundNames.map(normalizeFeatNameKey))
  return {
    ...content,
    backgrounds: (content.backgrounds ?? []).map((background) => {
      if (!targets.has(normalizeFeatNameKey(background.name))) return background
      const raw = background.feat_granted?.trim()
      if (!raw) return background
      const narrative = `<p><strong>Feat:</strong> ${raw}</p>`
      const feature = background.feature
      return {
        ...background,
        feat_granted: null,
        feature: feature
          ? { ...feature, description: `${feature.description ?? ""}${narrative}` }
          : { name: "Feat", description: narrative },
      }
    }),
  }
}

/**
 * Background feat_granted names that are fixed grants (not choice phrases) and are
 * missing from the import batch and SRD seed catalog — e.g. dragonmark feats.
 */
export function collectMissingBackgroundFeatGrants(
  content: ImportContent,
): { name: string; sources: string[] }[] {
  const byKey = new Map<string, { name: string; sources: Set<string> }>()

  for (const gap of collectBackgroundFeatGrantGaps(content)) {
    // Choice grants surface through the review gate, not the fixed-grant report line.
    if (parseBackgroundFeatGrantChoice(gap.grantText)) continue
    for (const featName of gap.missingFeatNames) {
      const key = normalizeFeatNameKey(featName)
      const existing = byKey.get(key)
      if (existing) {
        existing.sources.add(gap.backgroundName)
      } else {
        byKey.set(key, { name: featName, sources: new Set([gap.backgroundName]) })
      }
    }
  }

  return [...byKey.values()]
    .map((entry) => ({ name: entry.name, sources: [...entry.sources].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

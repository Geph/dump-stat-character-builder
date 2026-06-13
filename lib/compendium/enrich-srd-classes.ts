import { enrichClassFeatureWithResource } from "@/lib/compendium/class-resource-features"
import { SRD_CLASS_ICONS_BY_NAME } from "@/lib/compendium/class-icons-defaults"
import {
  GRANT_FEAT_CATALOG_IDS,
  migrateFeatureFeatChoiceToModifierRefs,
} from "@/lib/compendium/grant-feat-catalog"
import type { Feature } from "@/lib/types"

function uniqueRefs(refs: string[]): string[] {
  return [...new Set(refs)]
}

function featureHasGrantRef(feature: Feature, refId: string): boolean {
  return (feature.modifierRefs ?? []).includes(refId)
}

function applyGrantRef(feature: Feature, refId: string): Feature {
  const next = migrateFeatureFeatChoiceToModifierRefs(feature)
  if (featureHasGrantRef(next, refId)) return { ...next, isChoice: false, choices: undefined }
  return {
    ...next,
    isChoice: false,
    choices: undefined,
    modifierRefs: uniqueRefs([...(next.modifierRefs ?? []), refId]),
  }
}

function enrichFeature(className: string, feature: Feature): Feature {
  let next = migrateFeatureFeatChoiceToModifierRefs(feature)
  next = enrichClassFeatureWithResource(className, next)

  if (/ability score improvement/i.test(next.name ?? "")) {
    next = applyGrantRef(next, GRANT_FEAT_CATALOG_IDS.general)
  } else if (/epic boon/i.test(next.name ?? "")) {
    next = applyGrantRef(next, GRANT_FEAT_CATALOG_IDS.epicBoon)
  } else if (/fighting style/i.test(next.name ?? "")) {
    next = applyGrantRef(next, GRANT_FEAT_CATALOG_IDS.fightingStyle)
  }

  return next
}

function ensureMilestoneGrantFeatFeatures(features: Feature[]): Feature[] {
  const result = features.map((feature) => ({ ...feature }))
  const asiTemplate = result.find((feature) => /ability score improvement/i.test(feature.name ?? ""))
  const epicTemplate = result.find((feature) => /epic boon/i.test(feature.name ?? ""))

  for (const level of [4, 8, 12, 16]) {
    const existing = result.some(
      (feature) =>
        feature.level === level &&
        featureHasGrantRef(feature, GRANT_FEAT_CATALOG_IDS.general),
    )
    if (existing) continue
    if (!asiTemplate && level !== 4) continue

    result.push({
      level,
      name: asiTemplate?.name ?? "Ability Score Improvement",
      description:
        asiTemplate?.description ??
        "Increase one ability score by 2 or two ability scores by 1, or choose a General feat.",
      modifierRefs: [GRANT_FEAT_CATALOG_IDS.general],
    })
  }

  if (
    epicTemplate &&
    !result.some(
      (feature) =>
        feature.level === 19 && featureHasGrantRef(feature, GRANT_FEAT_CATALOG_IDS.epicBoon),
    )
  ) {
    result.push({
      level: 19,
      name: epicTemplate.name,
      description: epicTemplate.description,
      modifierRefs: [GRANT_FEAT_CATALOG_IDS.epicBoon],
    })
  }

  return result.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
}

function enrichFeatures(className: string, features: unknown): Feature[] {
  if (!Array.isArray(features)) return []
  const mapped = features.map((raw) => enrichFeature(className, raw as Feature))
  return ensureMilestoneGrantFeatFeatures(mapped)
}

function normalizeSpellcasting(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null
  const spellcasting = { ...(raw as Record<string, unknown>) }
  if (spellcasting.starts_at == null) spellcasting.starts_at = 1
  return spellcasting
}

/** Apply SRD defaults: feat-granting modifier refs, icons, spellcasting starts_at. */
export function enrichSrdClassRow(row: Record<string, unknown>): Record<string, unknown> {
  const name = String(row.name ?? "")
  const features = enrichFeatures(name, row.features)
  const icon =
    typeof row.icon === "string" && row.icon.trim()
      ? row.icon.trim()
      : SRD_CLASS_ICONS_BY_NAME[name] ?? null

  return {
    ...row,
    icon,
    features,
    spellcasting: normalizeSpellcasting(row.spellcasting),
  }
}

export function enrichSrdClassList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdClassRow)
}

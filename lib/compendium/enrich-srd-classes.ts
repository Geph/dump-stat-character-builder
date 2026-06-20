import { enrichClassFeatureWithResource } from "@/lib/compendium/class-resource-features"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { SRD_CLASS_ICONS_BY_NAME } from "@/lib/compendium/class-icons-defaults"
import { applySrdFlavorDescription } from "@/lib/compendium/srd-flavor-descriptions"
import {
  GRANT_FEAT_CATALOG_ID,
  grantFeatCharacteristic,
  migrateFeatureFeatChoiceToModifierRefs,
} from "@/lib/compendium/grant-feat-catalog"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"
import type { Feature } from "@/lib/types"

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

function enrichFeature(className: string, feature: Feature): Feature {
  let next = migrateFeatureFeatChoiceToModifierRefs(feature)
  next = enrichClassFeatureWithResource(className, next)
  next = enrichClassFeatureWithModifierPresets(className, next)

  if (/ability score improvement/i.test(next.name ?? "")) {
    next = applyGrantRef(next, ["General"])
  } else if (/epic boon/i.test(next.name ?? "")) {
    next = applyGrantRef(next, ["Epic Boon"])
  } else if (/fighting style/i.test(next.name ?? "")) {
    next = applyGrantRef(next, ["Fighting Style"])
  }

  return next
}

function ensureMilestoneGrantFeatFeatures(features: Feature[]): Feature[] {
  const result = features.map((feature) => ({ ...feature }))
  const asiTemplate = result.find((feature) => /ability score improvement/i.test(feature.name ?? ""))
  const epicTemplate = result.find((feature) => /epic boon/i.test(feature.name ?? ""))

  for (const level of [4, 8, 12, 16]) {
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

  return applySrdFlavorDescription(
    {
      ...row,
      icon,
      features,
      spellcasting: normalizeSpellcasting(row.spellcasting),
    },
    "class",
  )
}

export function enrichSrdClassList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdClassRow)
}

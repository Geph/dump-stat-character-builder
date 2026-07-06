import { applyFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import { enrichClassFeatureWithResource } from "@/lib/compendium/class-resource-features"
import {
  enrichClassFeatureWithModifierPresets,
  monkToolProficiencyChoice,
} from "@/lib/compendium/enrich-srd-class-features"
import { SRD_CLASS_ICONS_BY_NAME } from "@/lib/compendium/class-icons-defaults"
import { SRD_CLASS_CARD_IMAGES_BY_NAME } from "@/lib/compendium/class-card-images-defaults"
import { applySrdCardImage } from "@/lib/compendium/card-image"
import { applySrdFlavorDescription } from "@/lib/compendium/srd-flavor-descriptions"
import {
  GRANT_FEAT_CATALOG_ID,
  grantFeatCharacteristic,
  migrateFeatureFeatChoiceToModifierRefs,
} from "@/lib/compendium/grant-feat-catalog"
import {
  createModifierInstanceId,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"
import { defaultClassComplexityForName, isClassComplexity } from "@/lib/compendium/class-complexity"
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

  return applyFeatureSheetDisplay(next)
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

  return result
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((feature) => (feature.sheetDisplay ? feature : applyFeatureSheetDisplay(feature)))
}

function enrichFeatures(className: string, features: unknown): Feature[] {
  if (!Array.isArray(features)) return []
  const mapped = features.map((raw) => enrichFeature(className, raw as Feature))
  return ensureMilestoneGrantFeatFeatures(mapped)
}

/**
 * Class-level weapon proficiency overrides where the SRD wording carries a
 * qualifier the parser flattens away (e.g. Monk's Light-only Martial weapons).
 */
const SRD_CLASS_WEAPON_PROFICIENCY_OVERRIDES: Record<string, string[]> = {
  Monk: ["Simple weapons", "Martial weapons that have the Light property"],
}

function appendLinkedModifier(feature: Feature, instance: LinkedModifierInstance): Feature {
  const existing = feature.linkedModifiers ?? []
  if (existing.some((entry) => entry.instanceId === instance.instanceId)) return feature
  return {
    ...feature,
    linkedModifiers: [...existing, instance],
    modifierRefs: uniqueRefs([...(feature.modifierRefs ?? []), instance.catalogRefId]),
  }
}

/** Wire class-level proficiency choices that attach to a level-1 feature. */
function injectClassProficiencyChoices(className: string, features: Feature[]): Feature[] {
  if (className !== "Monk") return features
  // Monk: "Choose one type of Artisan's Tools or Musical Instrument".
  const target =
    features.find((feature) => feature.level === 1 && /martial arts/i.test(feature.name ?? "")) ??
    features.find((feature) => feature.level === 1)
  if (!target) return features
  const toolChoice = monkToolProficiencyChoice()
  return features.map((feature) =>
    feature === target ? appendLinkedModifier(feature, toolChoice) : feature,
  )
}

function normalizeSpellcasting(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null
  const spellcasting = { ...(raw as unknown as Record<string, unknown>) }
  if (spellcasting.starts_at == null) spellcasting.starts_at = 1
  return spellcasting
}

/** Apply SRD defaults: feat-granting modifier refs, icons, spellcasting starts_at. */
export function enrichSrdClassRow(row: Record<string, unknown>): Record<string, unknown> {
  const name = String(row.name ?? "")
  const features = injectClassProficiencyChoices(name, enrichFeatures(name, row.features))
  const icon =
    typeof row.icon === "string" && row.icon.trim()
      ? row.icon.trim()
      : SRD_CLASS_ICONS_BY_NAME[name] ?? null
  const weaponProficiencyOverride = SRD_CLASS_WEAPON_PROFICIENCY_OVERRIDES[name]
  const complexity = isClassComplexity(row.complexity)
    ? row.complexity
    : defaultClassComplexityForName(name)

  return applySrdFlavorDescription(
    applySrdCardImage(
      {
        ...row,
        icon,
        features,
        ...(complexity ? { complexity } : {}),
        ...(weaponProficiencyOverride ? { weapon_proficiencies: weaponProficiencyOverride } : {}),
        spellcasting: normalizeSpellcasting(row.spellcasting),
      },
      SRD_CLASS_CARD_IMAGES_BY_NAME,
    ),
    "class",
  )
}

export function enrichSrdClassList(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(enrichSrdClassRow)
}

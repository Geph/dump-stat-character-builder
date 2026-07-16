import { applyKnownEquipmentNameWiring } from "@/lib/import/enrichment-presets/builders"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  detectFeatureModifiers,
  mergeFeatureModifierDetections,
  modifierInstanceFingerprint,
  type DetectFeatureContext,
  type ImportModifierMeta,
} from "@/lib/import/detect-feature-modifiers"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"
import { enrichImportChoiceFeatures } from "@/lib/import/enrich-import-choices"
import {
  applyImportEnrichmentPresets,
  remapKiKeysOnFeatRows,
} from "@/lib/import/enrichment-presets"
import {
  attachReferencedSpellsFromSupplements,
  enrichSubclassSpellTablesOnImport,
  mergeReferencedSpellsIntoImport,
} from "@/lib/import/merge-import-content"
import { normalizeSpellImportRows } from "@/lib/import/normalize-spell-import"
import { normalizeEquipmentRows } from "@/lib/import/normalize-equipment"
import { enrichWildcardFeaturePresets } from "@/lib/compendium/enrich-srd-class-features"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { isCompanionStatBlockFeature } from "@/lib/character/companion-recognition"
import { parseCompanionStatBlock } from "@/lib/character/parse-companion-stat-block"
import { inferFeatImportFields } from "@/lib/import/infer-feat-import-fields"
import { customFeatHasPresetRegistry } from "@/lib/compendium/custom-feat-modifier-presets"
import { FEAT_MODIFIER_PRESETS } from "@/lib/compendium/feat-modifier-presets"
import type { Feature, Trait } from "@/lib/types"

type ImportFeatRow = ImportContent["feats"] extends (infer T)[] | undefined ? T : never

type ImportMechanicsCarrier = {
  name: string
  description: string
  basedOnSrdFeature?: string
  mechanics?: import("@/lib/import/content-schema").ImportMechanic[]
  linkedModifiers?: Feature["linkedModifiers"]
  modifierRefs?: Feature["modifierRefs"]
  importModifierMeta?: ImportModifierMeta[]
  companion_stat_block?: Feature["companion_stat_block"]
}

function enrichFeatureLike<T extends ImportMechanicsCarrier>(
  item: T,
  ctx: DetectFeatureContext,
): T {
  const basedOn = item.basedOnSrdFeature?.trim()
  let baseFeature = enrichWildcardFeaturePresets(item as unknown as Feature) as unknown as T
  if (basedOn && basedOn !== item.name.trim()) {
    const aliasPresets = enrichWildcardFeaturePresets({
      ...(item as unknown as Feature),
      name: basedOn,
    })
    if ((aliasPresets.linkedModifiers?.length ?? 0) > 0) {
      const existing = baseFeature.linkedModifiers ?? []
      const existingIds = new Set(existing.map((entry) => entry.instanceId))
      const toAdd = (aliasPresets.linkedModifiers ?? []).filter(
        (entry) => !existingIds.has(entry.instanceId),
      )
      if (toAdd.length) {
        baseFeature = syncModifierRefs({
          ...(baseFeature as unknown as Feature),
          linkedModifiers: [...existing, ...toAdd],
        }) as unknown as T
      }
    }
  }
  const aiDetections = aiMechanicsToDetections(baseFeature.mechanics, ctx)
  const detectorDetections = detectFeatureModifiers(baseFeature.description ?? "", {
    ...ctx,
    basedOnSrdFeature: basedOn || ctx.basedOnSrdFeature,
  })
  if (!aiDetections.length && !detectorDetections.length) {
    if (
      isCompanionStatBlockFeature(baseFeature as unknown as Feature) &&
      !baseFeature.companion_stat_block
    ) {
      const companion_stat_block = parseCompanionStatBlock(
        baseFeature.name,
        baseFeature.description ?? "",
      )
      return syncModifierRefs({
        ...baseFeature,
        companion_stat_block,
        linkedModifiers: baseFeature.linkedModifiers,
        modifierRefs: baseFeature.modifierRefs,
      }) as unknown as T
    }
    if (baseFeature === item) return item
    return syncModifierRefs({
      ...baseFeature,
      linkedModifiers: baseFeature.linkedModifiers,
      modifierRefs: baseFeature.modifierRefs,
    }) as unknown as T
  }

  const merged = mergeFeatureModifierDetections(
    baseFeature as unknown as Feature,
    aiDetections,
    detectorDetections,
  )

  const withCompanion =
    isCompanionStatBlockFeature(merged as Feature) && !merged.companion_stat_block
      ? {
          ...merged,
          companion_stat_block: parseCompanionStatBlock(merged.name, merged.description ?? ""),
        }
      : merged

  return {
    ...baseFeature,
    linkedModifiers: withCompanion.linkedModifiers,
    modifierRefs: withCompanion.modifierRefs,
    importModifierMeta: withCompanion.importModifierMeta,
    companion_stat_block: withCompanion.companion_stat_block ?? baseFeature.companion_stat_block,
  } as unknown as T
}

function enrichFeatures(
  features: Feature[] | undefined,
  ctx: Omit<DetectFeatureContext, "featureName">,
): Feature[] | undefined {
  if (!features?.length) return features
  return features.map((feature) =>
    enrichChoiceOptionModifiers(
      enrichFeatureLike(feature as ImportMechanicsCarrier, {
        ...ctx,
        featureName: feature.name,
        basedOnSrdFeature: (feature as ImportMechanicsCarrier).basedOnSrdFeature,
        level: feature.level,
      }) as unknown as Feature,
      ctx,
    ),
  )
}

/**
 * Run phrase detection on each choice option's description and attach linkedModifiers
 * to the option. Strip matching detections from the parent feature so list prose in the
 * parent description does not apply pack-wide (e.g. Wolf advantage on Rage of the Wilds).
 */
function enrichChoiceOptionModifiers(
  feature: Feature,
  ctx: Omit<DetectFeatureContext, "featureName">,
): Feature {
  if (!feature.isChoice || !feature.choices?.options?.length) return feature

  const optionFingerprints = new Set<string>()
  const options = feature.choices.options.map((option) => {
    const detections = detectFeatureModifiers(option.description ?? "", {
      ...ctx,
      featureName: `${feature.name}:${option.name}`,
      level: feature.level,
    })
    if (!detections.length) return option

    const existing = option.linkedModifiers ?? []
    const existingFp = new Set(existing.map(modifierInstanceFingerprint))
    const toAdd = detections
      .map((entry) => entry.instance)
      .filter((instance) => {
        const fp = modifierInstanceFingerprint(instance)
        if (existingFp.has(fp)) return false
        optionFingerprints.add(fp)
        return true
      })

    for (const detection of detections) {
      optionFingerprints.add(modifierInstanceFingerprint(detection.instance))
    }

    if (!toAdd.length) return option
    return syncModifierRefs({
      ...option,
      linkedModifiers: [...existing, ...toAdd],
    })
  })

  if (optionFingerprints.size === 0) {
    return {
      ...feature,
      choices: { ...feature.choices, options },
    }
  }

  const parentMods = (feature.linkedModifiers ?? []).filter(
    (instance) => !optionFingerprints.has(modifierInstanceFingerprint(instance)),
  )

  return syncModifierRefs({
    ...feature,
    linkedModifiers: parentMods,
    choices: { ...feature.choices, options },
  })
}

function enrichTraits(
  traits: Trait[] | undefined,
  sourceName: string,
): Trait[] | undefined {
  if (!traits?.length) return traits
  return traits.map((trait) =>
    enrichFeatureLike(trait as ImportMechanicsCarrier, {
      contentKind: "species_trait",
      sourceName,
      featureName: trait.name,
      level: trait.level,
    }),
  ) as unknown as Trait[]
}

function featHasKnownNamePreset(name: string): boolean {
  return customFeatHasPresetRegistry(name) || name in FEAT_MODIFIER_PRESETS
}

function enrichFeats(feats: ImportFeatRow[] | undefined): ImportFeatRow[] | undefined {
  if (!feats?.length) return feats
  return feats.map((feat) => {
    const inferred = inferFeatImportFields(feat)
    const description = inferred.description ?? ""
    // Named PHB/SRD feats have hand-written presets applied on load. Partial AI mechanics[]
    // (or isChoice-only wiring) would persist as linkedModifiers and block those presets —
    // prefer leaving modifiers empty so enrichCustomFeatRow / enrichSrdFeatRow can fill them.
    if (featHasKnownNamePreset(inferred.name)) {
      return {
        ...inferred,
        linkedModifiers: undefined,
        modifierRefs: undefined,
        importModifierMeta: undefined,
      } as ImportFeatRow
    }
    const ctx = {
      contentKind: "feat" as const,
      sourceName: inferred.name,
      featureName: inferred.name,
    }
    const enriched = enrichFeatureLike(
      {
        ...inferred,
        description,
        linkedModifiers: (inferred as { linkedModifiers?: Feature["linkedModifiers"] }).linkedModifiers,
        modifierRefs: (inferred as { modifierRefs?: Feature["modifierRefs"] }).modifierRefs,
      },
      ctx,
    )
    const withOptionMods = enrichChoiceOptionModifiers(
      {
        name: inferred.name,
        description,
        isChoice: Boolean((inferred as { isChoice?: boolean }).isChoice),
        choices: (inferred as { choices?: Feature["choices"] }).choices,
        linkedModifiers: enriched.linkedModifiers,
        modifierRefs: enriched.modifierRefs,
      } as Feature,
      ctx,
    )
    return {
      ...inferred,
      isChoice: withOptionMods.isChoice,
      choices: withOptionMods.choices,
      linkedModifiers: withOptionMods.linkedModifiers,
      modifierRefs: withOptionMods.modifierRefs,
      importModifierMeta: (enriched as ImportMechanicsCarrier).importModifierMeta,
    } as ImportFeatRow
  })
}

function enrichEquipmentRows(
  equipment: ImportContent["equipment"] | undefined,
): ImportContent["equipment"] | undefined {
  if (!equipment?.length) return equipment
  const normalized = normalizeEquipmentRows(
    equipment.map((row) => ({ ...row })) as unknown as Record<string, unknown>[],
  ) as NonNullable<ImportContent["equipment"]>
  const withPhraseWiring = normalized.map((item) => {
    const description = item.description ?? ""
    if (!description.trim()) return item
    const enriched = enrichFeatureLike(
      {
        name: item.name,
        description,
        linkedModifiers: (item as { linkedModifiers?: Feature["linkedModifiers"] }).linkedModifiers,
        modifierRefs: (item as { modifierRefs?: Feature["modifierRefs"] }).modifierRefs,
        magic_effects: (item as { magic_effects?: Feature["linkedModifiers"] }).magic_effects,
      },
      {
        contentKind: "class_feature",
        sourceName: item.name,
        featureName: item.name,
      },
    )
    const magicEffects =
      enriched.linkedModifiers ??
      (item as { magic_effects?: Feature["linkedModifiers"] }).magic_effects ??
      []
    return {
      ...item,
      magic_effects: magicEffects,
      linkedModifiers: enriched.linkedModifiers,
      modifierRefs: enriched.modifierRefs,
      importModifierMeta: (enriched as ImportMechanicsCarrier).importModifierMeta,
    }
  }) as unknown as NonNullable<ImportContent["equipment"]>

  // Name recognition only — never invents rows or item prose.
  return applyKnownEquipmentNameWiring(withPhraseWiring)
}

/** Run AI mechanics parsing + mechanical phrase detection on importable features. */
export function enrichImportContentModifiers(content: ImportContent): ImportContent {
  const next: ImportContent = { ...content }

  if (content.classes?.length) {
    next.classes = content.classes.map((cls) => ({
      ...cls,
      features: enrichFeatures(cls.features as Feature[], {
        contentKind: "class_feature",
        sourceName: cls.name,
      }) as typeof cls.features,
    }))
  }

  if (content.subclasses?.length) {
    next.subclasses = content.subclasses.map((subclass) => ({
      ...subclass,
      features: enrichFeatures(subclass.features as Feature[], {
        contentKind: "subclass_feature",
        sourceName: subclass.name,
      }) as typeof subclass.features,
    }))
  }

  if (content.species?.length) {
    next.species = content.species.map((species) => ({
      ...species,
      traits: enrichTraits(species.traits as Trait[], species.name) as typeof species.traits,
    }))
  }

  if (content.backgrounds?.length) {
    next.backgrounds = content.backgrounds.map((background) => {
      if (!background.feature?.description) return background
      const enriched = enrichFeatureLike(background.feature as ImportMechanicsCarrier, {
        contentKind: "background_feature",
        sourceName: background.name,
        featureName: background.feature.name,
      })
      return {
        ...background,
        feature: syncModifierRefs({
          ...background.feature,
          linkedModifiers: enriched.linkedModifiers,
          modifierRefs: enriched.modifierRefs,
          importModifierMeta: (enriched as ImportMechanicsCarrier).importModifierMeta,
        }),
      }
    })
  }

  if (content.feats?.length) {
    next.feats = remapKiKeysOnFeatRows(
      enrichFeats(content.feats) as unknown as Array<{
        linkedModifiers?: import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[]
      }>,
      (content.classes ?? []).map((cls) => cls.name),
    ) as unknown as ImportContent["feats"]
  }

  if (content.equipment?.length) {
    next.equipment = enrichEquipmentRows(content.equipment)
  }

  if (content.abilities?.length) {
    next.abilities = content.abilities.map((ability) => {
      const enriched = enrichFeatureLike(ability as ImportMechanicsCarrier, {
        contentKind: "ability",
        sourceName: ability.source_name ?? ability.name,
        featureName: ability.name,
        level: ability.level_requirement ?? undefined,
      })
      return {
        ...ability,
        linkedModifiers: enriched.linkedModifiers,
        modifierRefs: enriched.modifierRefs,
        importModifierMeta: (enriched as ImportMechanicsCarrier).importModifierMeta,
        companion_stat_block:
          (enriched as ImportMechanicsCarrier).companion_stat_block ??
          ability.companion_stat_block,
      }
    }) as ImportContent["abilities"]
  }

  const withSpells = attachReferencedSpellsFromSupplements(
    mergeReferencedSpellsIntoImport(next),
    normalizeSpellImportRows((content.spells ?? []) as unknown as Record<string, unknown>[]),
  )
  const withSubclassSpells = enrichSubclassSpellTablesOnImport(withSpells)

  return applyImportEnrichmentPresets(enrichImportChoiceFeatures(withSubclassSpells))
}

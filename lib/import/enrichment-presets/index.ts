/**
 * Declarative import enrichment presets — single registry replacing class-specific
 * enricher modules (alchemist, investigator, psion, monk, alternate ranger/sorcerer).
 *
 * Inventory (transformation → classification):
 *
 * | Pack | Transformation | Class |
 * | --- | --- | --- |
 * | Alchemist | Bomb / formula → dual special_attack | (b) named preset |
 * | Alchemist | Potions table → craftable_items | (b) parseCraftableItemsTable op |
 * | Alchemist | Held items → held_items_cap | (b) |
 * | Alchemist | Discoveries (batch/dose/homunculus/brewing) | (b) |
 * | Alchemist | Reagents recharge rules | (b) ensureResourceRecharges |
 * | Alchemist | Reagent Synthesis description | (b) |
 * | Investigator | Finisher / Improved Finisher triggers | (b) named presets |
 * | Investigator | Holy Trinkets note + equipment seeds | (b) |
 * | Investigator | Rushed Incantation uses / Enigma Arcane / notes | (b) |
 * | Psion | Archetype limitedUses + Climactic Moment trigger | (b) |
 * | Psion | Curious Mind choice + deferred notes | (b) |
 * | Monk | Unarmored Defense AC | (b) |
 * | Monk | focus_points→prefixed ki + resource/feat remap | (b) |
 * | Alt Ranger | Quarry on_hit + class resource seed | (b) |
 * | Alt Sorcerer | Innate Arcanum/Sorcery presets + regen note | (b) |
 *
 * Category (c): none remaining — named preset builders are shared factories, not
 * class-specific enricher modules. Hooks remain available via registerEnrichmentHook.
 */
export {
  applyImportEnrichmentPresets,
  enrichClassFeaturesWithPresets,
  mergeClassResourcesWithPresets,
  remapImportedResourceKeyWithPresets,
  remapKiKeysOnFeatRowsWithPresets,
} from "@/lib/import/enrichment-presets/apply"
export {
  getContentSeeds,
  getEnrichmentPresets,
  listEnrichmentPresetIds,
  registerEnrichmentHook,
} from "@/lib/import/enrichment-presets/registry"
export { buildQuarryClassResource } from "@/lib/import/enrichment-presets/builders"

import { applyImportEnrichmentPresets, enrichClassFeaturesWithPresets } from "@/lib/import/enrichment-presets/apply"
import { remapResourceKeyInModifiers } from "@/lib/import/enrichment-presets/builders"
import { remapImportedResourceKeyWithPresets } from "@/lib/import/enrichment-presets/apply"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"

/** Compat: previous enrichAlchemistFeatures / investigator / psion entrypoint. */
export function enrichAlchemistFeatures(content: ImportContent): ImportContent {
  return applyImportEnrichmentPresets(content, new Set(["alchemist"]))
}

export function enrichInvestigatorFeatures(content: ImportContent): ImportContent {
  return applyImportEnrichmentPresets(content, new Set(["investigator"]))
}

export function enrichPsionArchetypeFeatures(content: ImportContent): ImportContent {
  return applyImportEnrichmentPresets(content, new Set(["psion"]))
}

export function enrichMonkClassFeatures(features: Feature[], className: string): Feature[] {
  return enrichClassFeaturesWithPresets(features, className)
}

export function remapKiResourceKey(className: string, resourceKey: string): string {
  return remapImportedResourceKeyWithPresets(className, resourceKey)
}

export function remapKiKeysOnFeatRows<T extends { linkedModifiers?: LinkedModifierInstance[] }>(
  feats: T[],
  classNames: string[],
): T[] {
  const monkClass = classNames.find((name) => /\bmonk\b/i.test(name) && name !== "Monk")
  if (!monkClass) return feats
  const kiKey = prefixedResourceKey(slugClassPrefix(monkClass), "ki_points")
  return feats.map((feat) => {
    const remapped = remapResourceKeyInModifiers(feat.linkedModifiers, "ki_points", kiKey)
    if (remapped === feat.linkedModifiers) return feat
    return { ...feat, linkedModifiers: remapped }
  })
}

export function enrichAlternateRangerFeatures(features: Feature[], className: string): Feature[] {
  return enrichClassFeaturesWithPresets(features, className)
}

export function enrichAlternateSorcererFeatures(
  features: Feature[],
  className: string,
  spellcasting: unknown,
): Feature[] {
  return enrichClassFeaturesWithPresets(features, className, spellcasting)
}

export {
  mergeClassResourcesWithPresets as mergeAlternateRangerClassResources,
} from "@/lib/import/enrichment-presets/apply"

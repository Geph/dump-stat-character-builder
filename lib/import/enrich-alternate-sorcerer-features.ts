import { innateArcanumPresetForClass, innateSorceryPreset } from "@/lib/compendium/enrich-srd-class-features"
import { syncModifierRefs } from "@/lib/compendium/linked-modifiers"
import { usesPointPoolSpellcasting } from "@/lib/character/point-pool-spellcasting"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import type { Feature } from "@/lib/types"

const ALTERNATE_SORCERER_ARCANUM_TIERS = [
  { spellLevel: 6, classLevel: 11 },
  { spellLevel: 7, classLevel: 13 },
  { spellLevel: 8, classLevel: 15 },
  { spellLevel: 9, classLevel: 17 },
]

function wireFeaturePresets(feature: Feature, className: string, hasPointPool: boolean): Feature {
  const name = feature.name.trim()
  if (hasPointPool && /^innate arcanum$/i.test(name)) {
    return syncModifierRefs({
      ...feature,
      linkedModifiers: innateArcanumPresetForClass(className, ALTERNATE_SORCERER_ARCANUM_TIERS),
    }) as Feature
  }
  if (/^innate sorcery$/i.test(name)) {
    return syncModifierRefs({
      ...feature,
      linkedModifiers: innateSorceryPreset(),
    }) as Feature
  }
  if (/^sorcerous regeneration$/i.test(name) && hasPointPool) {
    const prefix = slugClassPrefix(className)
    const resourceKey = prefixedResourceKey(prefix, "sorcery_points")
    return {
      ...feature,
      description: `${feature.description ?? ""}\n\nRegain expended ${resourceKey.replace(/_/g, " ")} equal to half your class level (rounded up) once per long rest when you finish a short rest.`,
    }
  }
  return feature
}

/** Wire Alternate Sorcerer feature presets without touching the SRD Sorcerer class. */
export function enrichAlternateSorcererFeatures(
  features: Feature[],
  className: string,
  spellcasting: unknown,
): Feature[] {
  const hasPointPool = usesPointPoolSpellcasting(spellcasting as import("@/lib/types").DndClass["spellcasting"])
  if (!hasPointPool && !/alternate sorcerer/i.test(className)) {
    return features.map((feature) => wireFeaturePresets(feature, className, false))
  }
  return features.map((feature) => wireFeaturePresets(feature, className, hasPointPool || /alternate sorcerer/i.test(className)))
}

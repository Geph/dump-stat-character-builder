import { isWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import type { Feature } from "@/lib/types"

/** Feat categories that belong on the Class Abilities step (not ASI / General feats). */
export const CLASS_ABILITY_FEAT_CATEGORIES = new Set([
  "Metamagic",
  "Eldritch Invocation",
  "Fighting Style",
  "Mystic Technique",
  "Planar Pact",
])

/** Proficiency-style class/subclass feature choices shown on Class Abilities. */
export function isProficiencyStyleChoice(feature: Feature): boolean {
  const category = `${feature.choices?.category ?? ""} ${feature.name}`.toLowerCase()
  return /\b(skill|tool|language|instrument|artisan|musical|proficienc)/i.test(category)
}

/**
 * These presets model proficiencies chosen when entering the class, even though
 * their source key is an ordinary class feature. Keep them beside base class
 * skill and multiclass proficiency choices.
 */
export function proficiencyFeatureStaysOnClassStep(
  className: string | undefined,
  feature: Feature,
): boolean {
  const owner = className?.trim().toLowerCase()
  const name = feature.name.trim().toLowerCase()
  return (
    (owner === "bard" && name === "bardic inspiration") ||
    (owner === "monk" && name === "martial arts") ||
    (owner === "artificer" && name === "tool proficiencies")
  )
}

/**
 * Feature choices shown on Class Abilities: custom ability pools, weapon mastery,
 * and feature-granted skill/tool/language choices. Starting-class proficiency
 * exceptions remain on Class & Level.
 */
export function isClassAbilityFeatureChoice(feature: Feature, className?: string): boolean {
  if (proficiencyFeatureStaysOnClassStep(className, feature)) return false
  if (!feature.isChoice || !feature.choices) return false
  if (feature.choices.optionsSource) return true
  if (isWeaponMasteryFeature(feature)) return true
  return (feature.choices.options?.length ?? 0) > 0
}

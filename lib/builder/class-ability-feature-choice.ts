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

/** Proficiency-style choice categories that stay on Class & Level. */
export function isProficiencyStyleChoice(feature: Feature): boolean {
  const category = `${feature.choices?.category ?? ""} ${feature.name}`.toLowerCase()
  return /\b(skill|tool|language|instrument|artisan|musical|proficienc)/i.test(category)
}

/**
 * Feature choices that are custom class ability pools (talents, knacks, disciplines,
 * weapon mastery, exploits, etc.) — not skill/tool picks.
 */
export function isClassAbilityFeatureChoice(feature: Feature): boolean {
  if (!feature.isChoice || !feature.choices) return false
  if (feature.choices.optionsSource) return true
  if (isWeaponMasteryFeature(feature)) return true
  if (isProficiencyStyleChoice(feature)) return false
  return (feature.choices.options?.length ?? 0) > 0
}

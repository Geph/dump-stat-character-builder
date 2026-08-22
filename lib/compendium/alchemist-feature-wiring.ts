import { inferredAlchemistAbilityRole } from "@/lib/builder/aggregate-discoveries"
import { effectCatalogRefId } from "@/lib/compendium/modifier-catalog-refs"
import { fxInstance } from "@/lib/compendium/modifier-instance-builders"
import { syncModifierRefs, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { ClassResource, Feature, FeatureEffect, UsesAtLevel, UsesConfig } from "@/lib/types"

/**
 * Reagents regain 1 on every Short Rest and refill on a Long Rest. Reagent Synthesis
 * (INT modifier, minimum 1, once per Long Rest) lives on the Reagent Synthesis feature
 * as a class_resource restore — not as a second stacked rule on this pool.
 */
export function enrichReagentResourceUses(uses: UsesConfig): UsesConfig {
  const recharges = [...(uses.recharges ?? [])]
  const isRest = (rule: (typeof recharges)[number]) => rule.kind !== "real_time"
  const withoutSynthesis = recharges.filter(
    (rule) => !(isRest(rule) && rule.amountFormula === "ability_modifier"),
  )
  const hasBaseShortRest = withoutSynthesis.some(
    (rule) => isRest(rule) && rule.rest === "short_rest" && rule.maxPerLongRest == null,
  )
  if (!hasBaseShortRest) {
    withoutSynthesis.unshift({ rest: "short_rest", amount: 1 })
  }
  if (!withoutSynthesis.some((rule) => isRest(rule) && rule.rest === "long_rest")) {
    withoutSynthesis.push({ rest: "long_rest" })
  }
  return { ...uses, recharges: withoutSynthesis }
}

/** Formulas column of the Alchemist Features table — cumulative known count, not a pool. */
export const ALCHEMIST_BOMB_FORMULAS_BY_LEVEL: UsesAtLevel[] = [
  { level: 2, count: 3 },
  { level: 4, count: 4 },
  { level: 8, count: 5 },
  { level: 12, count: 6 },
  { level: 16, count: 7 },
  { level: 19, count: 8 },
]

/** Cumulative Discoveries known — one picker, same shape as Bomb Formulas. */
export const ALCHEMIST_DISCOVERIES_BY_LEVEL: UsesAtLevel[] = [
  { level: 5, count: 1 },
  { level: 9, count: 2 },
  { level: 13, count: 3 },
  { level: 17, count: 4 },
]

const DISCOVERY_FEATURE_NAME = /^discover(?:y|ies)$/i
const DISCOVERY_PICK_KEY = /^([^:]+):L(\d+):(Discover(?:y|ies))$/i

function isDiscoveryFeatureName(name: string): boolean {
  return DISCOVERY_FEATURE_NAME.test(name.trim())
}

/** Merge split Discovery picks (L5/L9/L13/L17) onto the earliest feature key. */
export function mergeAlchemistDiscoveryPicks(
  picks: Record<string, string[]> | null | undefined,
): Record<string, string[]> {
  const source = picks ?? {}
  const byClass = new Map<string, string[]>()
  for (const key of Object.keys(source)) {
    const match = key.match(DISCOVERY_PICK_KEY)
    if (!match) continue
    const list = byClass.get(match[1]) ?? []
    list.push(key)
    byClass.set(match[1], list)
  }

  let changed = false
  const next = { ...source }
  for (const keys of byClass.values()) {
    if (keys.length <= 1) continue
    keys.sort((a, b) => {
      const aLevel = Number(a.match(DISCOVERY_PICK_KEY)?.[2] ?? 99)
      const bLevel = Number(b.match(DISCOVERY_PICK_KEY)?.[2] ?? 99)
      return aLevel - bLevel
    })
    const canonical = keys[0]
    const merged = [...new Set(keys.flatMap((key) => next[key] ?? []))]
    for (const key of keys) delete next[key]
    next[canonical] = merged
    changed = true
  }
  return changed ? next : source
}

export const REAGENT_SYNTHESIS_DESCRIPTION =
  "<p>When you finish a Short Rest, you can regain an additional number of expended Reagents up to your Intelligence modifier (minimum of 1).</p><p>Once you use this feature, you can’t do so again until you finish a Long Rest.</p>"

export const REAGENT_SYNTHESIS_INSTANCE_ID = "modinst_alchemist_reagent_synthesis"

export function reagentSynthesisRestoreEffect(): FeatureEffect {
  return {
    id: "mod_alchemist_reagent_synthesis",
    kind: "class_resource",
    classResourceKey: "reagents",
    classResourceChange: "increase",
    classResourceAmountConfig: {
      mode: "ability_modifier",
      ability: "INT",
      minimum: 1,
    },
    resourceRefreshOnRest: "short_rest",
    resourceRefreshOncePerLongRest: true,
    label: "Reagent Synthesis",
  }
}

export function reagentSynthesisRestoreInstance(): LinkedModifierInstance {
  return fxInstance(REAGENT_SYNTHESIS_INSTANCE_ID, effectCatalogRefId("class_resource"), {
    effects: [reagentSynthesisRestoreEffect()],
  })
}

function isReagentSynthesisRestore(effect: FeatureEffect): boolean {
  return (
    effect.kind === "class_resource" &&
    effect.classResourceKey === "reagents" &&
    (effect.classResourceChange === "increase" || effect.classResourceChange === "reset")
  )
}

function sanitizeReagentSynthesisFeature(feature: Feature): Feature {
  const next: Feature = {
    ...feature,
    description: REAGENT_SYNTHESIS_DESCRIPTION,
  }
  const modifiers = (next.linkedModifiers ?? []).flatMap((instance) => {
    const effects = (instance.activation?.effects ?? []).filter(
      (effect) => !isReagentSynthesisRestore(effect),
    )
    if (instance.activation?.effects?.length && effects.length === 0) return []
    if (effects.length !== (instance.activation?.effects?.length ?? 0)) {
      return [{ ...instance, activation: { ...instance.activation, effects } }]
    }
    return [instance]
  })
  return syncModifierRefs({
    ...next,
    linkedModifiers: [...modifiers, reagentSynthesisRestoreInstance()],
  })
}

function sanitizeBombFormulasFeature(feature: Feature): Feature {
  return {
    ...feature,
    isChoice: true,
    choices: {
      category: feature.choices?.category || "Bomb Formula",
      count: feature.choices?.count || 3,
      choiceCountByLevel: feature.choices?.choiceCountByLevel?.length
        ? feature.choices.choiceCountByLevel
        : ALCHEMIST_BOMB_FORMULAS_BY_LEVEL,
      options: feature.choices?.options ?? [],
      resourceKey: feature.choices?.resourceKey || "bomb_formulas_known",
      optionsSource: "class_bomb_formulas",
      swappableOnRest: feature.choices?.swappableOnRest ?? true,
      swapRestType: feature.choices?.swapRestType ?? "long",
      swappableOnLevelUp: feature.choices?.swappableOnLevelUp ?? true,
    },
  }
}

function sanitizeDiscoveryFeature(feature: Feature): Feature {
  return {
    ...feature,
    isChoice: true,
    choices: {
      category: feature.choices?.category || "Discovery",
      count: feature.choices?.count || 1,
      choiceCountByLevel: feature.choices?.choiceCountByLevel?.length
        ? feature.choices.choiceCountByLevel
        : ALCHEMIST_DISCOVERIES_BY_LEVEL,
      resourceKey: feature.choices?.resourceKey || "discoveries_known",
      options: feature.choices?.options ?? [],
      optionsSource: "class_discoveries",
      swappableOnLevelUp: feature.choices?.swappableOnLevelUp ?? true,
    },
  }
}

function collapseAlchemistDiscoveryFeatures(features: Feature[]): Feature[] {
  const discoveryIndexes = features
    .map((feature, index) => (isDiscoveryFeatureName(feature.name) ? index : -1))
    .filter((index) => index >= 0)
  if (discoveryIndexes.length <= 1) return features

  const keepIndex = discoveryIndexes.reduce((best, index) => {
    const bestLevel = features[best]?.level ?? 99
    const nextLevel = features[index]?.level ?? 99
    return nextLevel < bestLevel ? index : best
  })

  return features.map((feature, index) => {
    if (!discoveryIndexes.includes(index) || index === keepIndex) return feature
    const rest = { ...feature }
    delete rest.choices
    return { ...rest, isChoice: false }
  })
}

function sanitizePotionMixologistFeature(feature: Feature): Feature {
  return {
    ...feature,
    activation: { ...(feature.activation ?? {}), bonusAction: true },
    sheetDisplay: {
      featuresTab: true,
      combatActions: true,
      abilitiesActions: false,
    },
  }
}

export function sanitizeAlchemistFeature(feature: Feature): Feature {
  const name = feature.name.trim()
  if (/^reagent synthesis$/i.test(name)) return sanitizeReagentSynthesisFeature(feature)
  if (/^bomb formulas?$/i.test(name)) return sanitizeBombFormulasFeature(feature)
  if (isDiscoveryFeatureName(name)) return sanitizeDiscoveryFeature(feature)
  if (/^potion mixologist$/i.test(name)) return sanitizePotionMixologistFeature(feature)
  return feature
}

export function sanitizeAlchemistFeatures(features: Feature[] | undefined): Feature[] | undefined {
  if (!features?.length) return features
  return collapseAlchemistDiscoveryFeatures(features.map(sanitizeAlchemistFeature))
}

export function sanitizeAlchemistClassResources(resources: ClassResource[]): ClassResource[] {
  return resources.map((resource) => {
    if (resource.id !== "reagents") return resource
    return { ...resource, uses: enrichReagentResourceUses(resource.uses) }
  })
}

export function sanitizeAlchemistResourceUses(resourceKey: string, uses: UsesConfig): UsesConfig {
  if (resourceKey !== "reagents") return uses
  return enrichReagentResourceUses(uses)
}

export function retagAlchemistCustomAbility<T extends {
  name: string
  ability_role?: string | null
  source?: string | null
  source_name?: string | null
  parent_class_name?: string | null
}>(ability: T): T {
  const inferred = inferredAlchemistAbilityRole(ability)
  if (!inferred || inferred === ability.ability_role) return ability
  return { ...ability, ability_role: inferred }
}

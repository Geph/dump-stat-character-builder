import { firstSentenceFromText, stripFeatureHintHtml } from "@/lib/builder/feature-choice-hint"
import { featureEffectMatchesRollContext } from "@/lib/character/collect-feature-roll-modes"
import { collectActiveFeatureEffects } from "@/lib/character/collect-limited-feature-effects"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import { resolveCheckRollMode } from "@/lib/compendium/class-feature-metadata"
import type { LimitationEvaluationContext } from "@/lib/compendium/modifier-limitations"
import type { Feature, FeatureEffect } from "@/lib/types"

export const SAVE_ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const satisfies readonly AbilityScoreKey[]

export type SaveFeatureBadge = {
  id: string
  label: string
  description: string
  sourceLabel?: string
  ability: AbilityScoreKey | "all"
}

export type SaveFeatureBadgesByAbility = Record<AbilityScoreKey, SaveFeatureBadge[]>

const SAVE_ABILITY_LABELS: Record<AbilityScoreKey, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
}

function normalizeAbilityKey(value: string | null | undefined): AbilityScoreKey | null {
  if (!value?.trim()) return null
  const lower = value.trim().toLowerCase()
  return (SAVE_ABILITY_KEYS as readonly string[]).includes(lower)
    ? (lower as AbilityScoreKey)
    : null
}

function isSaveScopedEffect(effect: FeatureEffect): boolean {
  if (effect.kind === "damage_reduction" && effect.defensiveSaveScope) return true
  if (effect.checkCategory !== "save") return false
  const rollMode = resolveCheckRollMode(effect)
  return (
    rollMode === "advantage" ||
    rollMode === "disadvantage" ||
    rollMode === "bonus" ||
    rollMode === "replace_failure" ||
    Boolean(effect.incomingAttackMode)
  )
}

function abilitiesForEffect(effect: FeatureEffect): AbilityScoreKey[] {
  const specific = normalizeAbilityKey(effect.checkAbility)
  if (specific) return [specific]
  return [...SAVE_ABILITY_KEYS]
}

function summarizeEffect(effect: FeatureEffect): string {
  const bits: string[] = []
  if (effect.kind === "damage_reduction" && effect.defensiveSaveScope) {
    const ability = effect.checkAbility?.trim() || "Dexterity"
    const success =
      effect.defensiveSaveSuccess === "none"
        ? "no damage on a success"
        : effect.defensiveSaveSuccess === "half"
          ? "half damage on a success"
          : "improved damage on a success"
    bits.push(`${ability} saves: ${success}, half damage on a failure`)
  } else {
    const rollMode = resolveCheckRollMode(effect)
    if (rollMode === "advantage") bits.push("Advantage")
    else if (rollMode === "disadvantage") bits.push("Disadvantage")
    else if (rollMode === "replace_failure") bits.push("Can turn a failed save into a success")
    else if (rollMode === "bonus") bits.push("Bonus to the save")
  }
  if (effect.checkConditionTypes?.length) {
    bits.push(`vs ${effect.checkConditionTypes.join(", ")}`)
  }
  return bits.filter(Boolean).join(" · ")
}

function badgeDescription(feature: Feature, effect: FeatureEffect): string {
  const fromLabel = effect.label?.trim()
  if (fromLabel) return fromLabel
  const fromFeature = firstSentenceFromText(feature.description ?? "")
  if (fromFeature) return fromFeature
  const summary = summarizeEffect(effect)
  if (summary) return summary
  return feature.name
}

function badgeLabel(featureName: string): string {
  const plain = stripFeatureHintHtml(featureName).trim()
  return plain.replace(/\s*\(.*?\)\s*$/g, "").trim() || plain
}

/**
 * Collect save-row badges from class/species/feat features whose modifiers affect saving throws
 * (Evasion, Danger Sense, Spell Resistance, Gnomish Cunning, etc.).
 */
export function collectSaveFeatureBadges(
  features: Feature[],
  limitationContext: LimitationEvaluationContext = {},
): SaveFeatureBadgesByAbility {
  const byAbility = Object.fromEntries(SAVE_ABILITY_KEYS.map((key) => [key, [] as SaveFeatureBadge[]])) as SaveFeatureBadgesByAbility
  const seen = new Set<string>()

  const featuresByName = new Map<string, Feature>()
  for (const feature of features) {
    if (feature.name) featuresByName.set(feature.name, feature)
  }

  for (const { featureName, effect } of collectActiveFeatureEffects(
    features,
    limitationContext,
    isSaveScopedEffect,
  )) {
    const feature = featuresByName.get(featureName)
    const description = badgeDescription(
      feature ?? ({ name: featureName, description: null, level: 1 } as unknown as Feature),
      effect,
    )
    const label = badgeLabel(featureName)
    const abilities = abilitiesForEffect(effect).filter((ability) =>
      featureEffectMatchesRollContext(effect, { kind: "save", ability }),
    )
    const targets = abilities.length ? abilities : [...SAVE_ABILITY_KEYS]

    for (const ability of targets) {
      const id = `${label.toLowerCase()}:${ability}:${effect.id ?? effect.kind}`
      if (seen.has(id)) continue
      seen.add(id)
      byAbility[ability].push({
        id,
        label,
        description,
        sourceLabel: featureName !== label ? featureName : undefined,
        ability,
      })
    }
  }

  return byAbility
}

export function saveFeatureBadgeAbilityLabel(ability: AbilityScoreKey): string {
  return SAVE_ABILITY_LABELS[ability]
}

import { aggregateKnackOptions } from "@/lib/builder/knack-choices"
import { aggregateUpgradeOptions } from "@/lib/builder/upgrade-choices"
import type { CustomAbility, Feature, FeatureChoice } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function disciplinePickNames(featureChoicePicks: Record<string, string[]>): string[] {
  const names: string[] = []
  for (const [key, picks] of Object.entries(featureChoicePicks)) {
    if (!/discipline/i.test(key)) continue
    names.push(...picks)
  }
  return names.map(normalizeName)
}

function talentOptionsFromDiscipline(ability: CustomAbility): FeatureChoice["options"] {
  return ability.choices?.options ?? []
}

/**
 * Union talent options from discipline custom abilities the character knows.
 * Used when a class feature sets choices.optionsSource = "known_discipline_talents".
 */
export function aggregatePsionicTalentOptions(params: {
  customAbilities: CustomAbility[]
  featureChoicePicks: Record<string, string[]>
  classNames: string[]
  knownDisciplineNames?: string[]
}): FeatureChoice["options"] {
  const known =
    params.knownDisciplineNames?.map(normalizeName) ??
    disciplinePickNames(params.featureChoicePicks)

  const options: FeatureChoice["options"] = []
  const seen = new Set<string>()

  for (const ability of params.customAbilities) {
    if (ability.ability_role !== "discipline" && !/\bdiscipline\b/i.test(ability.name)) continue
    if (params.classNames.length && ability.attached_to_type === "class") {
      // attached abilities filtered elsewhere
    }
    const matchesKnown =
      !known.length ||
      known.some(
        (pick) =>
          normalizeName(ability.name).includes(pick) || pick.includes(normalizeName(ability.name)),
      )
    if (!matchesKnown) continue

    for (const option of talentOptionsFromDiscipline(ability)) {
      const key = normalizeName(option.name)
      if (seen.has(key)) continue
      seen.add(key)
      options.push(option)
    }
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
}

/** Resolve effective choice options for builder/sheet (static or aggregated). */
export function resolveFeatureChoiceOptions(
  feature: Feature,
  params: {
    customAbilities: CustomAbility[]
    featureChoicePicks: Record<string, string[]>
    classNames: string[]
    classLevel?: number
  },
): FeatureChoice["options"] {
  const choices = feature.choices
  if (!choices) return []
  if (choices.optionsSource === "known_discipline_talents") {
    return aggregatePsionicTalentOptions({
      customAbilities: params.customAbilities,
      featureChoicePicks: params.featureChoicePicks,
      classNames: params.classNames,
    })
  }
  if (choices.optionsSource === "fusion_talents") {
    return params.customAbilities
      .filter((row) => row.ability_role === "talent_pool" && /fusion/i.test(row.name))
      .flatMap((row) => row.choices?.options ?? [])
  }
  if (choices.optionsSource === "class_knacks") {
    const knackKey = Object.keys(params.featureChoicePicks).find((key) => /knack/i.test(key))
    const selected = knackKey ? (params.featureChoicePicks[knackKey] ?? []) : []
    return aggregateKnackOptions({
      customAbilities: params.customAbilities,
      classNames: params.classNames,
      classLevel: params.classLevel ?? 20,
      selectedKnackNames: selected,
    })
  }
  if (choices.optionsSource === "class_upgrades") {
    const upgradeKey = Object.keys(params.featureChoicePicks).find((key) => /upgrade/i.test(key))
    const selected = upgradeKey ? (params.featureChoicePicks[upgradeKey] ?? []) : []
    return aggregateUpgradeOptions({
      customAbilities: params.customAbilities,
      classNames: params.classNames,
      classLevel: params.classLevel ?? 20,
      selectedUpgradeNames: selected,
    })
  }
  return choices.options ?? []
}

/** Mark Psionic Talents class features for dynamic option aggregation at build time. */
export function enrichPsionicTalentGrantFeatures(features: Feature[]): Feature[] {
  return features.map((feature) => {
    if (!/^psionic talents$/i.test(feature.name.trim())) return feature
    if (!feature.isChoice || !feature.choices) return feature
    return {
      ...feature,
      choices: {
        ...feature.choices,
        optionsSource: "known_discipline_talents",
        options: feature.choices.options?.length ? feature.choices.options : [],
      },
    }
  })
}

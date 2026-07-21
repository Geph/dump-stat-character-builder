import { aggregateBombFormulaOptions } from "@/lib/builder/aggregate-bomb-formulas"
import { aggregateDiscoveryOptions } from "@/lib/builder/aggregate-discoveries"
import { aggregateKnackOptions } from "@/lib/builder/knack-choices"
import { aggregateUpgradeOptions } from "@/lib/builder/upgrade-choices"
import { filterChoiceOptionsByEligibility, isCustomAbilityEligible } from "@/lib/builder/choice-option-eligibility"
import type { ChoicePrerequisiteContext } from "@/lib/builder/choice-prerequisite"
import type { CustomAbility, Equipment, Feature, FeatureChoice } from "@/lib/types"
import { weaponMasteryOptionsForClass } from "@/lib/compendium/weapon-mastery-choice"
import { weaponMasteryCatalogEntriesFromAbilities } from "@/lib/compendium/weapon-mastery"
import { migrateFeatureOptionPickers } from "@/lib/compendium/feature-option-choice-migration"

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a)
  const right = normalizeName(b)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

function disciplinePickNames(
  featureChoicePicks: Record<string, string[]>,
  customAbilities: CustomAbility[],
): string[] {
  const disciplineAbilities = customAbilities.filter(isDisciplinePackageAbility)
  const names: string[] = []
  for (const [key, picks] of Object.entries(featureChoicePicks)) {
    if (/discipline/i.test(key)) {
      names.push(...picks)
      continue
    }
    // Feat picks (e.g. Psionic Adept) store package names without "discipline" in the key.
    for (const pick of picks) {
      if (disciplineAbilities.some((ability) => namesMatch(ability.name, pick))) {
        names.push(pick)
      }
    }
  }
  return names
}

export function isDisciplinePackageAbility(ability: CustomAbility): boolean {
  if (ability.ability_role === "discipline") {
    // Import accidents sometimes store class feature shells as discipline rows.
    if (/^(?:primary|secondary|third)\s+discipline$/i.test(ability.name.trim())) return false
    if (/^psionic talents$/i.test(ability.name.trim())) return false
    return true
  }
  return /\bdiscipline\b/i.test(ability.name)
}

/**
 * Disciplines the character currently knows: feature picks + granted custom abilities
 * (e.g. archetype-granted primary discipline).
 */
export function collectKnownDisciplineNames(params: {
  customAbilities: CustomAbility[]
  featureChoicePicks: Record<string, string[]>
  grantedAbilityNames?: string[]
  knownDisciplineNames?: string[]
}): string[] {
  if (params.knownDisciplineNames?.length) {
    return [...new Set(params.knownDisciplineNames.map((name) => name.trim()).filter(Boolean))]
  }

  const fromPicks = disciplinePickNames(params.featureChoicePicks, params.customAbilities)
  const disciplineAbilities = params.customAbilities.filter(isDisciplinePackageAbility)
  const fromGrants = (params.grantedAbilityNames ?? []).filter((grant) =>
    disciplineAbilities.some((ability) => namesMatch(ability.name, grant)),
  )

  const merged: string[] = []
  const seen = new Set<string>()
  for (const name of [...fromPicks, ...fromGrants]) {
    const key = normalizeName(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(name.trim())
  }
  return merged
}

function talentOptionsFromDiscipline(ability: CustomAbility): FeatureChoice["options"] {
  const choices = ability.choices
  if (choices?.options?.length && !/specialization/i.test(choices.category ?? "")) {
    return choices.options
  }

  // Nested import packages often store talents on modifier_catalog after specialization
  // takes over `choices`.
  const catalog = ability.modifier_catalog
  if (!Array.isArray(catalog) || !catalog.length) return []
  return catalog
    .filter((entry) => /discipline\s+talents?/i.test(String(entry.group ?? "")))
    .map((entry) => ({
      name: entry.name,
      description: entry.description ?? entry.summary ?? "",
      prerequisite:
        typeof entry.summary === "string" && /^prerequisite:/i.test(entry.summary)
          ? entry.summary.replace(/^prerequisite:\s*/i, "").trim()
          : null,
    }))
}

/** General Psionic Talents pool (class talents), independent of known disciplines. */
export function aggregateGeneralPsionicTalentOptions(
  customAbilities: CustomAbility[],
): FeatureChoice["options"] {
  const fromPool = customAbilities.find(
    (row) =>
      row.ability_role === "talent_pool" && /general\s+psionic\s+talents/i.test(row.name),
  )
  if (fromPool?.choices?.options?.length) {
    return fromPool.choices.options.map((option) => ({
      ...option,
      sourceLabel: option.sourceLabel ?? "General Talent",
      level_requirement:
        option.level_requirement ??
        customAbilities.find((row) => namesMatch(row.name, option.name))?.level_requirement ??
        null,
    }))
  }
  return customAbilities
    .filter((row) => row.ability_role === "class_talent")
    .map((row) => ({
      name: row.name,
      description: row.description ?? "",
      prerequisite: row.prerequisites ?? null,
      level_requirement: row.level_requirement ?? null,
      sourceLabel: "General Talent",
    }))
}

function buildPrerequisiteContext(params: {
  classLevel: number
  featureChoicePicks: Record<string, string[]>
  knownSpellNames?: string[]
  subclassName?: string | null
  grantedAbilityNames?: string[]
  knownDisciplineNames?: string[]
}): ChoicePrerequisiteContext {
  return {
    classLevel: params.classLevel,
    knownSpellNames: params.knownSpellNames,
    subclassName: params.subclassName,
    selectedAbilityNames: [
      ...Object.values(params.featureChoicePicks).flat(),
      ...(params.grantedAbilityNames ?? []),
      ...(params.knownDisciplineNames ?? []),
    ],
  }
}

/**
 * Union talent options from known disciplines plus General Psionic Talents.
 * Used when a class feature sets choices.optionsSource = "known_discipline_talents".
 * Discipline talents require a known discipline; general talents always contribute
 * (callers still filter by level / prerequisites).
 */
export function aggregatePsionicTalentOptions(params: {
  customAbilities: CustomAbility[]
  featureChoicePicks: Record<string, string[]>
  classNames: string[]
  knownDisciplineNames?: string[]
  grantedAbilityNames?: string[]
}): FeatureChoice["options"] {
  const known = collectKnownDisciplineNames(params).map(normalizeName)

  const options: FeatureChoice["options"] = []
  const seen = new Set<string>()

  const pushUnique = (option: FeatureChoice["options"][number]) => {
    const key = normalizeName(option.name)
    if (!key || seen.has(key)) return
    seen.add(key)
    options.push(option)
  }

  if (known.length) {
    for (const ability of params.customAbilities) {
      if (!isDisciplinePackageAbility(ability)) continue
      const matchesKnown = known.some((pick) => namesMatch(ability.name, pick))
      if (!matchesKnown) continue

      for (const option of talentOptionsFromDiscipline(ability)) {
        pushUnique({
          ...option,
          sourceLabel: option.sourceLabel ?? ability.name.trim(),
        })
      }
    }
  }

  for (const option of aggregateGeneralPsionicTalentOptions(params.customAbilities)) {
    pushUnique({
      ...option,
      sourceLabel: option.sourceLabel ?? "General Talent",
    })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
}

/** Resolve effective choice options for builder/sheet (static or aggregated). */
export type ResolveFeatureChoiceOptionsParams = {
  customAbilities: CustomAbility[]
  featureChoicePicks: Record<string, string[]>
  classNames: string[]
  classLevel?: number
  equipmentCatalog?: Equipment[]
  knownSpellNames?: string[]
  subclassName?: string | null
  /** Abilities granted by class/subclass modifiers (e.g. archetype disciplines). */
  grantedCustomAbilityNames?: string[]
}

export function resolveFeatureChoiceOptions(
  feature: Feature,
  params: ResolveFeatureChoiceOptionsParams,
): FeatureChoice["options"] {
  const choices = feature.choices
  if (!choices) return []

  const classLevel = params.classLevel ?? 20
  const knownDisciplines = collectKnownDisciplineNames({
    customAbilities: params.customAbilities,
    featureChoicePicks: params.featureChoicePicks,
    grantedAbilityNames: params.grantedCustomAbilityNames,
  })
  const prerequisiteContext = buildPrerequisiteContext({
    classLevel,
    featureChoicePicks: params.featureChoicePicks,
    knownSpellNames: params.knownSpellNames,
    subclassName: params.subclassName,
    grantedAbilityNames: params.grantedCustomAbilityNames,
    knownDisciplineNames: knownDisciplines,
  })
  const filterOptions = (options: FeatureChoice["options"]) =>
    filterChoiceOptionsByEligibility(options, prerequisiteContext, {
      customAbilities: params.customAbilities,
    })

  if (choices.resourceKey === "weapon_mastery" && params.classNames[0]) {
    const masteryCatalogEntries = weaponMasteryCatalogEntriesFromAbilities(params.customAbilities)
    const merged = weaponMasteryOptionsForClass(
      params.classNames[0],
      params.equipmentCatalog ?? [],
      masteryCatalogEntries,
    )
    if (merged.length) return merged
  }
  if (choices.optionsSource === "known_discipline_talents") {
    const aggregated = filterOptions(
      aggregatePsionicTalentOptions({
        customAbilities: params.customAbilities,
        featureChoicePicks: params.featureChoicePicks,
        classNames: params.classNames,
        grantedAbilityNames: params.grantedCustomAbilityNames,
        knownDisciplineNames: knownDisciplines,
      }),
    )
    // Do not fall back to the feature's static option dump — that bypasses discipline gates.
    return aggregated
  }
  if (choices.optionsSource === "fusion_talents") {
    const aggregated = filterOptions(
      params.customAbilities
        .filter((row) => row.ability_role === "talent_pool" && /fusion/i.test(row.name))
        .flatMap((row) => row.choices?.options ?? []),
    )
    if (aggregated.length) return aggregated
    return filterOptions(choices.options ?? [])
  }
  if (choices.optionsSource === "class_talents") {
    const aggregated = filterOptions(
      aggregateGeneralPsionicTalentOptions(params.customAbilities),
    )
    if (aggregated.length) return aggregated
    return filterOptions(choices.options ?? [])
  }
  if (choices.optionsSource === "class_disciplines") {
    const aggregated = filterOptions(
      params.customAbilities
        .filter((row) => isDisciplinePackageAbility(row))
        .filter((row) => isCustomAbilityEligible(row, prerequisiteContext))
        .map((row) => ({
          name: row.name,
          description: row.description ?? "",
          prerequisite: row.prerequisites ?? null,
          level_requirement: row.level_requirement ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    )
    if (aggregated.length) return aggregated
    return filterOptions(choices.options ?? [])
  }
  if (choices.optionsSource === "class_knacks") {
    const knackKey = Object.keys(params.featureChoicePicks).find((key) => /knack|trick/i.test(key))
    const selected = knackKey
      ? (params.featureChoicePicks[knackKey] ?? [])
      : Object.values(params.featureChoicePicks).flat()
    return aggregateKnackOptions({
      customAbilities: params.customAbilities,
      classNames: params.classNames,
      classLevel,
      selectedKnackNames: selected,
      knownSpellNames: params.knownSpellNames,
      subclassName: params.subclassName,
    })
  }
  if (choices.optionsSource === "class_upgrades") {
    const upgradeKey = Object.keys(params.featureChoicePicks).find((key) => /upgrade/i.test(key))
    const selected = upgradeKey ? (params.featureChoicePicks[upgradeKey] ?? []) : []
    return aggregateUpgradeOptions({
      customAbilities: params.customAbilities,
      classNames: params.classNames,
      classLevel,
      selectedUpgradeNames: selected,
      subclassName: params.subclassName,
    })
  }
  if (choices.optionsSource === "class_bomb_formulas") {
    return aggregateBombFormulaOptions({
      customAbilities: params.customAbilities,
      classNames: params.classNames,
      classLevel,
    })
  }
  if (choices.optionsSource === "class_discoveries") {
    const discoveryKey = Object.keys(params.featureChoicePicks).find((key) => /discover/i.test(key))
    const selected = discoveryKey ? (params.featureChoicePicks[discoveryKey] ?? []) : []
    return aggregateDiscoveryOptions({
      customAbilities: params.customAbilities,
      classNames: params.classNames,
      classLevel,
      selectedDiscoveryNames: selected,
    })
  }

  // Static option lists (inline Warmage Tricks, discipline talents, etc.)
  const staticSelectedKey = Object.keys(params.featureChoicePicks).find((key) => {
    const category = choices.category?.toLowerCase() ?? ""
    return (
      (category && key.toLowerCase().includes(category)) ||
      key.toLowerCase().includes(feature.name.toLowerCase())
    )
  })
  return filterChoiceOptionsByEligibility(choices.options ?? [], {
    ...prerequisiteContext,
    selectedAbilityNames: staticSelectedKey
      ? [
          ...(params.featureChoicePicks[staticSelectedKey] ?? []),
          ...(params.grantedCustomAbilityNames ?? []),
          ...knownDisciplines,
        ]
      : prerequisiteContext.selectedAbilityNames,
  }, { customAbilities: params.customAbilities })
}


/** Mark Psionic Talents / discipline-pick class features for dynamic option aggregation. */
export function enrichPsionicTalentGrantFeatures(features: Feature[]): Feature[] {
  return features.map((feature) => {
    const name = feature.name.trim()
    let next: Feature = feature
    if (/^(?:primary\s+)?psionic talents$/i.test(name)) {
      const choiceCountByLevel =
        feature.choices?.choiceCountByLevel?.length
          ? feature.choices.choiceCountByLevel
          : parsePsionicTalentChoiceCountByLevel(feature.description ?? "")
      next = {
        ...feature,
        isChoice: true,
        choices: {
          category: feature.choices?.category ?? "Psionic Talent",
          count: feature.choices?.count ?? choiceCountByLevel?.[0]?.count ?? 2,
          options: feature.choices?.options?.length ? feature.choices.options : [],
          optionsSource: "known_discipline_talents",
          resourceKey: feature.choices?.resourceKey ?? null,
          choiceCountByLevel,
          swappableOnRest: feature.choices?.swappableOnRest ?? false,
        },
      }
    } else if (/^(?:class talents|general psionic talents)$/i.test(name)) {
      next = {
        ...feature,
        isChoice: true,
        choices: {
          category: feature.choices?.category ?? "General Psionic Talents",
          count: feature.choices?.count ?? 1,
          options: feature.choices?.options ?? [],
          resourceKey: feature.choices?.resourceKey ?? "class_talents_known",
          optionsSource: "class_talents",
          choiceCountByLevel: feature.choices?.choiceCountByLevel,
        },
      }
    } else if (/^primary\s+discipline$/i.test(name)) {
      // Archetype grants the first discipline — Primary Discipline is not a free pick.
      next = {
        ...feature,
        isChoice: false,
        choices: undefined,
      }
    } else if (
      /^(?:second|secondary|third)\s+discipline$/i.test(name) ||
      (/discipline/i.test(name) &&
        feature.isChoice &&
        /psionic\s+discipline/i.test(feature.choices?.category ?? ""))
    ) {
      next = {
        ...feature,
        isChoice: true,
        choices: {
          category: feature.choices?.category ?? "Psionic Discipline",
          count: feature.choices?.count ?? 1,
          options: feature.choices?.options ?? [],
          optionsSource: "class_disciplines",
          resourceKey: feature.choices?.resourceKey ?? null,
          choiceCountByLevel: feature.choices?.choiceCountByLevel,
        },
      }
    }
    return migrateFeatureOptionPickers(next)
  })
}

/**
 * Parse "Pick two … additional at 5th, 7th, …" into cumulative choiceCountByLevel.
 * Assumes the feature level is the first tier (default count 2).
 */
export function parsePsionicTalentChoiceCountByLevel(
  description: string,
): { level: number; count: number }[] | undefined {
  const startMatch = description.match(/\bpick\s+(two|three|\d+)\s+psionic\s+talents?\b/i)
  const startCount = startMatch
    ? startMatch[1].toLowerCase() === "two"
      ? 2
      : startMatch[1].toLowerCase() === "three"
        ? 3
        : parseInt(startMatch[1], 10)
    : 2
  if (!Number.isFinite(startCount) || startCount <= 0) return undefined

  const levelsMatch = description.match(
    /additional\s+talents?\s+at\s+((?:\d+(?:st|nd|rd|th)?(?:\s*,\s*(?:and\s+)?|\s+and\s+)?)+)\s*levels?/i,
  )
  const extraLevels: number[] = []
  if (levelsMatch) {
    for (const raw of levelsMatch[1].matchAll(/(\d+)/g)) {
      const level = parseInt(raw[1], 10)
      if (Number.isFinite(level) && level > 0) extraLevels.push(level)
    }
  }
  const tiers = [{ level: 2, count: startCount }]
  let count = startCount
  for (const level of [...new Set(extraLevels)].sort((a, b) => a - b)) {
    count += 1
    tiers.push({ level, count })
  }
  return tiers
}

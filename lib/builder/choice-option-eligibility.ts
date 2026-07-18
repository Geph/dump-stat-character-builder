import {
  extractPrerequisiteFromDescription,
  isChoicePrerequisiteMet,
  parseMinimumLevelFromPrerequisite,
  type ChoicePrerequisiteContext,
} from "@/lib/builder/choice-prerequisite"
import type { CustomAbility, FeatureChoice } from "@/lib/types"

export type ChoiceOptionLike = {
  name: string
  description?: string | null
  prerequisite?: string | null
  /** Optional numeric gate when present on nested options or ability rows. */
  level_requirement?: number | null
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function abilityByOptionName(
  optionName: string,
  customAbilities: CustomAbility[] | undefined,
): CustomAbility | undefined {
  if (!customAbilities?.length) return undefined
  const key = normalizeName(optionName)
  return customAbilities.find((ability) => normalizeName(ability.name) === key)
}

/**
 * Effective minimum level for a catalog/choice option:
 * max of freeform prerequisite text, option.level_requirement, and matching CustomAbility.level_requirement.
 */
export function resolveChoiceOptionLevelRequirement(
  option: ChoiceOptionLike,
  customAbilities?: CustomAbility[],
): number | null {
  const prerequisite =
    option.prerequisite?.trim() ||
    extractPrerequisiteFromDescription(option.description) ||
    null
  const fromText = parseMinimumLevelFromPrerequisite(prerequisite)
  const fromOption = option.level_requirement ?? null
  const fromAbility = abilityByOptionName(option.name, customAbilities)?.level_requirement ?? null
  const values = [fromText, fromOption, fromAbility].filter(
    (value): value is number => value != null && Number.isFinite(value),
  )
  if (!values.length) return null
  return Math.max(...values)
}

/**
 * Shared eligibility for builder choice catalogs (talents, knacks, upgrades, exploits, formulas…).
 * Combines numeric level_requirement with freeform prerequisite evaluation.
 */
export function isChoiceOptionEligible(
  option: ChoiceOptionLike,
  context: ChoicePrerequisiteContext,
  extras?: {
    customAbilities?: CustomAbility[]
    levelRequirement?: number | null
  },
): boolean {
  const prerequisite =
    option.prerequisite?.trim() ||
    extractPrerequisiteFromDescription(option.description) ||
    abilityByOptionName(option.name, extras?.customAbilities)?.prerequisites ||
    null
  const levelRequirement =
    extras?.levelRequirement ??
    resolveChoiceOptionLevelRequirement(option, extras?.customAbilities)
  return isChoicePrerequisiteMet(prerequisite, context, { levelRequirement })
}

export function filterChoiceOptionsByEligibility(
  options: FeatureChoice["options"] | ChoiceOptionLike[],
  context: ChoicePrerequisiteContext,
  extras?: { customAbilities?: CustomAbility[] },
): FeatureChoice["options"] {
  return options.filter((option) =>
    isChoiceOptionEligible(option, context, extras),
  ) as FeatureChoice["options"]
}

/** Whether a CustomAbility row itself is eligible at the current build context. */
export function isCustomAbilityEligible(
  ability: CustomAbility,
  context: ChoicePrerequisiteContext,
): boolean {
  return isChoiceOptionEligible(
    {
      name: ability.name,
      description: ability.description,
      prerequisite: ability.prerequisites,
      level_requirement: ability.level_requirement,
    },
    context,
  )
}

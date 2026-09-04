import type { Feature, FeatureChoice } from "@/lib/types"

export function featureChoiceAppliesToCompanion(
  feature: { choices?: Pick<FeatureChoice, "applyTo"> | null } | null | undefined,
): boolean {
  return feature?.choices?.applyTo === "companion"
}

export function companionFeatureNameForChoice(
  feature: { choices?: Pick<FeatureChoice, "applyToCompanionFeature"> | null } | null | undefined,
): string | null {
  const name = feature?.choices?.applyToCompanionFeature?.trim()
  return name || null
}

export function findChoiceOption<T extends { name: string }>(
  options: T[] | undefined,
  name: string,
): T | undefined {
  const key = name.trim().toLowerCase()
  if (!key || !options?.length) return undefined
  return (
    options.find((option) => option.name.trim().toLowerCase() === key) ??
    options.find((option) => option.name.trim().toLowerCase().startsWith(`${key}:`)) ??
    options.find((option) => key.startsWith(`${option.name.trim().toLowerCase()}:`))
  )
}

export function companionSourceMatchesChoice(
  feature: Feature,
  source: { featureName?: string | null; classId?: string | null },
): boolean {
  if (!featureChoiceAppliesToCompanion(feature)) return false
  const target = companionFeatureNameForChoice(feature)
  if (!target) return true
  return (source.featureName ?? "").trim().toLowerCase() === target.toLowerCase()
}

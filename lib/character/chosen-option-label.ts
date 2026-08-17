import { featureChoiceKey } from "@/lib/builder/choices"

/** Chosen option names for a feature, used as title chrome (Hunter's Prey — Colossus Slayer). */
export function chosenOptionNames(
  feature: { name: string; level?: number | null; isChoice?: boolean; choices?: { options?: { name: string }[] } | null },
  classId: string | null | undefined,
  picks: Record<string, string[]>,
): string[] {
  if (classId) {
    const key = featureChoiceKey(classId, feature.name, feature.level ?? 1)
    const keyed = (picks[key] ?? []).filter(Boolean)
    if (keyed.length) return keyed
  }
  const byName = picks[feature.name]
  return Array.isArray(byName) ? byName.filter(Boolean) : []
}

export function withChosenOptionChrome(name: string, optionNames: string[]): string {
  if (!optionNames.length) return name
  return `${name} — ${optionNames.join(", ")}`
}

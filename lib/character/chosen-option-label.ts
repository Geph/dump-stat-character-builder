import { featureChoiceKey } from "@/lib/builder/choices"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** True when a stored pick looks like an id (feat UUID or syscat:…), not a display name. */
export function looksLikeChoicePickId(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (UUID_RE.test(trimmed)) return true
  if (trimmed.startsWith("syscat:")) return true
  return false
}

export type ChosenOptionLabelOptions = {
  /** Map pick ids (feat UUID / catalog pick id) → display name. */
  labelByPickId?: Record<string, string> | null
}

/** Resolve a raw feature_choice_picks value to a sheet/builder label. */
export function resolveChoicePickLabel(
  pick: string,
  labelByPickId?: Record<string, string> | null,
): string {
  const trimmed = pick.trim()
  if (!trimmed) return ""
  const mapped = labelByPickId?.[trimmed]?.trim()
  if (mapped) return mapped
  // Prefer hiding raw ids over showing them in chrome when we cannot resolve.
  if (looksLikeChoicePickId(trimmed)) return ""
  return trimmed
}

/** Chosen option names for a feature, used as title chrome (Hunter's Prey — Colossus Slayer). */
export function chosenOptionNames(
  feature: {
    name: string
    level?: number | null
    isChoice?: boolean
    choices?: { options?: { name: string }[] | null } | null
  },
  classId: string | null | undefined,
  picks: Record<string, string[]>,
  options?: ChosenOptionLabelOptions,
): string[] {
  const labelByPickId = options?.labelByPickId
  const resolve = (values: string[]) =>
    values
      .map((value) => resolveChoicePickLabel(value, labelByPickId))
      .filter(Boolean)

  if (classId) {
    const key = featureChoiceKey(classId, feature.name, feature.level ?? 1)
    const keyed = (picks[key] ?? []).filter(Boolean)
    if (keyed.length) return resolve(keyed)
  }
  const byName = picks[feature.name]
  return Array.isArray(byName) ? resolve(byName.filter(Boolean)) : []
}

export function withChosenOptionChrome(name: string, optionNames: string[]): string {
  const labels = optionNames.map((value) => value.trim()).filter(Boolean)
  if (!labels.length) return name
  return `${name} — ${labels.join(", ")}`
}

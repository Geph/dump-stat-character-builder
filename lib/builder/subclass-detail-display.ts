import type { Feature, Subclass } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function looksLikeDisciplineName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  if (/^(?:primary|secondary|third)\s+discipline$/i.test(trimmed)) return false
  return /\bdiscipline\b/i.test(trimmed)
}

/**
 * Psionic disciplines granted by a subclass (e.g. archetype primary discipline
 * via grant_custom_ability). Used for builder detail hero tags.
 */
export function collectSubclassGrantedDisciplineNames(
  subclass: Pick<Subclass, "features">,
): string[] {
  const names: string[] = []
  const seen = new Set<string>()

  for (const feature of subclass.features ?? []) {
    for (const instance of feature.linkedModifiers ?? []) {
      for (const mod of instance.characteristics ?? []) {
        if (mod.type !== "grant_custom_ability") continue
        for (const raw of mod.abilityNames ?? []) {
          const name = String(raw ?? "").trim()
          if (!looksLikeDisciplineName(name)) continue
          const key = normalizeName(name)
          if (!key || seen.has(key)) continue
          seen.add(key)
          names.push(name)
        }
      }
    }
  }

  return names
}

/** Short hero tag label for a granted discipline (drops trailing "Discipline"). */
export function formatGrantedDisciplineTag(disciplineName: string): string {
  const trimmed = disciplineName.trim()
  const withoutSuffix = trimmed.replace(/\s+discipline$/i, "").trim()
  return withoutSuffix || trimmed
}

export function subclassFeatureTitleRows(
  features: Feature[],
): { level: number; name: string; resourceRelated: boolean; summary: string }[] {
  return [...features]
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((feature) => ({
      level: feature.level,
      name: feature.name,
      resourceRelated: false,
      summary: "",
    }))
}

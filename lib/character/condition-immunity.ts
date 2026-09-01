const CONDITION_ALIASES: Record<string, string> = {
  exhausted: "exhaustion",
  exhaustion: "exhaustion",
}

export function normalizeConditionImmunityKey(name: string): string {
  const trimmed = name.trim().toLowerCase()
  return CONDITION_ALIASES[trimmed] ?? trimmed
}

export function sourcesForConditionImmunity(
  sources: Record<string, string[]>,
  conditionName: string,
): string[] {
  const key = normalizeConditionImmunityKey(conditionName)
  const out: string[] = []
  const seen = new Set<string>()
  for (const [raw, names] of Object.entries(sources)) {
    if (normalizeConditionImmunityKey(raw) !== key) continue
    for (const name of names) {
      const label = name.trim()
      if (!label) continue
      const id = label.toLowerCase()
      if (seen.has(id)) continue
      seen.add(id)
      out.push(label)
    }
  }
  return out
}

export function formatConditionImmunityNote(sources: string[]): string {
  if (!sources.length) return "Immune"
  return `Immune — ${sources.join(", ")}`
}

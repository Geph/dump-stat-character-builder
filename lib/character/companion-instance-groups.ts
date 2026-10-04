import { companionKey, type ResolvedCompanion } from "@/lib/character/companion-stat-block"
import { crToNumber } from "@/lib/character/companion-form-options"
import type { CompanionFormGroup } from "@/lib/character/resolve-companions"

/** One stat block on the Companions tab; `members` are its hit point pools. */
export type CompanionInstanceGroup<T extends ResolvedCompanion> = {
  key: string
  members: T[]
}

/**
 * Collapse repeated picks of the same form (4 × Skeleton from Thralls) into one
 * stat block. Each member keeps its own companion key, so HP, temp HP, name, and
 * conditions persist per copy.
 */
export function groupCompanionInstances<T extends ResolvedCompanion>(
  rows: T[],
): CompanionInstanceGroup<T>[] {
  const groups: CompanionInstanceGroup<T>[] = []
  const byKey = new Map<string, CompanionInstanceGroup<T>>()
  for (const row of rows) {
    const repeatable = row.source.formInstance != null && Boolean(row.source.formName)
    const key = repeatable ? `${companionKey({ ...row.source, formInstance: null })}#pool` : row.key
    const existing = byKey.get(key)
    if (existing) {
      existing.members.push(row)
      continue
    }
    const group = { key, members: [row] }
    byKey.set(key, group)
    groups.push(group)
  }
  for (const group of groups) {
    group.members.sort((a, b) => (a.source.formInstance ?? 1) - (b.source.formInstance ?? 1))
  }
  return groups
}

/** Default label for one hit point pool inside a grouped stat block. */
export function companionPoolDefaultLabel(companion: Pick<ResolvedCompanion, "template" | "source">): string {
  return `${companion.template.name} ${companion.source.formInstance ?? 1}`
}

export type CompanionFormSelectionSummary = {
  total: number
  max: number | null
  crUsed: number
  crMax: number | null
  types: { name: string; count: number; cr: string | null }[]
}

/** Count chosen creatures per type for a form group, in option order. */
export function summarizeCompanionFormSelection(group: CompanionFormGroup): CompanionFormSelectionSummary {
  const counts = new Map<string, number>()
  for (const name of group.selected) {
    const key = name.trim().toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const types: CompanionFormSelectionSummary["types"] = []
  let crUsed = 0
  for (const option of group.options) {
    const count = counts.get(option.name.trim().toLowerCase()) ?? 0
    if (!count) continue
    types.push({ name: option.name, count, cr: option.cr ?? null })
    crUsed += (crToNumber(option.cr) ?? 0) * count
  }
  return {
    total: group.selected.length,
    max: group.maxKnown,
    crUsed,
    crMax: group.maxCombinedCr ?? null,
    types,
  }
}

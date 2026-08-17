import { formatCompendiumSource } from "@/lib/srd/source"

export function compendiumItemSourceKey(source: string | null | undefined): string {
  return formatCompendiumSource(source?.trim() || "Custom")
}

export function collectCompendiumSourceOptions(
  rows: readonly { source?: string | null }[],
): string[] {
  return [...new Set(rows.map((row) => compendiumItemSourceKey(row.source)))].sort((a, b) =>
    a.localeCompare(b),
  )
}

export function itemMatchesSourceFilter(
  source: string | null | undefined,
  filter: string,
): boolean {
  if (filter === "all") return true
  return compendiumItemSourceKey(source) === filter
}

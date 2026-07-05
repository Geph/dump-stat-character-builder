import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"

function entryHaystack(entry: ModifierCatalogEntry): string {
  return `${entry.name ?? ""} ${entry.summary ?? ""} ${entry.group ?? ""}`.toLowerCase()
}

/** Higher scores rank earlier in search results. */
export function modifierCatalogSearchScore(entry: ModifierCatalogEntry, query: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0

  const name = (entry.name ?? "").toLowerCase()
  const summary = (entry.summary ?? "").toLowerCase()
  const group = (entry.group ?? "").toLowerCase()

  if (name === q) return 1000
  if (name.startsWith(q)) return 900
  if (name.includes(q)) return 800
  if (summary.includes(q)) return 200
  if (group.includes(q)) return 100
  return 0
}

export function filterModifierCatalogEntries(
  entries: ModifierCatalogEntry[],
  query: string,
): ModifierCatalogEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries
    .filter((entry) => entryHaystack(entry).includes(q))
    .sort((a, b) => modifierCatalogSearchScore(b, q) - modifierCatalogSearchScore(a, q))
}

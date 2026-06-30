import languagesSeed from "@/lib/srd/seed-data/languages.json"
import type { Language, LanguagePool } from "@/lib/types"

export type LanguageSeedRow = (typeof languagesSeed)[number]

const seedRows = languagesSeed as LanguageSeedRow[]

export function getSeedLanguages(): LanguageSeedRow[] {
  return seedRows
}

export function getStandardLanguageNames(): string[] {
  return seedRows.filter((row) => row.pool === "standard").map((row) => row.name)
}

export function getRareLanguageNames(): string[] {
  return seedRows.filter((row) => row.pool === "rare").map((row) => row.name)
}

export function getAllSeedLanguageNames(): string[] {
  return seedRows.map((row) => row.name)
}

/** Merge compendium rows with bundled seed names (deduped, sorted). */
export function mergeLanguageNameLists(
  compendiumRows: Array<Pick<Language, "name"> | { name: string }> = [],
): string[] {
  const names = new Set<string>([
    ...getAllSeedLanguageNames(),
    ...compendiumRows.map((row) => row.name).filter(Boolean),
  ])
  return [...names].sort((a, b) => a.localeCompare(b))
}

export function languageNamesForPool(
  pool: LanguagePool | "standard_and_rare" | null | undefined,
  allNames: string[],
): string[] {
  if (pool === "standard_and_rare") return allNames
  const standard = new Set(getStandardLanguageNames().map((name) => name.toLowerCase()))
  return allNames.filter((name) => standard.has(name.toLowerCase()))
}

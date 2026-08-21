import { isCompendiumContentType, type CompendiumContentType } from "@/lib/compendium/content-types"

type SearchParamReader = {
  get(name: string): string | null
}

export function parseCompendiumBrowseTab(
  value: string | null,
  fallback: CompendiumContentType = "classes",
): CompendiumContentType {
  return value && isCompendiumContentType(value) ? value : fallback
}

export function compendiumBrowseHref(tab: CompendiumContentType, query: string): string {
  const params = new URLSearchParams()
  params.set("tab", tab)
  const q = query.trim()
  if (q) params.set("q", q)
  return `/compendium?${params.toString()}`
}

export function readCompendiumBrowseState(searchParams: SearchParamReader): {
  tab: CompendiumContentType
  query: string
} {
  return {
    tab: parseCompendiumBrowseTab(searchParams.get("tab")),
    query: searchParams.get("q") ?? "",
  }
}

export function compendiumBrowseUrlMatches(
  searchParams: SearchParamReader,
  tab: CompendiumContentType,
  query: string,
): boolean {
  const current = readCompendiumBrowseState(searchParams)
  return current.tab === tab && current.query === query.trim()
}

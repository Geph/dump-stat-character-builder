export type SearchMatchKind =
  | "exact"
  | "alias"
  | "prefix"
  | "name"
  | "metadata"
  | "fuzzy"

export type SearchField<T> = {
  name: string
  value: (item: T) => unknown
  /** Relative contribution after name/alias matching. Defaults to 1. */
  weight?: number
}

export type RankedSearchOptions<T> = {
  name: (item: T) => string
  id?: (item: T) => string
  fields?: SearchField<T>[]
  aliases?: (item: T) => string[]
  fuzzy?: boolean
  fuzzyThreshold?: number
  limit?: number
}

export type RankedSearchMatch<T> = {
  item: T
  score: number
  kind: SearchMatchKind
  field: string
}

const COMBINING_MARKS = /[\u0300-\u036f]/g
const SEARCH_QUERY_EQUIVALENTS: Readonly<Record<string, readonly string[]>> = {
  ac: ["armor class"],
  "armor class": ["ac"],
  dc: ["difficulty class"],
  "difficulty class": ["dc"],
  hp: ["hit points"],
  "hit points": ["hp"],
  asi: ["ability score improvement"],
  "ability score improvement": ["asi"],
  aoo: ["opportunity attack", "attack of opportunity"],
  "attack of opportunity": ["opportunity attack", "aoo"],
  "opportunity attack": ["attack of opportunity", "aoo"],
}

export function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function compactSearchText(value: unknown): string {
  return normalizeSearchText(value).replace(/[^a-z0-9]+/g, "")
}

export function tokenizeSearchQuery(query: string): string[] {
  return normalizeSearchText(query).split(" ").filter(Boolean)
}

function fieldText(value: unknown): string {
  if (Array.isArray(value)) return value.map(fieldText).join(" ")
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(fieldText).join(" ")
  }
  return normalizeSearchText(value)
}

/** Adjacent-transposition edit distance, suitable for common typing mistakes. */
export function damerauLevenshteinDistance(left: string, right: string): number {
  if (left === right) return 0
  if (!left.length) return right.length
  if (!right.length) return left.length

  const rows = left.length + 1
  const columns = right.length + 1
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0))
  for (let row = 0; row < rows; row += 1) matrix[row][0] = row
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      )
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        matrix[row][column] = Math.min(
          matrix[row][column],
          matrix[row - 2][column - 2] + cost,
        )
      }
    }
  }
  return matrix[left.length][right.length]
}

export function fuzzySearchSimilarity(left: string, right: string): number {
  const a = compactSearchText(left)
  const b = compactSearchText(right)
  if (!a || !b) return 0
  return 1 - damerauLevenshteinDistance(a, b) / Math.max(a.length, b.length)
}

function bestFuzzySimilarity(name: string, query: string): number {
  const candidates = [name, ...normalizeSearchText(name).split(" ")]
  return Math.max(...candidates.map((candidate) => fuzzySearchSimilarity(candidate, query)))
}

function directNameMatch(name: string, query: string, tokens: string[]) {
  const compactName = compactSearchText(name)
  const compactQuery = compactSearchText(query)
  if (name === query || (compactQuery && compactName === compactQuery)) {
    return { score: 10_000, kind: "exact" as const }
  }
  if (name.startsWith(query) || (compactQuery && compactName.startsWith(compactQuery))) {
    return { score: 9_000, kind: "prefix" as const }
  }
  const initials = name
    .split(" ")
    .filter((word) => word && !["a", "an", "and", "of", "the", "to"].includes(word))
    .map((word) => word[0])
    .join("")
  if (compactQuery.length >= 2 && initials === compactQuery) {
    return { score: 8_500, kind: "name" as const }
  }
  if (name.includes(query) || (compactQuery && compactName.includes(compactQuery))) {
    return { score: 8_000, kind: "name" as const }
  }
  if (tokens.length && tokens.every((token) => name.includes(token))) {
    return { score: 7_500, kind: "name" as const }
  }
  return null
}

export function rankSearchResults<T>(
  items: readonly T[],
  query: string,
  options: RankedSearchOptions<T>,
): RankedSearchMatch<T>[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return items.slice(0, options.limit).map((item) => ({
      item,
      score: 0,
      kind: "metadata",
      field: "name",
    }))
  }

  const queryVariants = [
    normalizedQuery,
    ...(SEARCH_QUERY_EQUIVALENTS[normalizedQuery] ?? []).map(normalizeSearchText),
  ]
  const tokenVariants = queryVariants.map(tokenizeSearchQuery)
  const fuzzyEnabled = options.fuzzy !== false && compactSearchText(normalizedQuery).length >= 3
  const fuzzyThreshold = options.fuzzyThreshold ?? 0.75

  const ranked = items.flatMap((item, index) => {
    const name = normalizeSearchText(options.name(item))
    let best:
      | { score: number; kind: SearchMatchKind; field: string; index: number }
      | undefined

    for (let variantIndex = 0; variantIndex < queryVariants.length; variantIndex += 1) {
      const direct = directNameMatch(
        name,
        queryVariants[variantIndex],
        tokenVariants[variantIndex],
      )
      if (direct && (!best || direct.score > best.score)) {
        best = { ...direct, field: "name", index }
      }
    }

    for (const aliasValue of options.aliases?.(item) ?? []) {
      const alias = normalizeSearchText(aliasValue)
      for (let variantIndex = 0; variantIndex < queryVariants.length; variantIndex += 1) {
        const aliasMatch = directNameMatch(
          alias,
          queryVariants[variantIndex],
          tokenVariants[variantIndex],
        )
        if (!aliasMatch) continue
        const score = aliasMatch.score === 10_000 ? 9_800 : aliasMatch.score - 100
        if (!best || score > best.score) {
          best = { score, kind: "alias", field: "alias", index }
        }
      }
    }

    const normalizedFields = (options.fields ?? []).map((field) => ({
      field,
      text: fieldText(field.value(item)),
    }))
    for (const { field, text } of normalizedFields) {
      const text = fieldText(field.value(item))
      if (!text) continue
      const phraseMatch = queryVariants.some((variant) => text.includes(variant))
      const tokenMatch = tokenVariants.some(
        (tokens) => tokens.length > 0 && tokens.every((token) => text.includes(token)),
      )
      if (!phraseMatch && !tokenMatch) continue
      const score = (phraseMatch ? 4_000 : 3_500) * (field.weight ?? 1)
      if (!best || score > best.score) {
        best = { score, kind: "metadata", field: field.name, index }
      }
    }
    const combinedMetadata = normalizedFields.map((entry) => entry.text).join(" ")
    if (
      tokenVariants.some(
        (tokens) =>
          tokens.length > 0 &&
          tokens.every((token) => name.includes(token) || combinedMetadata.includes(token)),
      ) &&
      (!best || best.score < 3_250)
    ) {
      best = { score: 3_250, kind: "metadata", field: "multiple fields", index }
    }

    if (!best && fuzzyEnabled) {
      const similarity = bestFuzzySimilarity(name, normalizedQuery)
      if (similarity >= fuzzyThreshold) {
        const lengthBonus = Math.max(
          0,
          100 -
            Math.abs(
              compactSearchText(name).length - compactSearchText(normalizedQuery).length,
            ) *
              10,
        )
        best = {
          score: 5_000 + Math.round(similarity * 1_000) + lengthBonus,
          kind: "fuzzy",
          field: "name",
          index,
        }
      }
    }

    return best ? [{ item, ...best }] : []
  })

  return ranked
    .sort(
      (left, right) =>
        right.score - left.score ||
        options.name(left.item).localeCompare(options.name(right.item)) ||
        left.index - right.index,
    )
    .slice(0, options.limit)
    .map(({ index: _index, ...match }) => match)
}

export function searchItems<T>(
  items: readonly T[],
  query: string,
  options: RankedSearchOptions<T>,
): T[] {
  if (!normalizeSearchText(query)) return [...items]
  return rankSearchResults(items, query, options).map((match) => match.item)
}


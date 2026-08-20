import { spellAliasLookupKeys } from "@/lib/compendium/spell-name-aliases"
import type { CompendiumContentType as ContentType } from "@/lib/compendium/content-types"
import {
  rankSearchResults,
  searchItems,
  type RankedSearchMatch,
  type RankedSearchOptions,
  type SearchField,
} from "@/lib/search/ranked-search"

export type SearchableCompendiumRow = {
  id?: string
  name: string
  description?: string | null
  source?: string | null
  [key: string]: unknown
}

function commonFields(): SearchField<SearchableCompendiumRow>[] {
  return [
    { name: "source", value: (item) => item.source, weight: 0.9 },
    { name: "description", value: (item) => item.description, weight: 0.35 },
  ]
}

function fieldsForContentType(
  type: ContentType,
  classNamesById: Readonly<Record<string, string>>,
): SearchField<SearchableCompendiumRow>[] {
  const common = commonFields()
  switch (type) {
    case "spells":
      return [
        { name: "school", value: (item) => item.school, weight: 1.4 },
        { name: "classes", value: (item) => item.classes, weight: 1.2 },
        { name: "level", value: (item) => [`level ${item.level}`, `${item.level}`], weight: 1.1 },
        ...common,
      ]
    case "feats":
      return [
        { name: "category", value: (item) => item.category, weight: 1.4 },
        { name: "prerequisite", value: (item) => item.prerequisite, weight: 1.1 },
        ...common,
      ]
    case "equipment":
    case "magic_items":
      return [
        { name: "category", value: (item) => item.category, weight: 1.4 },
        { name: "subcategory", value: (item) => item.subcategory, weight: 1.3 },
        { name: "rarity", value: (item) => item.rarity, weight: 1.2 },
        { name: "magic item category", value: (item) => item.magic_item_category, weight: 1.2 },
        { name: "properties", value: (item) => item.properties, weight: 1 },
        ...common,
      ]
    case "creatures":
      return [
        { name: "creature type", value: (item) => item.creature_type, weight: 1.5 },
        { name: "challenge rating", value: (item) => [`cr ${item.cr}`, item.cr], weight: 1.3 },
        { name: "size", value: (item) => item.size, weight: 1 },
        ...common,
      ]
    case "species":
      return [
        { name: "creature type", value: (item) => item.creature_type, weight: 1.5 },
        { name: "size", value: (item) => [item.size, item.size_options], weight: 1 },
        ...common,
      ]
    case "backgrounds":
      return [
        { name: "skills", value: (item) => [item.skill_proficiencies, item.proficiencies], weight: 1.3 },
        { name: "tools", value: (item) => item.tool_proficiencies, weight: 1.1 },
        { name: "feat", value: (item) => item.feat_granted, weight: 1.1 },
        ...common,
      ]
    case "classes":
      return [
        { name: "primary ability", value: (item) => item.primary_ability, weight: 1.2 },
        { name: "saving throws", value: (item) => item.saving_throws, weight: 1.1 },
        ...common,
      ]
    case "subclasses":
      return [
        {
          name: "class",
          value: (item) => classNamesById[String(item.class_id ?? "")] ?? "",
          weight: 1.5,
        },
        ...common,
      ]
    case "class_resources":
      return [
        { name: "resource key", value: (item) => item.resource_key, weight: 1.5 },
        {
          name: "class",
          value: (item) => classNamesById[String(item.class_id ?? "")] ?? "",
          weight: 1.5,
        },
        ...common,
      ]
    case "abilities":
      return [
        { name: "source name", value: (item) => item.source_name, weight: 1.4 },
        { name: "role", value: (item) => item.ability_role, weight: 1.1 },
        { name: "eligible classes", value: (item) => item.eligible_classes, weight: 1.2 },
        ...common,
      ]
    case "languages":
      return [
        { name: "pool", value: (item) => item.pool, weight: 1.2 },
        { name: "script", value: (item) => item.script, weight: 1.1 },
        ...common,
      ]
    case "tools":
      return [
        { name: "tool group", value: (item) => item.tool_group, weight: 1.3 },
        { name: "ability", value: (item) => item.ability, weight: 1.1 },
        ...common,
      ]
    default:
      return common
  }
}

export function compendiumSearchOptions(
  type: ContentType,
  classNamesById: Readonly<Record<string, string>> = {},
): RankedSearchOptions<SearchableCompendiumRow> {
  return {
    name: (item) => item.name,
    id: (item) => String(item.id ?? item.name),
    fields: fieldsForContentType(type, classNamesById),
    aliases: type === "spells" ? (item) => spellAliasLookupKeys(item.name) : undefined,
    fuzzy: true,
  }
}

export function searchCompendiumRows<T extends SearchableCompendiumRow>(
  rows: readonly T[],
  query: string,
  type: ContentType,
  classNamesById: Readonly<Record<string, string>> = {},
): T[] {
  return searchItems(rows, query, compendiumSearchOptions(type, classNamesById)) as T[]
}

export function rankCompendiumRows<T extends SearchableCompendiumRow>(
  rows: readonly T[],
  query: string,
  type: ContentType,
  classNamesById: Readonly<Record<string, string>> = {},
  limit = 10,
  fuzzyThreshold?: number,
): RankedSearchMatch<T>[] {
  return rankSearchResults(rows, query, {
    ...compendiumSearchOptions(type, classNamesById),
    limit,
    fuzzyThreshold,
  }) as RankedSearchMatch<T>[]
}

export function compendiumSearchResultDetail(
  item: SearchableCompendiumRow,
  type: ContentType,
  classNamesById: Readonly<Record<string, string>> = {},
): string {
  const source = String(item.source ?? "").trim()
  if (type === "spells") {
    const level = Number(item.level ?? 0)
    return `${level === 0 ? "Cantrip" : `Level ${level}`} · ${String(item.school ?? "Spell")}${source ? ` · ${source}` : ""}`
  }
  if (type === "subclasses") {
    const className = classNamesById[String(item.class_id ?? "")]
    return [className, source].filter(Boolean).join(" · ")
  }
  if (type === "feats") return [item.category, source].filter(Boolean).join(" · ")
  if (type === "creatures") return [item.creature_type, item.cr ? `CR ${item.cr}` : null, source].filter(Boolean).join(" · ")
  return source
}


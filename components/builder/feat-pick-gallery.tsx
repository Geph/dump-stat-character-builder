"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { Check, Info } from "lucide-react"
import { GameIcon } from "@/components/game-icon-picker"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import { normalizeFeatCategory } from "@/lib/builder/feat-selection"
import { cn } from "@/lib/utils"
import type { Feat } from "@/lib/types"
import { SearchBox } from "@/components/search/search-box"
import { rankSearchResults, searchItems } from "@/lib/search/ranked-search"

type FeatPickGalleryProps = {
  feats: Feat[]
  selectedId: string | null
  onSelect: (featId: string | null) => void
  onShowDetails?: (feat: Feat) => void
  /** Visual builder uses a denser mastery-style gallery. */
  layout?: "dense" | "cinematic"
  selectedClassName?: string
  /** Show search + category filters above the gallery. */
  showFilters?: boolean
}

export function FeatPickGallery({
  feats,
  selectedId,
  onSelect,
  onShowDetails,
  layout = "cinematic",
  selectedClassName = "border-secondary bg-secondary/10",
  showFilters = true,
}: FeatPickGalleryProps) {
  const cinematic = layout === "cinematic"
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const deferredSearch = useDeferredValue(search)

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const feat of feats) {
      seen.add(normalizeFeatCategory(feat.category))
    }
    return [...seen].sort((a, b) => a.localeCompare(b))
  }, [feats])

  const sourceOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const feat of feats) {
      const source = feat.source?.trim()
      if (source) seen.add(source)
    }
    return [...seen].sort((a, b) => a.localeCompare(b))
  }, [feats])

  const filteredFeats = useMemo(() => {
    const faceted = feats.filter((feat) => {
      if (
        categoryFilter !== "all" &&
        normalizeFeatCategory(feat.category) !== categoryFilter
      ) {
        return false
      }
      if (sourceFilter !== "all" && (feat.source?.trim() || "") !== sourceFilter) {
        return false
      }
      return true
    })
    return searchItems(faceted, deferredSearch, {
      name: (feat) => feat.name,
      fields: [
        { name: "category", value: (feat) => feat.category, weight: 1.3 },
        { name: "prerequisite", value: (feat) => feat.prerequisite, weight: 1.1 },
        { name: "source", value: (feat) => feat.source },
        { name: "description", value: (feat) => feat.description, weight: 0.35 },
      ],
    })
  }, [feats, deferredSearch, categoryFilter, sourceFilter])

  const filterSelectClass =
    "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
  const filterLabelClass =
    "text-[10px] font-bold uppercase tracking-wide text-muted-foreground"

  // Collapse to the chosen feat; deselecting unfurls the full gallery again.
  const displayFeats =
    selectedId != null ? filteredFeats.filter((feat) => feat.id === selectedId) : filteredFeats

  return (
    <div className="space-y-2">
      {showFilters && selectedId == null && feats.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox
            value={search}
            onChange={setSearch}
            suggestions={rankSearchResults(feats, deferredSearch, {
              name: (feat) => feat.name,
              fields: [
                { name: "category", value: (feat) => feat.category, weight: 1.3 },
                { name: "prerequisite", value: (feat) => feat.prerequisite, weight: 1.1 },
                { name: "source", value: (feat) => feat.source },
              ],
              limit: 8,
            }).map((match) => ({
              id: match.item.id,
              label: match.item.name,
              detail: [normalizeFeatCategory(match.item.category), match.item.source]
                .filter(Boolean)
                .join(" · "),
              item: match.item,
              matchKind: match.kind,
            }))}
            onSelect={(suggestion) => setSearch(suggestion.label)}
            scope="builder:feats"
            placeholder="Search feats…"
            ariaLabel="Search feats"
            className="w-full max-w-[11rem] flex-1 basis-[9rem] sm:max-w-[13rem]"
            inputClassName="border"
          />
          {categoryOptions.length > 1 ? (
            <div className="flex shrink-0 items-center gap-2">
              <label className={filterLabelClass}>Type</label>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className={filterSelectClass}
                aria-label="Filter feats by type"
              >
                <option value="all">All types</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="flex shrink-0 items-center gap-2">
            <label className={filterLabelClass}>Source</label>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className={cn(filterSelectClass, "max-w-[12rem]")}
              aria-label="Filter feats by source"
            >
              <option value="all">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {selectedId == null && filteredFeats.length === 0 && feats.length > 0 ? (
        <p className="text-xs text-muted-foreground">No feats match this search.</p>
      ) : null}

      <div
        className={
          cinematic
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
        }
      >
        {displayFeats.map((feat) => {
          const isSelected = feat.id === selectedId
          const canShowInfo = Boolean(onShowDetails && feat.description?.trim())
          const meta = featMetaParts(feat, cinematic)

          if (!cinematic) {
            return (
              <button
                key={feat.id}
                type="button"
                onClick={() => onSelect(isSelected ? null : feat.id)}
                className={cn(
                  "w-full rounded-lg border-2 px-2.5 py-1.5 text-left transition-all",
                  isSelected
                    ? selectedClassName
                    : "border-border bg-card hover:border-secondary/50",
                )}
              >
                <p className="text-xs font-semibold text-foreground">{feat.name}</p>
                {meta.length > 0 ? (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    {meta.map((part) => (
                      <span
                        key={part}
                        className={part === "Repeatable" ? "text-primary" : undefined}
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                ) : null}
              </button>
            )
          }

          return (
            <div
              key={feat.id}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-center transition-all",
                isSelected
                  ? selectedClassName
                  : "border-border bg-card hover:border-secondary/50",
              )}
            >
              {isSelected ? (
                <span className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
              {canShowInfo ? (
                <button
                  type="button"
                  aria-label={`About ${feat.name}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onShowDetails?.(feat)
                  }}
                  className="absolute right-1 top-1 rounded-md border border-border/80 bg-background/80 p-1 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Info className="h-3 w-3" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onSelect(isSelected ? null : feat.id)}
                className="flex w-full flex-col items-center gap-1 pt-1"
              >
                <GameIcon
                  name={getCompendiumItemIcon("feats", feat as unknown as Record<string, unknown>)}
                  className="h-7 w-7 shrink-0 text-secondary"
                />
                <span className="text-xs font-semibold leading-tight text-foreground">
                  {feat.name}
                </span>
                {meta.length > 0 ? (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {meta.join(" · ")}
                  </span>
                ) : null}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function featMetaParts(feat: Feat, cinematic: boolean): string[] {
  const isOrigin = feat.category?.toLowerCase().includes("origin")
  return [
    isOrigin
      ? "Origin"
      : feat.level_requirement && feat.level_requirement > 1
        ? cinematic
          ? `L${feat.level_requirement}+`
          : `Lvl ${feat.level_requirement}+`
        : null,
    feat.repeatable ? "Repeatable" : null,
  ].filter((part): part is string => Boolean(part))
}

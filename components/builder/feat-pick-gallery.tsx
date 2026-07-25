"use client"

import { useMemo, useState } from "react"
import { Check, Info, Search } from "lucide-react"
import { GameIcon } from "@/components/game-icon-picker"
import { getCompendiumItemIcon } from "@/lib/compendium/content-types"
import { normalizeFeatCategory } from "@/lib/builder/feat-selection"
import { cn } from "@/lib/utils"
import type { Feat } from "@/lib/types"

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
  const [repeatableFilter, setRepeatableFilter] = useState<"all" | "yes" | "no">("all")
  const [sourceFilter, setSourceFilter] = useState("all")

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
    const query = search.trim().toLowerCase()
    return feats.filter((feat) => {
      if (
        categoryFilter !== "all" &&
        normalizeFeatCategory(feat.category) !== categoryFilter
      ) {
        return false
      }
      if (repeatableFilter === "yes" && !feat.repeatable) return false
      if (repeatableFilter === "no" && feat.repeatable) return false
      if (sourceFilter !== "all" && (feat.source?.trim() || "") !== sourceFilter) {
        return false
      }
      if (!query) return true
      const haystack = `${feat.name} ${feat.prerequisite ?? ""} ${feat.description ?? ""} ${feat.source ?? ""}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [feats, search, categoryFilter, repeatableFilter, sourceFilter])

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
        <div className="flex flex-col gap-2">
          <div className="relative min-w-0 w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search feats…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              aria-label="Search feats"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              <label className={filterLabelClass}>Repeatable</label>
              <select
                value={repeatableFilter}
                onChange={(event) =>
                  setRepeatableFilter(event.target.value as "all" | "yes" | "no")
                }
                className={filterSelectClass}
                aria-label="Filter feats by repeatable"
              >
                <option value="all">Any</option>
                <option value="yes">Repeatable</option>
                <option value="no">Once only</option>
              </select>
            </div>
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

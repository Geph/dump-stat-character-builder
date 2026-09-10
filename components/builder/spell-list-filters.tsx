"use client"

import { useDeferredValue } from "react"
import { SearchBox } from "@/components/search/search-box"
import {
  filterSpellsBySchool,
  uniqueSpellLevels,
  uniqueSpellSchools,
  type SpellPickFilterable,
} from "@/lib/builder/spell-grant-filters"
import { spellAliasLookupKeys } from "@/lib/compendium/spell-name-aliases"
import { formatSpellListGroupLabel } from "@/lib/compendium/spell-slots"
import { rankSearchResults } from "@/lib/search/ranked-search"
import { cn } from "@/lib/utils"

const FILTER_SELECT_CLASS =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
const FILTER_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-wide text-muted-foreground"

type SpellListFiltersProps<T extends SpellPickFilterable> = {
  spells: readonly T[]
  search: string
  onSearchChange: (value: string) => void
  school: string
  onSchoolChange: (value: string) => void
  searchScope: string
  searchAriaLabel: string
  level?: string
  onLevelChange?: (value: string) => void
  showLevelFilter?: boolean
  className?: string
}

export function SpellListFilters<T extends SpellPickFilterable>({
  spells,
  search,
  onSearchChange,
  school,
  onSchoolChange,
  searchScope,
  searchAriaLabel,
  level = "all",
  onLevelChange,
  showLevelFilter = false,
  className,
}: SpellListFiltersProps<T>) {
  const deferredSearch = useDeferredValue(search)
  const schoolOptions = uniqueSpellSchools(spells)
  const levelOptions = uniqueSpellLevels(spells)
  const showLevel = Boolean(showLevelFilter && onLevelChange && levelOptions.length > 1)
  const showSchool = schoolOptions.length > 1
  const suggestionPool = filterSpellsBySchool(
    showLevel && level !== "all"
      ? spells.filter((spell) => String(spell.level ?? 0) === level)
      : spells,
    school,
  )

  return (
    <div className={cn("mb-3 flex flex-wrap items-center gap-2", className)}>
      {showLevel ? (
        <div className="flex shrink-0 items-center gap-2">
          <label className={FILTER_LABEL_CLASS} htmlFor={`${searchScope}-level`}>
            Level
          </label>
          <select
            id={`${searchScope}-level`}
            value={level}
            onChange={(event) => onLevelChange?.(event.target.value)}
            className={FILTER_SELECT_CLASS}
            aria-label="Filter spells by level"
          >
            <option value="all">All levels</option>
            {levelOptions.map((entry) => (
              <option key={entry} value={String(entry)}>
                {formatSpellListGroupLabel(entry)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {showSchool ? (
        <div className="flex shrink-0 items-center gap-2">
          <label className={FILTER_LABEL_CLASS} htmlFor={`${searchScope}-school`}>
            School
          </label>
          <select
            id={`${searchScope}-school`}
            value={school}
            onChange={(event) => onSchoolChange(event.target.value)}
            className={cn(FILTER_SELECT_CLASS, "max-w-[11rem]")}
            aria-label="Filter spells by school"
          >
            <option value="all">All schools</option>
            {schoolOptions.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <SearchBox
        value={search}
        onChange={onSearchChange}
        suggestions={rankSearchResults(suggestionPool, deferredSearch, {
          name: (spell) => spell.name,
          aliases: (spell) => spellAliasLookupKeys(spell.name),
          fields: [{ name: "school", value: (spell) => spell.school, weight: 1.3 }],
          limit: 8,
        }).map((match) => ({
          id: match.item.id ?? match.item.name,
          label: match.item.name,
          detail: `${
            (match.item.level ?? 0) === 0 ? "Cantrip" : `Level ${match.item.level}`
          } · ${match.item.school ?? "Spell"}`,
          item: match.item,
          matchKind: match.kind,
        }))}
        onSelect={(suggestion) => onSearchChange(suggestion.label)}
        scope={searchScope}
        placeholder="Search spells…"
        ariaLabel={searchAriaLabel}
        className="min-w-[8rem] flex-1 basis-[8rem]"
        inputClassName="border text-sm"
      />
    </div>
  )
}

"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Clock3, Search } from "lucide-react"
import { useSearchAutocomplete } from "@/components/settings/use-search-autocomplete"
import { cn } from "@/lib/utils"

export type SearchSuggestion<T = unknown> = {
  id: string
  label: string
  detail?: string
  item: T
  matchKind?: string
}

type SearchBoxProps<T> = {
  value: string
  onChange: (value: string) => void
  suggestions?: SearchSuggestion<T>[]
  onSelect?: (suggestion: SearchSuggestion<T>) => void
  scope: string
  placeholder?: string
  ariaLabel: string
  className?: string
  inputClassName?: string
  autoCompleteLimit?: number
  onSubmitQuery?: (query: string) => void
}

const RECENT_PREFIX = "dumpstat:recent-search:"
const MAX_RECENT = 8

function readRecent(scope: string): string[] {
  if (typeof localStorage === "undefined") return []
  try {
    const parsed = JSON.parse(localStorage.getItem(`${RECENT_PREFIX}${scope}`) ?? "[]")
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string").slice(0, MAX_RECENT)
      : []
  } catch {
    return []
  }
}

function writeRecent(scope: string, query: string): string[] {
  const normalized = query.trim()
  if (!normalized || typeof localStorage === "undefined") return readRecent(scope)
  const next = [
    normalized,
    ...readRecent(scope).filter((entry) => entry.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, MAX_RECENT)
  localStorage.setItem(`${RECENT_PREFIX}${scope}`, JSON.stringify(next))
  return next
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function SearchMatchText({ text, query }: { text: string; query: string }) {
  const tokens = query.trim().split(/\s+/).filter((token) => token.length >= 2)
  if (!tokens.length) return <>{text}</>
  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "ig")
  return (
    <>
      {text.split(pattern).map((part, index) =>
        tokens.some((token) => token.toLowerCase() === part.toLowerCase()) ? (
          <mark key={`${part}-${index}`} className="rounded-sm bg-primary/20 font-bold text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

export function SearchBox<T>({
  value,
  onChange,
  suggestions = [],
  onSelect,
  scope,
  placeholder = "Search…",
  ariaLabel,
  className,
  inputClassName,
  autoCompleteLimit = 8,
  onSubmitQuery,
}: SearchBoxProps<T>) {
  const { enabled: autocompleteEnabled } = useSearchAutocomplete()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recent, setRecent] = useState<string[]>([])
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRecent(readRecent(scope))
  }, [scope])

  const visibleSuggestions = useMemo(
    () => suggestions.slice(0, autoCompleteLimit),
    [autoCompleteLimit, suggestions],
  )
  const showRecent = autocompleteEnabled && open && !value.trim() && recent.length > 0
  const showSuggestions =
    autocompleteEnabled && open && value.trim().length > 0 && visibleSuggestions.length > 0
  const optionCount = showRecent ? recent.length : showSuggestions ? visibleSuggestions.length : 0

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, optionCount - 1))
  }, [optionCount])

  const submitQuery = (query: string) => {
    const normalized = query.trim()
    if (!normalized) return
    setRecent(writeRecent(scope, normalized))
    onSubmitQuery?.(normalized)
  }

  const selectSuggestion = (suggestion: SearchSuggestion<T>) => {
    submitQuery(suggestion.label)
    onSelect?.(suggestion)
    setOpen(false)
    setActiveIndex(-1)
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative min-w-0", className)}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!autocompleteEnabled || optionCount === 0) {
            if (event.key === "Enter") submitQuery(value)
            return
          }
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setActiveIndex((index) => (index + 1) % optionCount)
          } else if (event.key === "ArrowUp") {
            event.preventDefault()
            setActiveIndex((index) => (index <= 0 ? optionCount - 1 : index - 1))
          } else if (event.key === "Escape") {
            setOpen(false)
          } else if (event.key === "Enter") {
            if (activeIndex >= 0) {
              event.preventDefault()
              if (showRecent) {
                const query = recent[activeIndex]
                onChange(query)
                submitQuery(query)
                setOpen(false)
              } else {
                const suggestion = visibleSuggestions[activeIndex]
                if (suggestion) selectSuggestion(suggestion)
              }
            } else {
              submitQuery(value)
            }
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete={autocompleteEnabled ? "list" : "none"}
        aria-expanded={autocompleteEnabled && (showRecent || showSuggestions)}
        aria-controls={autocompleteEnabled && (showRecent || showSuggestions) ? listId : undefined}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        className={cn(
          "w-full rounded-lg border-2 border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none",
          inputClassName,
        )}
      />
      {showRecent || showSuggestions ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground"
        >
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {showRecent ? "Recent searches" : "Suggestions"}
          </p>
          {showRecent
            ? recent.map((query, index) => (
                <button
                  key={query}
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(query)
                    submitQuery(query)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm",
                    activeIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent",
                  )}
                >
                  <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{query}</span>
                </button>
              ))
            : visibleSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left",
                    activeIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      <SearchMatchText text={suggestion.label} query={value} />
                    </span>
                    {suggestion.detail ? (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {suggestion.detail}
                      </span>
                    ) : null}
                  </span>
                  {suggestion.matchKind === "fuzzy" ? (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                      Close match
                    </span>
                  ) : null}
                </button>
              ))}
        </div>
      ) : null}
    </div>
  )
}


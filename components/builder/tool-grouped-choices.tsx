"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { PickerGridPagination } from "@/components/builder/picker-grid-pagination"
import { useIsPhonePickerScreen, useIsSmPickerScreen } from "@/hooks/use-picker-page-size"
import { paginateList } from "@/lib/builder/picker-pagination"
import { groupToolOptionsForPicker } from "@/lib/compendium/tool-options"
import type { ToolChoicePool } from "@/lib/compendium/tool-options"
import { cn } from "@/lib/utils"

/** Phone tool grids — 6 options per page. */
const PHONE_TOOL_PAGE_SIZE = 6

type ToolGroupedChoicesProps = {
  options: { name: string; description?: string }[]
  toolChoicePool?: ToolChoicePool | null
  maxCount: number
  selected: string[]
  onChange: (selected: string[]) => void
  accentClass?: string
  unavailableOptions?: string[]
  compact?: boolean
}

export function ToolGroupedChoices({
  options,
  toolChoicePool,
  maxCount,
  selected,
  onChange,
  accentClass = "border-primary bg-primary/10",
  unavailableOptions = [],
  compact = false,
}: ToolGroupedChoicesProps) {
  const isSmUp = useIsSmPickerScreen()
  const isPhone = useIsPhonePickerScreen()
  const unavailable = new Set(unavailableOptions)
  const groups = useMemo(
    () => groupToolOptionsForPicker(options.map((option) => option.name), toolChoicePool),
    [options, toolChoicePool],
  )

  const [userExpanded, setUserExpanded] = useState<Record<string, boolean>>({})
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})

  useEffect(() => {
    setGroupPages({})
  }, [options, toolChoicePool, isPhone])

  const isExpanded = (key: string, hasSelection: boolean) => {
    if (userExpanded[key] !== undefined) return userExpanded[key]
    return isSmUp || hasSelection
  }

  const toggleGroup = (key: string, hasSelection: boolean) => {
    setUserExpanded((prev) => ({
      ...prev,
      [key]: !isExpanded(key, hasSelection),
    }))
  }

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((entry) => entry !== name))
      return
    }
    if (unavailable.has(name) || selected.length >= maxCount) return
    onChange([...selected, name])
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const hasSelection = group.names.some((name) => selected.includes(name))
        const open = isExpanded(group.key, hasSelection)
        const pageSize = isPhone ? PHONE_TOOL_PAGE_SIZE : group.names.length
        const { pageItems, pageCount, safePage } = paginateList(
          group.names,
          groupPages[group.key] ?? 0,
          Math.max(1, pageSize),
        )
        const visibleNames = isPhone ? pageItems : group.names

        return (
          <div key={group.key} className="rounded-lg border border-border/80 bg-card/40">
            <button
              type="button"
              onClick={() => toggleGroup(group.key, hasSelection)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
              aria-expanded={open}
            >
              <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                {group.label}
              </span>
              <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {group.names.filter((name) => selected.includes(name)).length > 0 && (
                  <span>
                    {group.names.filter((name) => selected.includes(name)).length} selected
                  </span>
                )}
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
                  aria-hidden
                />
              </span>
            </button>
            {open && (
              <div className="border-t border-border/60 px-2 pb-2 pt-1">
                <div
                  className={cn(
                    compact
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
                      : "grid grid-cols-1 sm:grid-cols-2 gap-2",
                  )}
                >
                  {visibleNames.map((name) => {
                    const isSelected = selected.includes(name)
                    const isTakenElsewhere = !isSelected && unavailable.has(name)
                    const isDisabled =
                      isTakenElsewhere || (!isSelected && selected.length >= maxCount)
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggle(name)}
                        className={cn(
                          "rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold transition-all",
                          isSelected
                            ? accentClass
                            : isDisabled
                              ? "cursor-not-allowed border-border bg-card opacity-50"
                              : "border-border bg-card hover:border-primary/40",
                          compact ? "py-1.5 text-xs" : undefined,
                        )}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
                {isPhone ? (
                  <PickerGridPagination
                    page={safePage}
                    pageCount={pageCount}
                    onPrevious={() =>
                      setGroupPages((prev) => ({
                        ...prev,
                        [group.key]: Math.max(0, safePage - 1),
                      }))
                    }
                    onNext={() =>
                      setGroupPages((prev) => ({
                        ...prev,
                        [group.key]: Math.min(pageCount - 1, safePage + 1),
                      }))
                    }
                    previousLabel={`Previous ${group.label} page`}
                    nextLabel={`Next ${group.label} page`}
                    className="mt-2"
                  />
                ) : null}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useIsSmPickerScreen } from "@/hooks/use-picker-page-size"
import { groupToolOptionsForPicker } from "@/lib/compendium/tool-options"
import type { ToolChoicePool } from "@/lib/compendium/tool-options"
import { cn } from "@/lib/utils"

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
  const unavailable = new Set(unavailableOptions)
  const groups = useMemo(
    () => groupToolOptionsForPicker(options.map((option) => option.name), toolChoicePool),
    [options, toolChoicePool],
  )

  const [userExpanded, setUserExpanded] = useState<Record<string, boolean>>({})

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
              <div
                className={cn(
                  "border-t border-border/60 px-2 pb-2 pt-1",
                  compact
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5"
                    : "grid grid-cols-1 sm:grid-cols-2 gap-2",
                )}
              >
                {group.names.map((name) => {
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
            )}
          </div>
        )
      })}
    </div>
  )
}

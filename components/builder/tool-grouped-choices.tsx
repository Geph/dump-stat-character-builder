"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Info, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { PickerGridPagination } from "@/components/builder/picker-grid-pagination"
import { RichTextContent } from "@/components/compendium/rich-text-editor"
import { useIsPhonePickerScreen, useIsSmPickerScreen } from "@/hooks/use-picker-page-size"
import { paginateList } from "@/lib/builder/picker-pagination"
import { getToolDescription, groupToolOptionsForPicker } from "@/lib/compendium/tool-options"
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
  /** Visual builder: show info icons for tool blurbs. */
  layout?: "default" | "compact" | "visual"
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
  layout = "default",
}: ToolGroupedChoicesProps) {
  const isSmUp = useIsSmPickerScreen()
  const isPhone = useIsPhonePickerScreen()
  const visual = layout === "visual"
  const unavailable = new Set(unavailableOptions)
  const groups = useMemo(
    () => groupToolOptionsForPicker(options.map((option) => option.name), toolChoicePool),
    [options, toolChoicePool],
  )
  const descriptionByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of options) {
      const explicit = option.description?.trim()
      if (explicit) {
        map.set(option.name, explicit)
        continue
      }
      const fallback = getToolDescription(option.name)
      if (fallback) map.set(option.name, fallback)
    }
    return map
  }, [options])

  const [userExpanded, setUserExpanded] = useState<Record<string, boolean>>({})
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})
  const [infoName, setInfoName] = useState<string | null>(null)

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

  const infoDescription = infoName ? descriptionByName.get(infoName) ?? null : null

  return (
    <>
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
                      const description = descriptionByName.get(name)
                      const canShowInfo = visual && Boolean(description)
                      return (
                        <div
                          key={name}
                          className={canShowInfo ? "flex items-stretch gap-1" : undefined}
                        >
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => toggle(name)}
                            className={cn(
                              "rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold transition-all",
                              canShowInfo ? "flex-1" : "w-full",
                              isSelected
                                ? accentClass
                                : isDisabled
                                  ? "cursor-not-allowed border-border bg-card opacity-50"
                                  : "border-border bg-card hover:border-primary/40",
                              compact ? "py-1.5 text-xs" : visual ? "py-2.5" : undefined,
                            )}
                          >
                            {name}
                          </button>
                          {canShowInfo ? (
                            <button
                              type="button"
                              aria-label={`About ${name}`}
                              onClick={() => setInfoName(name)}
                              className="shrink-0 self-center rounded-lg border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
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

      <AnimatePresence>
        {infoName && infoDescription ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setInfoName(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="relative max-h-[80vh] max-w-lg w-full overflow-y-auto rounded-xl border-2 border-primary/50 bg-card p-5 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setInfoName(null)}
                className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Tool</p>
              <h4 className="pr-8 font-serif text-xl font-black text-foreground">{infoName}</h4>
              <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
                <RichTextContent html={infoDescription} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

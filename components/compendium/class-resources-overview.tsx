"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Copy, Edit, Gauge } from "lucide-react"
import {
  classResourceGroupClassPreview,
  formatUsesSummary,
  variantGroupsWithinResource,
  type ClassResourceGroup,
} from "@/lib/compendium/class-resource-rows"
import { compendiumEditHref } from "@/lib/compendium/edit-href"
import { pageOverlayPanelClass } from "@/lib/compendium/editor-field-styles"
import { isCompendiumItemEnabled } from "@/lib/compendium/compendium-enabled"
import {
  compendiumAccentColorStyles,
  getCompendiumItemAccentColor,
} from "@/lib/compendium/theme-colors"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { ClassResourceRow } from "@/lib/types"

type ClassResourcesOverviewProps = {
  groups: ClassResourceGroup[]
  classNamesById: Record<string, string>
  onSelect: (row: ClassResourceRow) => void
  onToggleEnabled: (row: ClassResourceRow, enabled: boolean) => void
  onCopy?: (row: ClassResourceRow) => void
  copyingId?: string | null
}

export function ClassResourcesOverview({
  groups,
  classNamesById,
  onSelect,
  onToggleEnabled,
  onCopy,
  copyingId = null,
}: ClassResourcesOverviewProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const expandedGroup = useMemo(
    () => groups.find((group) => group.resourceKey === expandedKey) ?? null,
    [groups, expandedKey],
  )

  const toggleGroup = (resourceKey: string) => {
    setExpandedKey((current) => (current === resourceKey ? null : resourceKey))
  }

  if (groups.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {groups.length} resource {groups.length === 1 ? "type" : "types"} — click a tile to expand class variants
        </p>
        {expandedKey && (
          <button
            type="button"
            onClick={() => setExpandedKey(null)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Collapse all
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {groups.map((group) => {
          const isExpanded = expandedKey === group.resourceKey
          const isShared = group.items.length > 1
          const variants = variantGroupsWithinResource(group, classNamesById)
          const single = group.items.length === 1 ? group.items[0]! : null
          const singleClassName = single ? (classNamesById[single.class_id] ?? "Unknown class") : null

          return (
            <button
              key={group.resourceKey}
              type="button"
              onClick={() => toggleGroup(group.resourceKey)}
              className={cn(
                "group text-left rounded-xl border-2 p-3 transition-colors min-h-[7.5rem] flex flex-col",
                isShared && group.items.length >= 3 && "sm:col-span-2",
                isExpanded
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40 hover:bg-card/80",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Gauge className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="font-bold text-sm text-foreground leading-tight line-clamp-2">
                    {group.label}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180 text-primary",
                  )}
                />
              </div>

              {single ? (
                <>
                  <p className="text-xs font-semibold text-primary truncate">{singleClassName}</p>
                  <p className="text-[11px] text-muted-foreground mt-auto line-clamp-2 leading-snug">
                    {formatUsesSummary(single.uses)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                    {classResourceGroupClassPreview(group, classNamesById)}
                  </p>
                  <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {group.items.length} classes
                    </span>
                    {variants.length > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground">
                        {variants.length} variants
                      </span>
                    )}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {expandedGroup && (
          <motion.div
            key={expandedGroup.resourceKey}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className={cn(pageOverlayPanelClass, "p-4 space-y-4")}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-foreground">{expandedGroup.label}</h2>
              <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-mono">
                {expandedGroup.resourceKey}
              </span>
            </div>

            {(() => {
              const variants = variantGroupsWithinResource(expandedGroup, classNamesById)
              return variants.map((variant, index) => (
                <div key={`${expandedGroup.resourceKey}-${index}`} className="space-y-2">
                  {expandedGroup.items.length > 1 && variants.length > 1 && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {variant.usesLabel}
                    </p>
                  )}
                  <div className="divide-y divide-border rounded-xl border border-border bg-background overflow-hidden">
                    {variant.items.map((row) => (
                      <ResourceVariantRow
                        key={row.id}
                        row={row}
                        className={classNamesById[row.class_id] ?? "Unknown class"}
                        onSelect={() => onSelect(row)}
                        onToggleEnabled={(enabled) => onToggleEnabled(row, enabled)}
                        onCopy={onCopy ? () => onCopy(row) : undefined}
                        copying={copyingId === row.id}
                      />
                    ))}
                  </div>
                </div>
              ))
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ResourceVariantRow({
  row,
  className,
  onSelect,
  onToggleEnabled,
  onCopy,
  copying = false,
}: {
  row: ClassResourceRow
  className: string
  onSelect: () => void
  onToggleEnabled: (enabled: boolean) => void
  onCopy?: () => void
  copying?: boolean
}) {
  const enabled = isCompendiumItemEnabled(row)
  const accentStyles = compendiumAccentColorStyles(
    getCompendiumItemAccentColor(row as unknown as Record<string, unknown>),
  )

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 transition-colors",
        !enabled && "opacity-50 grayscale saturate-0",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn("flex-1 min-w-0 text-left", accentStyles.titleHover)}
      >
        <p className="font-semibold text-sm text-foreground truncate">{className}</p>
        <p className="text-xs text-muted-foreground truncate">{formatUsesSummary(row.uses)}</p>
      </button>
      {onCopy && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCopy()
          }}
          disabled={copying}
          className={cn(
            "flex items-center justify-center w-8 h-8 shrink-0 rounded-full border border-border text-muted-foreground transition-colors disabled:opacity-50",
            accentStyles.editHover,
          )}
          title="Make a copy"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
      <Link
        href={compendiumEditHref("class_resources", row.id)}
        className={cn(
          "flex items-center justify-center w-8 h-8 shrink-0 rounded-full border border-border text-muted-foreground transition-colors",
          accentStyles.editHover,
        )}
        title="Edit"
        onClick={(e) => e.stopPropagation()}
      >
        <Edit className="h-3.5 w-3.5" />
      </Link>
      <Switch
        checked={enabled}
        onCheckedChange={onToggleEnabled}
        aria-label={`${enabled ? "Disable" : "Enable"} ${className} ${row.name}`}
      />
    </div>
  )
}

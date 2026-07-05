"use client"

import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"
import {
  deriveClassResourceDisplay,
  resolveStaticResourceLabel,
  shouldShowClassResourceOnSheet,
} from "@/lib/compendium/class-resource-display"
import type { ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import type { ClassResource } from "@/lib/types"

export type StaticResourceEntry = {
  id: string
  name: string
  resource: ClassResource
  classLevel: number
}

type ClassResourceStaticDisplayProps = {
  entries: StaticResourceEntry[]
  resolveContext: ResolveUsesContext
}

export function ClassResourceStaticDisplay({
  entries,
  resolveContext,
}: ClassResourceStaticDisplayProps) {
  const visible = entries
    .map((entry) => {
      const value = resolveStaticResourceLabel(entry.resource, entry.classLevel, resolveContext)
      if (!value) return null
      return { ...entry, value }
    })
    .filter(Boolean) as (StaticResourceEntry & { value: string })[]

  if (!visible.length) return null

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-muted-foreground uppercase">Class Caps</h3>
      <div className="flex flex-wrap gap-2">
        {visible.map((entry) => (
          <div
            key={entry.id}
            className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/25 px-2.5 py-1.5"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {entry.name}
            </span>
            <span className="text-sm font-black tabular-nums text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function partitionResourceTrackerEntries(
  entries: ResourceTrackerEntry[],
  resourcesById: Map<string, ClassResource>,
  spendKeys: ReadonlySet<string>,
): {
  spendable: ResourceTrackerEntry[]
  static: StaticResourceEntry[]
} {
  const spendable: ResourceTrackerEntry[] = []
  const staticEntries: StaticResourceEntry[] = []

  for (const entry of entries) {
    const classIdPrefix = entry.id.indexOf("_")
    const resourceKey =
      classIdPrefix >= 0 ? entry.id.slice(classIdPrefix + 1) : entry.id
    const resource = resourcesById.get(resourceKey)
    if (!resource) {
      spendable.push(entry)
      continue
    }
    if (!shouldShowClassResourceOnSheet(resourceKey, spendKeys)) continue
    const mode = deriveClassResourceDisplay(resource, spendKeys)
    if (mode === "tracker") {
      spendable.push(entry)
    } else if (mode === "static") {
      staticEntries.push({
        id: entry.id,
        name: entry.name,
        resource,
        classLevel: entry.classLevel,
      })
    }
  }

  return { spendable, static: staticEntries }
}

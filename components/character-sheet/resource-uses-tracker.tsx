"use client"

import { RotateCcw } from "lucide-react"
import { resolveUsesAtLevel, type ResolveUsesContext } from "@/lib/compendium/resolve-uses-config"
import type { UsesConfig } from "@/lib/types"

export type ResourceTrackerEntry = {
  id: string
  name: string
  uses: UsesConfig
  classLevel: number
}

type ResourceUsesTrackerProps = {
  entries: ResourceTrackerEntry[]
  usedById: Record<string, number>
  onUsedChange: (next: Record<string, number>) => void
  resolveContext: ResolveUsesContext
}

function resolveMax(entry: ResourceTrackerEntry, ctx: ResolveUsesContext): number | null {
  if (entry.uses.type === "special") return null
  return resolveUsesAtLevel(entry.uses, entry.classLevel, ctx)
}

export function ResourceUsesTracker({
  entries,
  usedById,
  onUsedChange,
  resolveContext,
}: ResourceUsesTrackerProps) {
  const trackable = entries
    .map((entry) => {
      const max = resolveMax(entry, resolveContext)
      if (max == null || max <= 0) return null
      return { entry, max }
    })
    .filter(Boolean) as { entry: ResourceTrackerEntry; max: number }[]

  if (!trackable.length) return null

  const resetAll = () => {
    const next = { ...usedById }
    for (const { entry } of trackable) next[entry.id] = 0
    onUsedChange(next)
  }

  const toggleUse = (id: string, max: number, slotIndex: number) => {
    const used = usedById[id] ?? 0
    const isUsed = slotIndex < used
    const nextUsed = isUsed ? Math.max(0, used - 1) : used < max ? used + 1 : used
    onUsedChange({ ...usedById, [id]: nextUsed })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase">Class Resources</h3>
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
          title="Restore all resources"
        >
          <RotateCcw className="w-3 h-3" />
          Rest
        </button>
      </div>
      {trackable.map(({ entry, max }) => {
        const used = usedById[entry.id] ?? 0
        return (
          <div key={entry.id} className="rounded-lg border border-border/70 bg-muted/25 p-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-xs font-bold text-foreground">{entry.name}</p>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {max - used} / {max}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: max }, (_, index) => {
                const isUsed = index < used
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleUse(entry.id, max, index)}
                    className={`h-5 w-5 rounded-full border transition-colors ${
                      isUsed
                        ? "border-primary/40 bg-muted text-transparent"
                        : "border-primary bg-primary/20 hover:bg-primary/30"
                    }`}
                    title={isUsed ? "Mark available" : "Mark spent"}
                    aria-label={`${entry.name} use ${index + 1}${isUsed ? " spent" : " available"}`}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
